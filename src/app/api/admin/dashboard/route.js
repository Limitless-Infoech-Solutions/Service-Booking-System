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

  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextDateString = nextDate.toISOString().split("T")[0];

  return {
    start: `${dateString}T00:00:00+05:30`,
    end: `${nextDateString}T00:00:00+05:30`,
  };
}

export async function GET() {
  try {
    // 1. Get today's date and IST boundaries
    const today = getDateInIST();
    const todayBounds = getISTDayBounds(today);

    // 2. Fetch appointments scheduled for today
    const { data: appointments, error: appointmentsError } =
      await supabase
        .from("appointments")
        .select("id, status, total_amount, start_time")
        .eq("business_id", BUSINESS_ID)
        .gte("start_time", todayBounds.start)
        .lt("start_time", todayBounds.end)
        .order("start_time", { ascending: true });

    if (appointmentsError) throw appointmentsError;

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
        ["pending", "confirmed"].includes(appointment.status)
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
      await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", BUSINESS_ID);

    if (customersError) throw customersError;

    // 8. Get customers registered today
    const { count: newCustomersToday, error: newCustomersError } =
      await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("business_id", BUSINESS_ID)
        .gte("created_at", todayBounds.start)
        .lt("created_at", todayBounds.end);

    if (newCustomersError) throw newCustomersError;

    // 9. Get all active staff
    const { data: activeStaffMembers, error: staffError } =
      await supabase
        .from("staff")
        .select("id, name")
        .eq("business_id", BUSINESS_ID)
        .eq("is_active", true);

    if (staffError) throw staffError;

    const activeStaff = activeStaffMembers || [];

    // 10. Find all appointments that count as scheduled today
    // Cancelled and no-show appointments do not occupy staff.
    const scheduledAppointments = activeAppointments.filter(
      (appointment) =>
        ["pending", "confirmed", "completed"].includes(appointment.status)
    );

    const scheduledAppointmentIds = scheduledAppointments.map(
      (appointment) => appointment.id
    );

    // 11. Find staff assigned to today's appointments
    let assignedStaffIds = [];

    if (scheduledAppointmentIds.length > 0) {
      const { data: assignments, error: assignmentsError } =
        await supabase
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
    return NextResponse.json({
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