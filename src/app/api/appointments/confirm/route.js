import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

async function findConfirmedBookAgainAppointment(client, hold, sourceAppointment) {
  if (!hold?.appointment_id || hold.appointment_id === sourceAppointment.id) return null;
  const { data: appointment, error: appointmentError } = await client
    .from("appointments")
    .select("id")
    .eq("id", hold.appointment_id)
    .eq("business_id", sourceAppointment.business_id)
    .eq("customer_id", sourceAppointment.customer_id)
    .maybeSingle();
  if (appointmentError) throw appointmentError;
  if (!appointment) return null;

  const { data: rows, error: rowsError } = await client
    .from("appointment_services")
    .select("service_id, staff_id, start_time, end_time")
    .eq("appointment_id", appointment.id);
  if (rowsError) throw rowsError;
  const expected = hold.booking_hold_services || [];
  const savedByService = new Map((rows || []).map((item) => [item.service_id, item]));
  const matches = expected.length > 0 && expected.length === savedByService.size && expected.every((item) => {
    const saved = savedByService.get(item.service_id);
    return saved && saved.staff_id === item.staff_id &&
      new Date(saved.start_time).getTime() === new Date(item.start_time).getTime() &&
      new Date(saved.end_time).getTime() === new Date(item.end_time).getTime();
  });
  return matches ? appointment : null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { hold_id } = body;
    const rescheduleAppointmentId = body.reschedule_appointment_id || null;
    const bookAgainAppointmentId = body.book_again_appointment_id || null;
    const isAdminMode = body.admin_mode === true;
    if ((rescheduleAppointmentId || bookAgainAppointmentId) && !isAdminMode) {
      return NextResponse.json({ error: "Admin authorization is required." }, { status: 403 });
    }
    if (rescheduleAppointmentId && bookAgainAppointmentId) {
      return NextResponse.json({ error: "A hold cannot reschedule and book again at the same time." }, { status: 400 });
    }
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
        "id, business_id, customer_id, status, expires_at, appointment_id, source_appointment_id, reschedule_appointment_id, booking_hold_services(service_id, staff_id, start_time, end_time)"
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

    const expectedSourceAppointmentId = bookAgainAppointmentId || null;
    const expectedRescheduleAppointmentId = rescheduleAppointmentId || null;
    if (
      (hold.source_appointment_id || null) !== expectedSourceAppointmentId ||
      (hold.reschedule_appointment_id || null) !== expectedRescheduleAppointmentId
    ) {
      return adminContext
        ? adminJson(adminContext, { error: "The booking hold does not match the requested operation." }, { status: 409 })
        : NextResponse.json({ error: "The booking hold does not match the requested operation." }, { status: 409 });
    }

    if (bookAgainAppointmentId && request.cookies.get("book_again_flow_hold")?.value !== `${bookAgainAppointmentId}:${hold_id}`) {
      return adminJson(adminContext, { error: "This hold does not belong to this Book Again operation." }, { status: 409 });
    }

    let bookAgainSource = null;
    if (bookAgainAppointmentId) {
      const { data, error } = await bookingClient
        .from("appointments")
        .select("id, business_id, customer_id")
        .eq("id", bookAgainAppointmentId)
        .eq("business_id", adminContext.businessId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return adminJson(adminContext, { error: "Original appointment not found." }, { status: 404 });
      bookAgainSource = data;
      if (hold.business_id !== data.business_id || hold.customer_id !== data.customer_id || hold.reschedule_appointment_id) {
        return adminJson(adminContext, { error: "The booking hold does not match the original appointment's customer and business." }, { status: 409 });
      }
      // A retry after a lost response returns the appointment already created
      // from this converted hold instead of attempting a second booking.
      if (hold.status === "converted" && hold.appointment_id) {
        if (hold.appointment_id === data.id) {
          return adminJson(adminContext, { error: "This hold points to the original appointment, not a new booking." }, { status: 409 });
        }
        const created = await findConfirmedBookAgainAppointment(bookingClient, hold, data);
        if (created) {
          const response = adminJson(adminContext, { success: true, appointment_id: created.id }, { status: 200 });
          response.cookies.set("booking_flow_hold", "", { path: "/", maxAge: 0 });
          response.cookies.set("book_again_flow_hold", "", { path: "/", maxAge: 0 });
          return response;
        }
      }
    }

    if (!rescheduleAppointmentId && hold.reschedule_appointment_id) {
      return NextResponse.json(
        { error: "This hold belongs to a rescheduling operation.", code: "RESCHEDULE_HOLD_REQUIRED" },
        { status: 409 }
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

    if (bookAgainSource && hold.status !== "active") {
      return adminJson(adminContext, { error: "The Book Again hold is no longer active or has expired.", code: "HOLD_EXPIRED" }, { status: 409 });
    }

    if (rescheduleAppointmentId) {
      if (hold.reschedule_appointment_id !== rescheduleAppointmentId) {
        return adminJson(adminContext,
          { error: "Booking hold does not belong to this rescheduling operation." },
          { status: 409 }
        );
      }
      const { data: targetAppointment, error: targetError } = await bookingClient
        .from("appointments")
        .select("id, status, customer_id")
        .eq("id", rescheduleAppointmentId)
        .eq("business_id", adminContext.businessId)
        .maybeSingle();
      if (targetError) throw targetError;
      if (!targetAppointment) return adminJson(adminContext, { error: "Appointment not found." }, { status: 404 });
      if (targetAppointment.status !== "confirmed") {
        return adminJson(adminContext, { error: "Only confirmed appointments can be rescheduled." }, { status: 409 });
      }
      if (targetAppointment.customer_id !== hold.customer_id) {
        return adminJson(adminContext, { error: "Hold customer does not match the appointment." }, { status: 409 });
      }

      const { data: rescheduledId, error: rescheduleError } = await bookingClient.rpc(
        "confirm_reschedule_booking_hold_with_event",
        { p_appointment_id: rescheduleAppointmentId, p_hold_id: hold_id }
      );
      if (rescheduleError) {
        const code = rescheduleError.code;
        const status = code === "42501" ? 403 : ["23P01", "22023", "23503", "23514"].includes(code) ? 409 : 500;
        console.error("Reschedule confirmation failed:", { code: code || null });
        return adminJson(adminContext, {
          error: status === 409
            ? "The reschedule is no longer valid. Refresh availability and review the appointment again."
            : status === 403
              ? "You do not have access to this appointment or hold."
              : "Unable to confirm the reschedule.",
          code: code === "22023" ? "HOLD_EXPIRED_OR_INVALID" : code === "23P01" ? "SLOT_UNAVAILABLE" : undefined,
        }, { status });
      }

      const response = adminJson(adminContext,
        { success: true, appointment_id: rescheduledId },
        { status: 200 }
      );
      response.cookies.set("booking_flow_hold", "", { path: "/", maxAge: 0 });
      return response;
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
      holdItems.length > 5 ||
      new Set(holdItems.map((item) => item.service_id)).size !== holdItems.length ||
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

    const confirmRpc = bookAgainSource
      ? "confirm_book_again_booking_hold"
      : "confirm_booking_hold";
    const { data: appointmentId, error } = await bookingClient.rpc(
      confirmRpc,
      {
        p_hold_id: hold_id,
      }
    );

    if (error) {
      console.error("Confirm appointment error:", error);

      if (bookAgainSource) {
        const { data: latestHold } = await bookingClient
          .from("booking_holds")
          .select("status, appointment_id")
          .eq("id", hold_id)
          .eq("business_id", bookAgainSource.business_id)
          .maybeSingle();
        if (latestHold?.status === "converted" && latestHold.appointment_id && latestHold.appointment_id !== bookAgainSource.id) {
          const created = await findConfirmedBookAgainAppointment(bookingClient, { ...latestHold, booking_hold_services: hold.booking_hold_services }, bookAgainSource);
          if (created) {
            const response = adminJson(adminContext, { success: true, appointment_id: created.id }, { status: 200 });
            response.cookies.set("booking_flow_hold", "", { path: "/", maxAge: 0 });
            response.cookies.set("book_again_flow_hold", "", { path: "/", maxAge: 0 });
            return response;
          }
        }
      }

      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    if (bookAgainSource) {
      if (!appointmentId || appointmentId === bookAgainSource.id) {
        return adminJson(adminContext, { error: "Book Again did not create a separate appointment." }, { status: 500 });
      }
      const { data: createdAppointment, error: createdError } = await bookingClient
        .from("appointments")
        .select("id")
        .eq("id", appointmentId)
        .eq("business_id", bookAgainSource.business_id)
        .eq("customer_id", bookAgainSource.customer_id)
        .maybeSingle();
      if (createdError) throw createdError;
      if (!createdAppointment) {
        return adminJson(adminContext, { error: "The new appointment does not match the original customer and business." }, { status: 500 });
      }
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
    if (bookAgainSource) response.cookies.set("book_again_flow_hold", "", { path: "/", maxAge: 0 });
    return response;
  } catch (error) {
    console.error("Confirm appointment API error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
