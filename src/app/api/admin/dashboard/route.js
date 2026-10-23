import { NextResponse } from "next/server";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

const TIME_ZONE = "Asia/Kolkata";

const APPOINTMENT_DETAILS = `
  id,
  customer_id,
  status,
  total_amount,
  start_time,
  end_time,
  customers!appointments_customer_id_fkey (id, name, phone),
  appointment_services (
    id,
    service_id,
    staff_id,
    services (id, name, duration_minutes),
    staff (id, name)
  )
`;

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

  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateString = nextDate.toISOString().split("T")[0];

  return {
    start: `${dateString}T00:00:00+05:30`,
    end: `${nextDateString}T00:00:00+05:30`,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const context = await authorizeBusinessAdmin(request, searchParams.get("business_id") || undefined);
  if (context.error) {
    return adminJson(context, { error: context.error }, { status: context.status });
  }

  try {
    // 1. Get today's date and IST boundaries
    const today = getDateInIST();
    const todayBounds = getISTDayBounds(today);

    // 2. Fetch appointments scheduled for today with the details the dashboard displays.
    const { data: appointments, error: appointmentsError } =
      await context.supabase
        .from("appointments")
        .select(APPOINTMENT_DETAILS)
        .eq("business_id", context.businessId)
        .gte("start_time", todayBounds.start)
        .lt("start_time", todayBounds.end)
        .order("start_time", { ascending: true });

    if (appointmentsError) throw appointmentsError;

    // 2a. Fetch the next five upcoming appointments.
    const { data: upcomingAppointments, error: upcomingError } = await context.supabase
      .from("appointments")
      .select(APPOINTMENT_DETAILS)
      .eq("business_id", context.businessId)
      .eq("status", "confirmed")
      .gte("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .limit(5);

    if (upcomingError) throw upcomingError;

    // 2b. Fetch the latest appointment activity for the recent list.
    const { data: recentAppointments, error: recentError } = await context.supabase
      .from("appointments")
      .select(APPOINTMENT_DETAILS)
      .eq("business_id", context.businessId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentError) throw recentError;

    // 3. Exclude cancelled and no-show appointments
    const activeAppointments = (appointments || []).filter(
      (appointment) =>
        !["cancelled", "no_show"].includes(appointment.status)
    );

    // 4. Get completed appointments
    const completedAppointments = activeAppointments.filter(
      (appointment) => appointment.status === "completed"
    );

    // 5. Calculate expected revenue
    const expectedRevenue = activeAppointments
      .filter((appointment) =>
        appointment.status === "confirmed"
      )
      .reduce(
        (total, appointment) =>
          total + Number(appointment.total_amount || 0),
        0
      );

    // 6. Calculate completed service revenue
    const completedServiceRevenue = completedAppointments.reduce(
      (total, appointment) =>
        total + Number(appointment.total_amount || 0),
      0
    );

    // 7. Get total registered customers
    const { count: totalCustomers, error: customersError } =
      await context.supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", context.businessId);

    if (customersError) throw customersError;

    // 8. Get customers registered today
    const { count: newCustomersToday, error: newCustomersError } =
      await context.supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", context.businessId)
        .gte("created_at", todayBounds.start)
        .lt("created_at", todayBounds.end);

    if (newCustomersError) throw newCustomersError;

    // 9. Get all active staff
    const { data: activeStaffMembers, error: staffError } =
      await context.supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", context.businessId)
        .eq("is_active", true);

    if (staffError) throw staffError;

    const activeStaff = activeStaffMembers || [];

    // 10. Find all appointments that count as scheduled today
    // Cancelled and no-show appointments do not occupy staff.
    const scheduledAppointments = activeAppointments.filter(
      (appointment) =>
        ["confirmed", "completed"].includes(appointment.status)
    );

    const scheduledAppointmentIds = scheduledAppointments.map(
      (appointment) => appointment.id
    );

    // 11. Find staff assigned to today's appointments
    let assignedStaffIds = [];

    if (scheduledAppointmentIds.length > 0) {
      const { data: assignments, error: assignmentsError } =
        await context.supabase
          .from("appointment_services")
          .select("staff_id")
          .in("appointment_id", scheduledAppointmentIds);

      if (assignmentsError) throw assignmentsError;

      assignedStaffIds = [
        ...new Set(
          (assignments || [])
            .map((assignment) => assignment.staff_id)
            .filter(Boolean)
        ),
      ];
    }

    // 12. Find active staff with no appointments scheduled today
    const assignedStaffSet = new Set(assignedStaffIds);

    const availableStaff = activeStaff.filter(
      (staffMember) => !assignedStaffSet.has(staffMember.id)
    );

    // 13. Return dashboard metrics
    return adminJson(context, {
      date: today,

      metrics: {
        todayAppointmentsCount: activeAppointments.length,
        completedAppointmentsCount: completedAppointments.length,
        expectedRevenue,
        completedServiceRevenue,

        totalCustomers: totalCustomers || 0,
        newCustomersToday: newCustomersToday || 0,

        activeStaff: activeStaff.length,
        availableStaffCount: availableStaff.length,
      },

      data: {
        appointments: activeAppointments,
        completedAppointments,
        availableStaff,
        upcomingAppointments: upcomingAppointments || [],
        recentAppointments: recentAppointments || [],
      },
    });
  } catch (error) {
    console.error("Dashboard API error:", error);

    return NextResponse.json(
      {
        error: "Failed to load dashboard metrics.",
        details:
          error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
