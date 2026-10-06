import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request, { params }) {
  try {
    const { appointment_id } = await params;

    if (!appointment_id) {
      return NextResponse.json(
        { error: "Appointment ID is required" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        customer_id,
        start_time,
        end_time,
        status,
        total_amount,
        business_id,

        customers!appointments_customer_id_fkey (
          id,
          name,
          phone,
          email
        ),

        appointment_services (
          id,
          service_id,
          staff_id,
          price,
          duration_minutes,
          buffer_minutes,
          start_time,
          end_time,

          services (
            id,
            name,
            description
          ),

          staff (
            id,
            name,
            role
          )
        )
      `)
      .eq("id", appointment_id)
      .single();

    if (error) {
      console.error("Appointment details API error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: "Appointment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      appointment: data,
    });
  } catch (error) {
    console.error("Unexpected error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}