import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";
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

  // IST is UTC+05:30.
  const start = new Date(
    Date.UTC(year, month - 1, day, -5, -30, 0, 0)
  );

  const nextDay = new Date(
    Date.UTC(year, month - 1, day + 1, -5, -30, 0, 0)
  );

  return {
    start: start.toISOString(),
    end: nextDay.toISOString(),
  };
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export async function GET(request) {
  try {
    

    const { searchParams } = new URL(request.url);

    const today = getDateInIST();

    // The selected date affects the schedule, not today's metrics.
    const selectedDate = searchParams.get("date") || today;

    if (!isValidDateString(selectedDate)) {
      return NextResponse.json(
        { error: "Invalid date. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const todayBounds = getISTDayBounds(today);
    const selectedBounds = getISTDayBounds(selectedDate);

    const upcomingEndDate = addDays(today, 7);
    const upcomingEndBounds = getISTDayBounds(upcomingEndDate);

    const now = new Date().toISOString();

    // 1. Fetch today's appointments.
    const { data: todayAppointments, error: todayError } =
      await supabase
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
        .eq("business_id", BUSINESS_ID)
        .gte("start_time", todayBounds.start)
        .lt("start_time", todayBounds.end)
        .order("start_time", { ascending: true });

    if (todayError) {
      throw todayError;
    }

    // 2. Fetch all customers belonging to this business.
    const { data: customers, error: customersError } =
      await supabase
        .from("customers")
        .select("id")
        .eq("business_id", BUSINESS_ID);

    if (customersError) {
      throw customersError;
    }

    // 3. Fetch appointments scheduled within the next seven days.
    const { data: upcomingAppointments, error: upcomingError } =
      await supabase
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
        .eq("business_id", BUSINESS_ID)
        .gt("start_time", now)
        .lt("start_time", upcomingEndBounds.end)
        .in("status", ["pending", "confirmed"])
        .order("start_time", { ascending: true });

    if (upcomingError) {
      throw upcomingError;
    }

    // 4. Fetch appointments for the selected schedule date.
    const { data: selectedAppointments, error: selectedError } =
      await supabase
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
        .eq("business_id", BUSINESS_ID)
        .gte("start_time", selectedBounds.start)
        .lt("start_time", selectedBounds.end)
        .order("start_time", { ascending: true });

    if (selectedError) {
      throw selectedError;
    }

    // 5. Fetch recent appointments.
    const { data: recentAppointments, error: recentError } =
      await supabase
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
        .eq("business_id", BUSINESS_ID)
        .order("created_at", { ascending: false })
        .limit(5);

    if (recentError) {
      throw recentError;
    }

    // 6. Fetch active staff.
    const { data: activeStaff, error: staffError } =
      await supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", BUSINESS_ID)
        .eq("is_active", true);

    if (staffError) {
      throw staffError;
    }

    // 7. Find staff members who have a service in progress right now.
    const { data: busyStaffRows, error: busyStaffError } =
      await supabase
        .from("appointment_services")
        .select(`
          staff_id,
          appointments!inner (
            business_id,
            status
          )
        `)
        .gte("start_time", "1900-01-01T00:00:00.000Z")
        .lte("start_time", now)
        .gt("end_time", now)
        .in("appointments.status", ["pending", "confirmed"])
        .eq("appointments.business_id", BUSINESS_ID);

    if (busyStaffError) {
      throw busyStaffError;
    }

    const busyStaffIds = new Set(
      (busyStaffRows || [])
        .map((row) => row.staff_id)
        .filter(Boolean)
    );

    const availableStaff = (activeStaff || []).filter(
      (staffMember) => !busyStaffIds.has(staffMember.id)
    );

    // 8. Calculate today's unique customers.
    const todayCustomerIds = new Set(
      (todayAppointments || [])
        .map((appointment) => appointment.customer_id)
        .filter(Boolean)
    );

    // 9. Calculate scheduled value, excluding cancelled appointments.
    const scheduledValueToday = (todayAppointments || [])
      .filter((appointment) =>
        ["pending", "confirmed"].includes(appointment.status)
      )
      .reduce(
        (total, appointment) =>
          total + Number(appointment.total_amount || 0),
        0
      );

    return NextResponse.json({
      date: today,
      selectedDate,

      metrics: {
        todayAppointments: todayAppointments?.length || 0,
        todayCustomers: todayCustomerIds.size,
        totalCustomers: customers?.length || 0,
        upcomingAppointments: upcomingAppointments?.length || 0,
        activeStaff: activeStaff?.length || 0,
        availableStaffNow: availableStaff.length,
        scheduledValueToday,
      },

      staff: {
        availableNow: availableStaff,
        activeCount: activeStaff?.length || 0,
        availableCount: availableStaff.length,
      },

      schedule: {
        date: selectedDate,
        appointments: selectedAppointments || [],
        total: selectedAppointments?.length || 0,
      },

      upcoming: {
        appointments: upcomingAppointments || [],
        total: upcomingAppointments?.length || 0,
      },

      recentAppointments: recentAppointments || [],
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load dashboard data.",
        details: error.message,
      },
      { status: 500 }
    );
  }
}