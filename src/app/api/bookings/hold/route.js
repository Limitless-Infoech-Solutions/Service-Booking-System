import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const MINIMUM_LEAD_TIME_MINUTES = 5 * 60; // 5 hours prior
const TIMEZONE_OFFSET = "+05:30";
const HOLD_EXPIRATION_MINUTES = 5;

// ============================================================
// Helper — Convert HH:MM / HH:MM:SS to minutes from midnight
// ============================================================

function timeToMinutes(time) {
  const [hours, minutes] = time.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
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
// MAIN BOOKING HOLD ROUTE
// ============================================================

export async function POST(request) {
  try {
    const body = await request.json();
    const { serviceIds, date, startTime } = body;

    // ==========================================================
    // PART 1 — INPUT VALIDATION & TIME RESTRICTIONS
    // ==========================================================

    if (!serviceIds || !Array.isArray(serviceIds) || serviceIds.length === 0) {
      return NextResponse.json(
        { error: "serviceIds array is required and cannot be empty" },
        { status: 400 }
      );
    }

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: "Invalid or missing date. Expected format YYYY-MM-DD" },
        { status: 400 }
      );
    }

    if (!startTime || !/^\d{2}:\d{2}$/.test(startTime)) {
      return NextResponse.json(
        { error: "Invalid or missing startTime. Expected format HH:MM" },
        { status: 400 }
      );
    }

    // Determine requested date's day of week accurately in local time
    const [year, month, day] = date.split("-").map(Number);
    const requestedDate = new Date(year, month - 1, day);

    if (Number.isNaN(requestedDate.getTime())) {
      return NextResponse.json({ error: "Invalid date provided" }, { status: 400 });
    }

    const dayOfWeek = requestedDate.getDay(); // 0 = Sunday, 1 = Monday, ...

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
      return NextResponse.json(
        { error: "Business is closed on the selected date" },
        { status: 400 }
      );
    }

    // Parse candidate start timestamp and verify against minimum lead time
    const candidateStartIso = `${date}T${startTime}:00${TIMEZONE_OFFSET}`;
    const candidateStart = new Date(candidateStartIso);

    if (Number.isNaN(candidateStart.getTime())) {
      return NextResponse.json({ error: "Invalid start time timestamp" }, { status: 400 });
    }

    const now = new Date();
    const minimumBookingTime = new Date(
      now.getTime() + MINIMUM_LEAD_TIME_MINUTES * 60 * 1000
    );

    if (candidateStart < minimumBookingTime) {
      return NextResponse.json(
        { error: "Appointments must be booked at least 5 hours in advance" },
        { status: 400 }
      );
    }

    // ==========================================================
    // PART 2 — HYDRATE SERVICES & CALCULATE DURATION
    // ==========================================================

    const { data: services, error: servicesError } = await supabase
      .from("services")
      .select("id, name, price, duration_minutes, buffer_minutes")
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

    // Business closing time boundary check
    const requestedStartMinutes = timeToMinutes(startTime);
    const closeMinutes = timeToMinutes(businessHours.close_time);

    if (requestedStartMinutes + totalDurationMinutes > closeMinutes) {
      return NextResponse.json(
        { error: "Selected service duration exceeds business closing hours" },
        { status: 400 }
      );
    }

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
        return NextResponse.json(
          { error: "No qualified active staff available for selected services" },
          { status: 400 }
        );
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
    const eligibleStaffIds = [...eligibleStaffMap.keys()];

    // ==========================================================
    // PART 4 — FETCH CONFIRMED BOOKINGS & ACTIVE HOLDS
    // ==========================================================

    const dayStart = `${date}T00:00:00${TIMEZONE_OFFSET}`;
    const nextDate = new Date(year, month - 1, day + 1);
    const nextDateString = `${nextDate.getFullYear()}-${String(
      nextDate.getMonth() + 1
    ).padStart(2, "0")}-${String(nextDate.getDate()).padStart(2, "0")}`;
    const dayEnd = `${nextDateString}T00:00:00${TIMEZONE_OFFSET}`;

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

    if (eligibleStaffIds.length > 0) {
      // 1. Fetch Confirmed/Pending Appointments
      const { data: existingBookings, error: bookingsError } = await supabase
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

      for (const booking of existingBookings || []) {
        if (!booking.staff_id) continue;
        const staff = staffSchedulingPool.get(booking.staff_id);
        if (!staff) continue;

        const status = booking.appointments?.status;
        if (status && !["pending", "confirmed"].includes(status)) {
          continue;
        }

        const bStart = new Date(booking.start_time);
        const bEnd = new Date(booking.end_time);
        const buffer = Number(booking.buffer_minutes || 0);
        const occupiedEnd = new Date(bEnd.getTime() + buffer * 60 * 1000);

        addBlockedInterval(staff, bStart, occupiedEnd);
      }

      // 2. Fetch Unexpired Booking Holds
      const { data: activeHolds, error: holdsError } = await supabase
        .from("booking_hold_services")
        .select(`
          staff_id,
          start_time,
          end_time,
          buffer_minutes,
          booking_holds!inner (
            status,
            expires_at
          )
        `)
        .in("staff_id", eligibleStaffIds)
        .gte("start_time", dayStart)
        .lt("start_time", dayEnd)
        .gt("booking_holds.expires_at", now.toISOString())
        .eq("booking_holds.status", "active");

      if (holdsError) {
        return NextResponse.json(
          { error: holdsError.message },
          { status: 500 }
        );
      }

      for (const hold of activeHolds || []) {
        if (!hold.staff_id) continue;
        const staff = staffSchedulingPool.get(hold.staff_id);
        if (!staff) continue;

        const hStart = new Date(hold.start_time);
        const hEnd = new Date(hold.end_time);
        const buffer = Number(hold.buffer_minutes || 0);
        const occupiedEnd = new Date(hEnd.getTime() + buffer * 60 * 1000);

        addBlockedInterval(staff, hStart, occupiedEnd);
      }
    }

    // ==========================================================
    // PART 5 — SINGLE-SLOT ALLOCATION EVALUATION
    // ==========================================================

    function evaluateSingleStaff(staff) {
      let currentTime = new Date(candidateStart);
      const assignments = [];

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
          return { success: false, assignments: [] };
        }

        assignments.push({
          serviceId: service.id,
          staffId: staff.id,
          startTime: new Date(currentTime),
          endTime: serviceEnd,
          bufferMinutes: buffer,
          occupiedUntil: occupiedEnd,
        });

        currentTime = occupiedEnd;
      }

      return { success: true, assignments };
    }

    function evaluateMultiStaff() {
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
          bufferMinutes: buffer,
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

      return { success: true, assignments };
    }

    let resolvedAllocation = null;
    let allocationType = null;

    // PATH A — SINGLE STAFF
    for (const staff of groupAStaff) {
      const schedulingStaff = staffSchedulingPool.get(staff.id);
      if (!schedulingStaff) continue;

      const singleRes = evaluateSingleStaff(schedulingStaff);
      if (singleRes.success) {
        resolvedAllocation = singleRes.assignments;
        allocationType = "single_staff";
        break;
      }
    }

    // PATH B — MULTI STAFF
    if (!resolvedAllocation) {
      const multiRes = evaluateMultiStaff();
      if (multiRes.success) {
        resolvedAllocation = multiRes.assignments;
        allocationType = "multi_staff";
      }
    }

    if (!resolvedAllocation) {
      return NextResponse.json(
        {
          error: "This slot is no longer available. Please choose another time.",
          code: "SLOT_UNAVAILABLE",
        },
        { status: 409 }
      );
    }

    // ==========================================================
    // PART 6 — CREATE HOLD RECORDS IN SUPABASE
    // ==========================================================

    const expiresAt = new Date(
      now.getTime() + HOLD_EXPIRATION_MINUTES * 60 * 1000
    ).toISOString();

    // 1. Insert Parent Hold Record
    const { data: holdData, error: holdError } = await supabase
    .from("booking_holds")
    .insert({
      status: "active",
      expires_at: expiresAt,
    })
    .select("id, expires_at, created_at")
    .single();
    if (holdError || !holdData) {
      return NextResponse.json(
        { error: holdError?.message || "Failed to create booking hold" },
        { status: 500 }
      );
    }

    // 2. Insert Service Breakdown Records
    const holdServiceRows = resolvedAllocation.map((item) => {
      const service = orderedServices.find(
        (service) => service.id === item.serviceId
      );
    
      return {
        hold_id: holdData.id,
        service_id: item.serviceId,
        staff_id: item.staffId,
        price: Number(service.price),
        duration_minutes: Number(service.duration_minutes),
        buffer_minutes: Number(service.buffer_minutes || 0),
        start_time: item.startTime.toISOString(),
        end_time: item.endTime.toISOString(),
      };
    });
    const { error: serviceHoldError } = await supabase
      .from("booking_hold_services")
      .insert(holdServiceRows);

    if (serviceHoldError) {
      // Rollback master hold if service rows fail
      await supabase.from("booking_holds").delete().eq("id", holdData.id);

      return NextResponse.json(
        { error: "Failed to allocate service holds" },
        { status: 500 }
      );
    }

    // ==========================================================
    // PART 7 — SUCCESS RESPONSE
    // ==========================================================

    return NextResponse.json({
      success: true,
      holdId: holdData.id,
      expiresAt: holdData.expires_at,
      totalDurationMinutes,
      allocationType,
      allocations: resolvedAllocation.map((a) => ({
        serviceId: a.serviceId,
        staffId: a.staffId,
        startTime: a.startTime.toISOString(),
        endTime: a.endTime.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Hold Creation API error:", error);
    return NextResponse.json(
      { error: "Internal server error while reserving slot" },
      { status: 500 }
    );
  }
}