import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    const body = await request.json();
    const { hold_id } = body;

    if (!hold_id) {
      return NextResponse.json(
        { error: "hold_id is required" },
        { status: 400 }
      );
    }

    // Holds may outlive an admin change to a service, staff member, or
    // assignment. Revalidate the held items immediately before confirmation.
    const { data: hold, error: holdError } = await supabase
      .from("booking_holds")
      .select(
        "id, business_id, status, expires_at, booking_hold_services(service_id, staff_id)"
      )
      .eq("id", hold_id)
      .maybeSingle();

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
        { error: "Booking hold is no longer active." },
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

    const { data: eligibleServices, error: servicesError } = await supabase
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
      await supabase
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

    const { data: appointmentId, error } = await supabase.rpc(
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

    return NextResponse.json(
      {
        success: true,
        appointment_id: appointmentId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Confirm appointment API error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
