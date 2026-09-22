import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MINIMUM_LEAD_TIME_MINUTES = 5 * 60; // 5 hours prior
const SLOT_INTERVAL_MINUTES = 15;
const TIMEZONE_OFFSET = "+05:30";
const TIMEZONE_NAME = "Asia/Kolkata";

// ============================================================
// Helper — Convert HH:MM / HH:MM:SS to minutes from midnight
// ============================================================

function timeToMinutes(time) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

// ============================================================
// Helper — Convert minutes from midnight to HH:MM
// ============================================================

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

// ============================================================
// Helper — Build IST date/time string
// ============================================================

function buildDateTime(date, minutes) {
  return `${date}T${minutesToTime(minutes)}:00${TIMEZONE_OFFSET}`;
}

// ============================================================
// Helper — Check whether two time intervals overlap
// ============================================================

function intervalsOverlap(startA, endA, startB, endB) {
  return startA < endB && endA > startB;
}

// ============================================================
// Helper — Check whether staff is free for an interval
// ============================================================

function isStaffFree(staff, startTime, endTime) {
  return !staff.blockedIntervals.some((interval) =>
    intervalsOverlap(
      startTime,
      endTime,
      interval.startTime,
      interval.endTime
    )
  );
}

// ============================================================
// Helper — Add an occupied interval to staff scheduling pool
// ============================================================

function addBlockedInterval(staff, startTime, endTime) {
  staff.blockedIntervals.push({
    startTime,
    endTime,
  });
}

// ============================================================
// MAIN AVAILABILITY ROUTE
// ============================================================

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // ==========================================================
    // PART 1 — INPUT VALIDATION & TIME RESTRICTIONS
    // ==========================================================

    const servicesParam = searchParams.get("services");
    const date = searchParams.get("date");

    if (!servicesParam || !date) {
      return NextResponse.json(
        { error: "services and date query params are required" },
        { status: 400 }
      );
    }

    const serviceIds = servicesParam
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (serviceIds.length === 0) {
      return NextResponse.json(
        { error: "At least one service is required" },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid date format. Expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    // Determine requested date's day of week relative to Indian standard time
    const requestedDate = new Date(`${date}T12:00:00${TIMEZONE_OFFSET}`);

    if (Number.isNaN(requestedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date" }, { status: 400 });
    }

    const dayOfWeek = requestedDate.getUTCDay();

    // Fetch Operating Hours
    const { data: businessHours, error: businessHoursError } = await supabase
      .from("business_hours")
      .select("day_of_week, is_open, open_time, close_time")
      .eq("day_of_week", dayOfWeek)
      .single();

    if (
      businessHoursError ||
      !businessHours ||
      !businessHours.is_open ||
      !businessHours.open_time ||
      !businessHours.close_time
    ) {
      return NextResponse.json({
        date,
        timezone: TIMEZONE_NAME,
        slots: [],
      });
    }

    // Minimum lead time check (NOW + 5 hours)
    const now = new Date();
    const minimumBookingTime = new Date(
      now.getTime() + MINIMUM_LEAD_TIME_MINUTES * 60 * 1000
    );

    // ==========================================================
    // PART 2 — HYDRATE SERVICES & CALCULATE TOTAL TIME
    // ==========================================================

    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, name, duration_minutes, buffer_minutes")
      .in("id", serviceIds);

    if (servicesError) {
      return NextResponse.json(
        { error: servicesError.message },
        { status: 500 }
      );
    }

    if (!services || services.length !== serviceIds.length) {
      return NextResponse.json(
        { error: "One or more selected services were not found" },
        { status: 400 }
      );
    }

    const orderedServices = serviceIds.map((serviceId) =>
      services.find((service) => service.id === serviceId)
    );

    const totalDurationMinutes = orderedServices.reduce(
      (total, service) =>
        total +
        Number(service.duration_minutes || 0) +
        Number(service.buffer_minutes || 0),
      0
    );

    // ==========================================================
    // PART 3 — BUILD STAFF CAPABILITY MATRIX
    // ==========================================================

    const { data: staffServices, error: staffServicesError } = await supabase
      .from("staff_services")
      .select(`
        service_id,
        staff_id,
        staff (
          id,
          name,
          is_active
        )
      `)
      .in("service_id", serviceIds);

    if (staffServicesError) {
      return NextResponse.json(
        { error: staffServicesError.message },
        { status: 500 }
      );
    }

    const staffByService = {};

    for (const item of staffServices || []) {
      if (!item.staff?.is_active) continue;

      if (!staffByService[item.service_id]) {
        staffByService[item.service_id] = [];
      }

      const alreadyAdded = staffByService[item.service_id].some(
        (staff) => staff.id === item.staff.id
      );

      if (!alreadyAdded) {
        staffByService[item.service_id].push(item.staff);
      }
    }

    for (const serviceId of serviceIds) {
      if (
        !staffByService[serviceId] ||
        staffByService[serviceId].length === 0
      ) {
        return NextResponse.json({
          date,
          timezone: TIMEZONE_NAME,
          slots: [],
        });
      }
    }

    const eligibleStaffMap = new Map();

    for (const staffList of Object.values(staffByService)) {
      for (const staff of staffList) {
        if (!eligibleStaffMap.has(staff.id)) {
          eligibleStaffMap.set(staff.id, {
            id: staff.id,
            name: staff.name,
            isActive: staff.is_active,
          });
        }
      }
    }

    const groupAStaff = [...eligibleStaffMap.values()].filter((staff) =>
      serviceIds.every((serviceId) =>
        staffByService[serviceId]?.some(
          (qualifiedStaff) => qualifiedStaff.id === staff.id
        )
      )
    );

    const groupBStaff = [...eligibleStaffMap.values()];

    // ==========================================================
    // PART 4 — FETCH ACTIVE OCCUPIED INTERVALS
    // ==========================================================

    const eligibleStaffIds = [...eligibleStaffMap.keys()];

    const dayStart = `${date}T00:00:00${TIMEZONE_OFFSET}`;
    const nextDate = new Date(`${date}T12:00:00${TIMEZONE_OFFSET}`);
    nextDate.setUTCDate(nextDate.getUTCDate() + 1);
    const nextDateString = nextDate.toISOString().split("T")[0];
    const dayEnd = `${nextDateString}T00:00:00${TIMEZONE_OFFSET}`;

    let existingBookings = [];

    if (eligibleStaffIds.length > 0) {
      const { data, error: bookingsError } = await supabase
        .from("appointment_services")
        .select(`
          staff_id,
          start_time,
          end_time,
          buffer_minutes,
          appointments (
            status
          )
        `)
        .in("staff_id", eligibleStaffIds)
        .gte("start_time", dayStart)
        .lt("start_time", dayEnd);

      if (bookingsError) {
        return NextResponse.json(
          { error: bookingsError.message },
          { status: 500 }
        );
      }

      existingBookings = data || [];
    }

    const staffSchedulingPool = new Map();

    for (const staff of groupBStaff) {
      const capabilities = serviceIds.filter((serviceId) =>
        staffByService[serviceId]?.some(
          (qualifiedStaff) => qualifiedStaff.id === staff.id
        )
      );

      staffSchedulingPool.set(staff.id, {
        id: staff.id,
        name: staff.name,
        capabilities,
        blockedIntervals: [],
      });
    }

    for (const booking of existingBookings) {
      if (!booking.staff_id) continue;

      const staff = staffSchedulingPool.get(booking.staff_id);
      if (!staff) continue;

      const status = booking.appointments?.status;
      if (status && !["pending", "confirmed"].includes(status)) {
        continue;
      }

      const startTime = new Date(booking.start_time);
      const serviceEndTime = new Date(booking.end_time);
      const bufferMinutes = Number(booking.buffer_minutes || 0);
      const occupiedEndTime = new Date(
        serviceEndTime.getTime() + bufferMinutes * 60 * 1000
      );

      addBlockedInterval(staff, startTime, occupiedEndTime);
    }

    // ==========================================================
    // PART 5 — GENERATE CANDIDATE 15-MINUTE GRID SLOTS
    // ==========================================================

    const openMinutes = timeToMinutes(businessHours.open_time);
    const closeMinutes = timeToMinutes(businessHours.close_time);
    const candidateSlots = [];

    for (
      let minutes = openMinutes;
      minutes + totalDurationMinutes <= closeMinutes;
      minutes += SLOT_INTERVAL_MINUTES
    ) {
      const candidateStart = buildDateTime(date, minutes);
      const candidateStartDate = new Date(candidateStart);

      if (candidateStartDate < minimumBookingTime) {
        continue;
      }

      candidateSlots.push({
        time: minutesToTime(minutes),
        startTime: candidateStartDate,
      });
    }

    // ==========================================================
    // PART 6 — ALLOCATION ENGINE
    // ==========================================================

    const resultSlots = [];

    function canSingleStaffHandleAppointment(staff, candidateStart) {
      let currentTime = new Date(candidateStart);

      for (const service of orderedServices) {
        const duration = Number(service.duration_minutes || 0);
        const buffer = Number(service.buffer_minutes || 0);
        const serviceEnd = new Date(
          currentTime.getTime() + duration * 60 * 1000
        );
        const occupiedEnd = new Date(
          serviceEnd.getTime() + buffer * 60 * 1000
        );

        if (!isStaffFree(staff, currentTime, occupiedEnd)) {
          return false;
        }

        currentTime = occupiedEnd;
      }

      return true;
    }

    function canMultiStaffHandleAppointment(candidateStart) {
      let currentTime = new Date(candidateStart);
      const assignments = [];
      const tempBlockedStaff = new Map();

      for (const service of orderedServices) {
        const qualifiedStaff = staffByService[service.id] || [];
        const duration = Number(service.duration_minutes || 0);
        const buffer = Number(service.buffer_minutes || 0);
        const serviceEnd = new Date(
          currentTime.getTime() + duration * 60 * 1000
        );
        const occupiedEnd = new Date(
          serviceEnd.getTime() + buffer * 60 * 1000
        );

        let assignedStaff = null;

        for (const qualifiedStaffMember of qualifiedStaff) {
          const staff = staffSchedulingPool.get(qualifiedStaffMember.id);
          if (!staff) continue;

          const isFreeInBase = isStaffFree(staff, currentTime, occupiedEnd);
          const tempIntervals = tempBlockedStaff.get(staff.id) || [];
          const isFreeInTemp = !tempIntervals.some((interval) =>
            intervalsOverlap(
              currentTime,
              occupiedEnd,
              interval.startTime,
              interval.endTime
            )
          );

          if (isFreeInBase && isFreeInTemp) {
            assignedStaff = staff;
            break;
          }
        }

        if (!assignedStaff) {
          return { success: false, assignments: [] };
        }

        assignments.push({
          serviceId: service.id,
          staffId: assignedStaff.id,
          startTime: new Date(currentTime),
          endTime: serviceEnd,
          occupiedUntil: occupiedEnd,
        });

        if (!tempBlockedStaff.has(assignedStaff.id)) {
          tempBlockedStaff.set(assignedStaff.id, []);
        }
        tempBlockedStaff.get(assignedStaff.id).push({
          startTime: new Date(currentTime),
          endTime: occupiedEnd,
        });

        currentTime = occupiedEnd;
      }

      return {
        success: true,
        assignments,
      };
    }

    for (const candidate of candidateSlots) {
      const candidateStart = candidate.startTime;
      let available = false;
      let allocationType = null;

      // PATH A — SINGLE STAFF
      for (const staff of groupAStaff) {
        const schedulingStaff = staffSchedulingPool.get(staff.id);
        if (!schedulingStaff) continue;

        if (canSingleStaffHandleAppointment(schedulingStaff, candidateStart)) {
          available = true;
          allocationType = "single_staff";
          break;
        }
      }

      // PATH B — MULTI STAFF
      if (!available) {
        const multiStaffAllocation =
          canMultiStaffHandleAppointment(candidateStart);

        if (multiStaffAllocation.success) {
          available = true;
          allocationType = "multi_staff";
        }
      }

      resultSlots.push({
        time: candidate.time,
        status: available ? "available" : "full",
        allocationType,
      });
    }

    // ==========================================================
    // PART 7 — RETURN AVAILABLE GRID
    // ==========================================================

    return NextResponse.json({
      date,
      timezone: TIMEZONE_NAME,
      businessHours,
      totalDurationMinutes,
      slots: resultSlots,
    });
  } catch (error) {
    console.error("Availability API error:", error);
    return NextResponse.json(
      { error: "Failed to calculate availability" },
      { status: 500 }
    );
  }
}