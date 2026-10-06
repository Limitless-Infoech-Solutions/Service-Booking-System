import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId = searchParams.get("business_id");
    const date = searchParams.get("date");

    if (!businessId || !date) {
      return NextResponse.json(
        {
          error: "business_id and date are required",
        },
        { status: 400 }
      );
    }

    const startOfDay = `${date}T00:00:00+00:00`;
    const startOfNextDay = `${date}T00:00:00+00:00`;

    const nextDate = new Date(`${date}T00:00:00Z`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);

    const endOfDay = nextDate.toISOString();

    const { data, error } = await supabase
      .from("appointments")
      .select(`
        id,
        customer_id,
        start_time,
        end_time,
        status,
        total_amount,
      
        customers!appointments_customer_id_fkey (
          id,
          name,
          phone
        )
      `)
      
      
      .eq("business_id", businessId)
      .gte("start_time", startOfDay)
      .lt("start_time", endOfDay)
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Appointments API error:", error);

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      appointments: data,
      total: data.length,
    });
  } catch (error) {
    console.error("Unexpected error:", error);

    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}