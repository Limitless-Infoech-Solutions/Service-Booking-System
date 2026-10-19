import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const { hold_id } = body;
    const isAdminMode = body.admin_mode === true;
    let bookingClient = supabase;
    let adminContext = null;
    if (isAdminMode) {
      adminContext = await authorizeBusinessAdmin(request);
      if (adminContext.error) return adminJson(adminContext, { error: adminContext.error }, { status: adminContext.status });
      bookingClient = adminContext.supabase;
    }

    if (!hold_id) {
      return NextResponse.json(
        { error: "hold_id is required" },
        { status: 400 }
      );
    }

    const expectedFlowCookie = `${isAdminMode ? "admin" : "customer"}:${hold_id}`;
    if (request.cookies.get("booking_flow_hold")?.value !== expectedFlowCookie) {
      return NextResponse.json(
        { error: "Booking hold does not belong to this browser flow." },
        { status: 404 }
      );
    }

    // Holds may outlive an admin change to a service, staff member, or
    // assignment. Revalidate the held items immediately before confirmation.
    const holdQuery = bookingClient
      .from("booking_holds")
      .select(
        "id, business_id, customer_id, status, expires_at, booking_hold_services(service_id, staff_id, start_time, end_time)"
      )
      .eq("id", hold_id);
    const { data: hold, error: holdError } = await (isAdminMode
      ? holdQuery.eq("business_id", adminContext.businessId)
      : holdQuery).maybeSingle();

    if (holdError) throw holdError;

    if (!hold) {
      return NextResponse.json(
        { error: "Booking hold not found." },
        { status: 404 }
      );
    }

    if (
      hold.status !== "active" ||
      !hold.expires_at ||
      new Date(hold.expires_at) <= new Date()
    ) {
      return NextResponse.json(
        { error: "Booking hold is no longer active or has expired.", code: "HOLD_EXPIRED" },
        { status: 409 }
      );
    }

    if (!hold.customer_id) {
      return NextResponse.json(
        { error: "A customer must be attached to the booking hold before confirmation.", code: "HOLD_CUSTOMER_MISSING" },
        { status: 409 }
      );
    }

    const { data: attachedCustomer, error: customerError } = await bookingClient
      .from("customers")
      .select("id")
      .eq("id", hold.customer_id)
      .eq("business_id", hold.business_id)
      .maybeSingle();
    if (customerError) throw customerError;
    if (!attachedCustomer) {
      return NextResponse.json(
        { error: "The attached customer does not belong to this business." },
        { status: 409 }
      );
    }

    const holdItems = hold.booking_hold_services || [];
    if (
      !holdItems.length ||
      holdItems.some((item) => !item.service_id || !item.staff_id)
    ) {
      return NextResponse.json(
        { error: "Booking hold has no valid service and staff assignments." },
        { status: 409 }
      );
    }

    const serviceIds = [
      ...new Set(holdItems.map((item) => item.service_id)),
    ];
    const staffIds = [...new Set(holdItems.map((item) => item.staff_id))];

    const { data: eligibleServices, error: servicesError } = await bookingClient
      .from("services")
      .select("id")
      .eq("business_id", hold.business_id)
      .eq("is_active", true)
      .eq("status", "completed")
      .in("id", serviceIds);

    if (servicesError) throw servicesError;

    if ((eligibleServices || []).length !== serviceIds.length) {
      return NextResponse.json(
        { error: "A service in this booking is no longer bookable." },
        { status: 409 }
      );
    }

    const { data: eligibleAssignments, error: assignmentsError } =
      await bookingClient
        .from("staff_services")
        .select(
          "service_id, staff_id, staff!staff_services_staff_business_fkey!inner(id, business_id, is_active, status)"
        )
        .eq("business_id", hold.business_id)
        .eq("staff.business_id", hold.business_id)
        .eq("staff.is_active", true)
        .eq("staff.status", "completed")
        .in("service_id", serviceIds)
        .in("staff_id", staffIds);

    if (assignmentsError) throw assignmentsError;

    const eligiblePairs = new Set(
      (eligibleAssignments || []).map(
        (assignment) => `${assignment.service_id}:${assignment.staff_id}`
      )
    );

    if (
      holdItems.some(
        (item) => !eligiblePairs.has(`${item.service_id}:${item.staff_id}`)
      )
    ) {
      return NextResponse.json(
        {
          error: "A staff assignment in this booking is no longer eligible.",
        },
        { status: 409 }
      );
    }

    const { data: appointmentId, error } = await bookingClient.rpc(
      "confirm_booking_hold",
      {
        p_hold_id: hold_id,
      }
    );

    if (error) {
      console.error("Confirm appointment error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (isAdminMode) {
      const { data: savedAppointmentItems, error: savedAppointmentError } = await bookingClient
        .from("appointment_services")
        .select("service_id, staff_id, start_time, end_time, appointments!inner(business_id)")
        .eq("appointment_id", appointmentId)
        .eq("appointments.business_id", adminContext.businessId);
      if (savedAppointmentError) throw savedAppointmentError;
      const savedByService = new Map((savedAppointmentItems || []).map((item) => [item.service_id, item]));
      const exactAssignmentsPersisted = holdItems.length === savedByService.size && holdItems.every((item) => {
        const saved = savedByService.get(item.service_id);
        return saved && saved.staff_id === item.staff_id &&
          new Date(saved.start_time).getTime() === new Date(item.start_time).getTime() &&
          new Date(saved.end_time).getTime() === new Date(item.end_time).getTime();
      });
      if (!exactAssignmentsPersisted) {
        const responseBody = {
          error: "The appointment was created, but the database did not preserve the exact staff assignment and service schedule from the hold.",
          code: "CONFIRMED_ASSIGNMENT_MISMATCH",
          appointment_id: appointmentId,
        };
        return adminJson(adminContext, responseBody, { status: 500 });
      }
    }

    const response = adminContext ? adminJson(adminContext,
      {
        success: true,
        appointment_id: appointmentId,
      },
      { status: 200 }
    ) : NextResponse.json({ success: true, appointment_id: appointmentId }, { status: 200 });
    response.cookies.set("booking_flow_hold", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Confirm appointment API error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
