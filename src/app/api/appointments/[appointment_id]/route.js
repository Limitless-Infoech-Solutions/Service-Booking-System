import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request, { params }) {
  try {
   
    const { appointment_id } = await params;

    const { data: appointment, error } = await supabase
      .from("appointments")
      .select(`
        id,
        business_id,
        customer_id,
        start_time,
        end_time,
        status,
        total_amount,
        created_at,
        appointment_services (
          id,
          service_id,
          price,
          duration_minutes,
          buffer_minutes,
          start_time,
          end_time,
          staff_id,
          services (
            id,
            name,
            image
          )
        ),
       customers!appointments_customer_id_fkey (
  id,
  name,
  phone,
  email
)
      `)
      .eq("id", appointment_id)
      .single();

      if (error) {
        console.error("Fetch appointment error:", error);
      
        return NextResponse.json(
          {
            success: false,
            error: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          },
          { status: 500 }
        );
      }

    return NextResponse.json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error("Appointment API error:", error);

    return NextResponse.json(
      { error: "Failed to fetch appointment" },
      { status: 500 }
    );
  }
}