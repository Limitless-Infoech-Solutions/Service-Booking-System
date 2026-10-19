import { NextResponse } from "next/server";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedBusinessId = searchParams.get("business_id");
    const context = await authorizeBusinessAdmin(request, requestedBusinessId || undefined);
    if (context.error) {
      return adminJson(context, { error: context.error }, { status: context.status });
    }
    const businessId = context.businessId;
    let date = searchParams.get("date");

    // Business ID is required.
    // Default to today's date in India if no date is provided.
    if (!date) {
      const dateParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(new Date());

      const parts = Object.fromEntries(
        dateParts.map(({ type, value }) => [type, value])
      );

      date = `${parts.year}-${parts.month}-${parts.day}`;
    }

    // Validate the date format.
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;

    if (!datePattern.test(date)) {
      return NextResponse.json(
        {
          error: "Invalid date. Use YYYY-MM-DD format.",
        },
        { status: 400 }
      );
    }

    // Validate that the date actually exists.
    const validationDate = new Date(`${date}T00:00:00Z`);

    if (
      Number.isNaN(validationDate.getTime()) ||
      validationDate.toISOString().slice(0, 10) !== date
    ) {
      return NextResponse.json(
        {
          error: "Invalid calendar date.",
        },
        { status: 400 }
      );
    }

    // Calculate the selected day's boundaries in India time.
    const startOfDay = new Date(`${date}T00:00:00+05:30`);

    const startOfNextDay = new Date(
      startOfDay.getTime() + 24 * 60 * 60 * 1000
    );

    const { data, error } = await context.supabase
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
      .gte("start_time", startOfDay.toISOString())
      .lt("start_time", startOfNextDay.toISOString())
      .order("start_time", { ascending: true });

    if (error) {
      console.error("Appointments API error:", error);

      return NextResponse.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

      return adminJson(context, {
      date,
      appointments: data,
      total: data.length,
    });
  } catch (error) {
    console.error("Unexpected appointments API error:", error);

    return NextResponse.json(
      {
        error: "Something went wrong",
      },
      { status: 500 }
    );
  }
}
