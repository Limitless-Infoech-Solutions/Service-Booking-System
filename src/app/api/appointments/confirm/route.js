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