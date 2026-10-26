import { NextResponse } from "next/server";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

const TIME_ZONE = "Asia/Kolkata";

function getDateInIST(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getISTDayBounds(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);

  const nextDate = new Date(
    Date.UTC(year, month - 1, day + 1)
  );

  const nextDateString = nextDate.toISOString().split("T")[0];

  return {
    start: `${dateString}T00:00:00+05:30`,
    end: `${nextDateString}T00:00:00+05:30`,
  };
}

export async function GET(request) {
  const { searchParams: adminSearchParams } = new URL(request.url);
  const context = await authorizeBusinessAdmin(request, adminSearchParams.get("business_id") || undefined);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  try {
    // 1. Get the selected date or calendar month from the URL.
    const requestedDate = adminSearchParams.get("date");
    const requestedMonth = adminSearchParams.get("month");

    const date = requestedDate || getDateInIST();

    // Validate YYYY-MM-DD format and calendar date.
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const parsedDate = new Date(`${date}T00:00:00Z`);

    if (
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== date
    ) {
      return NextResponse.json(
        { error: "Invalid calendar date." },
        { status: 400 }
      );
    }

    // A month request returns appointments for calendar markers; a date request
    // returns that day's schedule. Both use the same real appointment data.
    const month = requestedMonth || date.slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      return NextResponse.json(
        { error: "Invalid month. Use YYYY-MM." },
        { status: 400 }
      );
    }

    const parsedMonth = new Date(`${month}-01T00:00:00Z`);
    if (
      Number.isNaN(parsedMonth.getTime()) ||
      parsedMonth.toISOString().slice(0, 7) !== month
    ) {
      return NextResponse.json(
        { error: "Invalid calendar month." },
        { status: 400 }
      );
    }

    const monthEndDate = new Date(
      Date.UTC(parsedMonth.getUTCFullYear(), parsedMonth.getUTCMonth() + 1, 1)
    ).toISOString().slice(0, 10);
    const { start, end } = requestedMonth
      ? {
          start: `${month}-01T00:00:00+05:30`,
          end: `${monthEndDate}T00:00:00+05:30`,
        }
      : getISTDayBounds(date);

    // 3. Fetch appointments scheduled for that date.
    const { data: appointments, error } = await context.supabase
      .from("appointments")
      .select(`
        id,
        customer_id,
        status,
        start_time,
        end_time,
        total_amount,
        customers!appointments_customer_id_fkey (
          id,
          name,
          phone
        ),
        appointment_services (
          id,
          service_id,
          staff_id,
          services (
            id,
            name,
            duration_minutes
          ),
          staff (
            id,
            name
          )
        )
      `)
      .eq("business_id", context.businessId)
      .gte("start_time", start)
      .lt("start_time", end)
      .order("start_time", { ascending: true });

    if (error) {
      throw error;
    }

    // 4. Exclude cancelled and no-show appointments.
    const activeAppointments = (appointments || []).filter(
      (appointment) =>
        !["cancelled", "no_show"].includes(appointment.status)
    );

    // 5. Calculate daily metrics.
    const completedAppointments = activeAppointments.filter(
      (appointment) => appointment.status === "completed"
    );

    return adminJson(context, {
      date,
      month,
      timeZone: TIME_ZONE,

      metrics: {
        appointmentsCount: activeAppointments.length,
        completedAppointmentsCount: completedAppointments.length,
      },

      data: {
        appointments: activeAppointments,
      },
    });
  } catch (error) {
    console.error("Calendar API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load calendar appointments.",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
