import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const SLOT_INTERVAL_MINUTES = 15;
const MINIMUM_LEAD_TIME_MINUTES = 5 * 60;
const HOLD_DURATION_MINUTES = 5;
const IST_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

function getISTEpochMs(dateStr, timeStr) {
  const [hours, minutes] = timeStr.split(":");

  return new Date(
    `${dateStr}T${hours.padStart(2, "0")}:${minutes.padStart(
      2,
      "0"
    )}:00${IST_OFFSET}`
  ).getTime();
}

function getISTDayOfWeek(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);

  const dateObj = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0)
  );

  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: IST_TIMEZONE,
    weekday: "short",
  }).format(dateObj);

  const days = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };

  return days[dayName];
}

function isValidDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return false;
  }

  const [year, month, day] = dateStr.split("-").map(Number);

  const parsed = new Date(
    Date.UTC(year, month - 1, day)
  );

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

function intervalsOverlap(
  aStart,
  aEnd,
  bStart,
  bEnd
) {
  return (
    Math.max(aStart, bStart) <
    Math.min(aEnd, bEnd)
  );
}

function allocateStaffMRV(
  orderedServices,
  slotStartMs,
  staffByServiceMap,
  staffBlockedIntervals
) {
  const serviceBounds = [];

  let cursorMs = slotStartMs;

  for (
    let index = 0;
    index < orderedServices.length;
    index += 1
  ) {
    const service = orderedServices[index];

    const durationMs =
      service.duration_minutes *
      60 *
      1000;

    const bufferMs =
      service.buffer_minutes *
      60 *
      1000;

    const startMs = cursorMs;
    const endMs = startMs + durationMs;

    const occupiedEndMs =
      endMs + bufferMs;

    serviceBounds.push({
      service,
      sequenceIndex: index,
      startMs,
      endMs,
      occupiedEndMs,
    });

    // Customer's services are sequential.
    // Buffer blocks the assigned staff,
    // but does not automatically delay
    // the customer's next service.
    cursorMs = endMs;
  }

  const indexedServices = serviceBounds
    .map((bound) => ({
      bound,
      candidateCount: (
        staffByServiceMap.get(
          bound.service.id
        ) || []
      ).length,
    }))
    .sort(
      (a, b) =>
        a.candidateCount -
        b.candidateCount
    );

  const assignments = new Map();

  function backtrack(mrvIndex) {
    if (
      mrvIndex ===
      indexedServices.length
    ) {
      return true;
    }

    const { bound } =
      indexedServices[mrvIndex];

    const eligibleStaffIds =
      staffByServiceMap.get(
        bound.service.id
      ) || [];

    for (const staffId of eligibleStaffIds) {
      const blockedIntervals =
        staffBlockedIntervals.get(
          staffId
        ) || [];

      const conflictsWithDatabase =
        blockedIntervals.some(
          (blocked) =>
            intervalsOverlap(
              bound.startMs,
              bound.occupiedEndMs,
              blocked.startMs,
              blocked.endMs
            )
        );

      if (conflictsWithDatabase) {
        continue;
      }

      let conflictsWithCurrentBooking =
        false;

      for (const assignment of assignments.values()) {
        if (
          assignment.staffId !== staffId
        ) {
          continue;
        }

        const directlySequential =
          assignment.endMs ===
            bound.startMs ||
          bound.endMs ===
            assignment.startMs;

        const requestedOccupiedEndMs =
          directlySequential
            ? bound.endMs
            : bound.occupiedEndMs;

        const assignedOccupiedEndMs =
          directlySequential
            ? assignment.endMs
            : assignment.occupiedEndMs;

        if (
          intervalsOverlap(
            bound.startMs,
            requestedOccupiedEndMs,
            assignment.startMs,
            assignedOccupiedEndMs
          )
        ) {
          conflictsWithCurrentBooking = true;
          break;
        }
      }

      if (conflictsWithCurrentBooking) {
        continue;
      }

      assignments.set(
        bound.sequenceIndex,
        {
          serviceId:
            bound.service.id,
          staffId,
          startMs:
            bound.startMs,
          endMs:
            bound.endMs,
          occupiedEndMs:
            bound.occupiedEndMs,
        }
      );

      if (
        backtrack(mrvIndex + 1)
      ) {
        return true;
      }

      assignments.delete(
        bound.sequenceIndex
      );
    }

    return false;
  }

  return backtrack(0)
    ? assignments
    : null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("BOOKING HOLD BODY:", body);

    const {
      business_id: businessId,
      customer_id: customerId,
      date,
      time,
      service_ids: serviceIds,
    } = body;

    // --------------------------------------------------
    // PART 1 — Validate request
    // --------------------------------------------------

    if (
      !businessId ||
      !date ||
      !time ||
      !serviceIds
    ) {
      return NextResponse.json(
        {
          error:
            "business_id, date, time and service_ids are required.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(serviceIds)) {
      return NextResponse.json(
        {
          error:
            "service_ids must be an array.",
        },
        { status: 400 }
      );
    }

    if (serviceIds.length === 0) {
      return NextResponse.json(
        {
          error:
            "At least one service is required.",
        },
        { status: 400 }
      );
    }

    if (!isValidDate(date)) {
      return NextResponse.json(
        {
          error:
            "Invalid date. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    if (
      !/^\d{2}:\d{2}$/.test(time)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid time. Use HH:MM.",
        },
        { status: 400 }
      );
    }

    const [hours, minutes] =
      time.split(":").map(Number);

    if (
      hours > 23 ||
      minutes > 59
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid time.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // PART 2 — Validate 15-minute slot
    // --------------------------------------------------

    if (
      minutes % SLOT_INTERVAL_MINUTES !==
      0
    ) {
      return NextResponse.json(
        {
          error:
            "Selected time must be on a 15-minute interval.",
        },
        { status: 400 }
      );
    }

    const requestedStartMs =
      getISTEpochMs(date, time);

    // --------------------------------------------------
    // PART 3 — Enforce minimum lead time
    // --------------------------------------------------

    const minimumStartMs =
      Date.now() +
      MINIMUM_LEAD_TIME_MINUTES *
        60 *
        1000;

    if (
      requestedStartMs <
      minimumStartMs
    ) {
      return NextResponse.json(
        {
          error:
            "This appointment is too soon. Please choose a later time.",
          code:
            "LEAD_TIME_NOT_MET",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // PART 4 — Load business hours
    // --------------------------------------------------

    const dayOfWeek =
      getISTDayOfWeek(date);

    const {
      data: businessHours,
      error: businessHoursError,
    } = await supabase
      .from("business_hours")
      .select(
        "is_open, open_time, close_time"
      )
      .eq(
        "business_id",
        businessId
      )
      .eq(
        "day_of_week",
        dayOfWeek
      )
      .maybeSingle();

    if (businessHoursError) {
      console.error(
        "Business-hours lookup failed:",
        businessHoursError
      );

      return NextResponse.json(
        {
          error:
            "Unable to check business hours.",
        },
        { status: 500 }
      );
    }

    if (
      !businessHours ||
      !businessHours.is_open ||
      !businessHours.open_time ||
      !businessHours.close_time
    ) {
      return NextResponse.json(
        {
          error:
            "The business is closed on the selected date.",
          code:
            "BUSINESS_CLOSED",
        },
        { status: 409 }
      );
    }

    const businessOpenMs =
      getISTEpochMs(
        date,
        businessHours.open_time
      );

    const businessCloseMs =
      getISTEpochMs(
        date,
        businessHours.close_time
      );

    // --------------------------------------------------
    // PART 5 — Load requested services
    // --------------------------------------------------

    const {
      data: servicesData,
      error: servicesError,
    } = await supabase
      .from("services")
      .select(
        "id, name, price, duration_minutes, buffer_minutes"
      )
      .eq(
        "business_id",
        businessId
      )
      .in("id", serviceIds);

    if (servicesError) {
      console.error(
        "Service lookup failed:",
        servicesError
      );

      return NextResponse.json(
        {
          error:
            "Failed to query services.",
        },
        { status: 500 }
      );
    }

    const serviceMap =
      new Map(
        (servicesData || []).map(
          (service) => [
            service.id,
            {
              id: service.id,
              name: service.name,
              price: Number(
                service.price
              ),
              duration_minutes:
                Number(
                  service.duration_minutes
                ),
              buffer_minutes:
                Number(
                  service.buffer_minutes ||
                    0
                ),
            },
          ]
        )
      );

    // Preserve customer-selected
    // service order.
    const orderedServices =
      serviceIds
        .map((serviceId) =>
          serviceMap.get(serviceId)
        )
        .filter(Boolean);

    if (
      orderedServices.length !==
      serviceIds.length
    ) {
      return NextResponse.json(
        {
          error:
            "One or more requested services are invalid.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // PART 6 — Calculate booking totals
    // --------------------------------------------------

    const totalServiceDurationMs =
      orderedServices.reduce(
        (total, service) =>
          total +
          service.duration_minutes,
        0
      ) *
      60 *
      1000;

    const finalBufferMs =
      (
        orderedServices.at(-1)
          ?.buffer_minutes || 0
      ) *
      60 *
      1000;

    const requestedEndMs =
      requestedStartMs +
      totalServiceDurationMs;

    const occupiedUntilMs =
      requestedEndMs +
      finalBufferMs;

    const totalAmount =
      orderedServices.reduce(
        (total, service) =>
          total + service.price,
        0
      );

    // --------------------------------------------------
    // PART 7 — Make sure booking fits business hours
    // --------------------------------------------------

    if (
      requestedStartMs <
        businessOpenMs ||
      occupiedUntilMs >
        businessCloseMs
    ) {
      return NextResponse.json(
        {
          error:
            "The selected time does not fit within business hours.",
          code:
            "OUTSIDE_BUSINESS_HOURS",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // PART 8 — Load qualified active staff
    // --------------------------------------------------

    const {
      data: staffServicesData,
      error: staffServicesError,
    } = await supabase
      .from("staff_services")
      .select(
        `
        staff_id,
        service_id,
        staff!staff_services_staff_business_fkey(
          id,
          business_id,
          is_active
        )
        `
      )
      .eq(
        "business_id",
        businessId
      )
      .in(
        "service_id",
        serviceIds
      )
      .eq(
        "staff.business_id",
        businessId
      )
      .eq(
        "staff.is_active",
        true
      );

    if (staffServicesError) {
      console.error(
        "Staff capability lookup failed:",
        staffServicesError
      );

      return NextResponse.json(
        {
          error:
            "Failed to resolve staff capabilities.",
        },
        { status: 500 }
      );
    }

    const staffByServiceMap =
      new Map();

    const eligibleStaffIdsSet =
      new Set();

    for (
      const row of
        staffServicesData || []
    ) {
      eligibleStaffIdsSet.add(
        row.staff_id
      );

      const staffIds =
        staffByServiceMap.get(
          row.service_id
        ) || [];

      staffIds.push(
        row.staff_id
      );

      staffByServiceMap.set(
        row.service_id,
        staffIds
      );
    }

    // Every requested service
    // must have at least one
    // qualified staff member.
    for (
      const service of
        orderedServices
    ) {
      if (
        !(
          staffByServiceMap.get(
            service.id
          ) || []
        ).length
      ) {
        return NextResponse.json(
          {
            error:
              `No staff is available to perform ${service.name}.`,
            code:
              "SERVICE_STAFF_UNAVAILABLE",
          },
          { status: 409 }
        );
      }
    }

    const eligibleStaffIds = [
      ...eligibleStaffIdsSet,
    ];

    if (
      eligibleStaffIds.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No eligible staff found.",
          code:
            "NO_ELIGIBLE_STAFF",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // PART 9 — Load staff
    // --------------------------------------------------

    const {
      data: staffList,
      error: staffError,
    } = await supabase
      .from("staff")
      .select("id, name")
      .eq(
        "business_id",
        businessId
      )
      .eq(
        "is_active",
        true
      )
      .in(
        "id",
        eligibleStaffIds
      );

    if (staffError) {
      console.error(
        "Staff lookup failed:",
        staffError
      );

      return NextResponse.json(
        {
          error:
            "Failed to fetch staff.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // PART 10 — Create date query window
    // --------------------------------------------------

    const dayStartMs =
      getISTEpochMs(
        date,
        "00:00"
      );

    const nextDayDate =
      new Date(
        Date.UTC(
          Number(
            date.slice(0, 4)
          ),
          Number(
            date.slice(5, 7)
          ) - 1,
          Number(
            date.slice(8, 10)
          ) + 1
        )
      )
        .toISOString()
        .slice(0, 10);

    const nextDayStartMs =
      getISTEpochMs(
        nextDayDate,
        "00:00"
      );

    const queryWindowStartIso =
      new Date(
        dayStartMs
      ).toISOString();

    const queryWindowEndIso =
      new Date(
        nextDayStartMs
      ).toISOString();

    // --------------------------------------------------
    // PART 11 — Prepare staff blocked intervals
    // --------------------------------------------------

    const blockedIntervalsByStaff =
      new Map(
        eligibleStaffIds.map(
          (staffId) => [
            staffId,
            [],
          ]
        )
      );

    // --------------------------------------------------
    // PART 12 — Existing appointments
    // --------------------------------------------------

    const {
      data: appointmentItems,
      error:
        appointmentItemsError,
    } = await supabase
      .from("appointment_services")
      .select(
        `
        staff_id,
        start_time,
        end_time,
        buffer_minutes,
        appointments!inner(
          status,
          business_id
        )
        `
      )
      .in(
        "staff_id",
        eligibleStaffIds
      )
      .eq(
        "appointments.business_id",
        businessId
      )
      .in(
        "appointments.status",
        [
          "pending",
          "confirmed",
        ]
      )
      .lt(
        "start_time",
        queryWindowEndIso
      )
      .gt(
        "end_time",
        queryWindowStartIso
      );

    if (
      appointmentItemsError
    ) {
      console.error(
        "Appointment conflict lookup failed:",
        appointmentItemsError
      );

      return NextResponse.json(
        {
          error:
            "Failed to check existing appointments.",
        },
        { status: 500 }
      );
    }

    for (
      const item of
        appointmentItems || []
    ) {
      const blockedList =
        blockedIntervalsByStaff.get(
          item.staff_id
        );

      if (!blockedList) {
        continue;
      }

      blockedList.push({
        startMs: new Date(
          item.start_time
        ).getTime(),

        endMs:
          new Date(
            item.end_time
          ).getTime() +
          Number(
            item.buffer_minutes || 0
          ) *
            60 *
            1000,
      });
    }

    // --------------------------------------------------
    // PART 13 — Existing active holds
    // --------------------------------------------------

    const nowIso =
      new Date().toISOString();

    const {
      data: holdItems,
      error: holdItemsError,
    } = await supabase
      .from("booking_hold_services")
      .select(
        `
        staff_id,
        start_time,
        end_time,
        buffer_minutes,
        booking_holds!inner(
          expires_at,
          status,
          business_id
        )
        `
      )
      .in(
        "staff_id",
        eligibleStaffIds
      )
      .eq(
        "booking_holds.business_id",
        businessId
      )
      .eq(
        "booking_holds.status",
        "active"
      )
      .gt(
        "booking_holds.expires_at",
        nowIso
      )
      .lt(
        "start_time",
        queryWindowEndIso
      )
      .gt(
        "end_time",
        queryWindowStartIso
      );
      
    if (holdItemsError) {
      console.error(
        "Hold conflict lookup failed:",
        holdItemsError
      );

      return NextResponse.json(
        {
          error:
            "Failed to check existing booking holds.",
        },
        { status: 500 }
      );
    }
  

    for (
      const item of
        holdItems || []
    ) {
      const blockedList =
        blockedIntervalsByStaff.get(
          item.staff_id
        );

      if (!blockedList) {
        continue;
      }

      blockedList.push({
        startMs: new Date(
          item.start_time
        ).getTime(),

        endMs:
          new Date(
            item.end_time
          ).getTime() +
          Number(
            item.buffer_minutes || 0
          ) *
            60 *
            1000,
      });
    }

    // --------------------------------------------------
    // PART 14 — Block staff outside business hours
    // --------------------------------------------------

    for (
      const staff of
        staffList || []
    ) {
      const blockedList =
        blockedIntervalsByStaff.get(
          staff.id
        );

      if (!blockedList) {
        continue;
      }

      blockedList.push({
        startMs:
          dayStartMs,
        endMs:
          businessOpenMs,
      });

      blockedList.push({
        startMs:
          businessCloseMs,
        endMs:
          nextDayStartMs,
      });
    }

    // --------------------------------------------------
    // PART 15 — Re-check exact requested slot
    // --------------------------------------------------

    const assignments =
      allocateStaffMRV(
        orderedServices,
        requestedStartMs,
        staffByServiceMap,
        blockedIntervalsByStaff
      );

    if (!assignments) {
      return NextResponse.json(
        {
          error:
            "The selected time is no longer available.",
          code:
            "SLOT_UNAVAILABLE",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // PART 16 — Build atomic RPC payload
    // --------------------------------------------------

    const holdExpiresAt =
      new Date(
        Date.now() +
          HOLD_DURATION_MINUTES *
            60 *
            1000
      ).toISOString();

    const holdItemsPayload =
      [
        ...assignments.values(),
      ]
        .sort(
          (a, b) =>
            a.startMs -
            b.startMs
        )
        .map((assignment) => {
          const service =
            serviceMap.get(
              assignment.serviceId
            );

          return {
            service_id:
              assignment.serviceId,

            staff_id:
              assignment.staffId,

            price:
              service.price,

            duration_minutes:
              service.duration_minutes,

            buffer_minutes:
              service.buffer_minutes,

            start_time:
              new Date(
                assignment.startMs
              ).toISOString(),

            end_time:
              new Date(
                assignment.endMs
              ).toISOString(),
          };
        });

    // --------------------------------------------------
    // PART 17 — Atomic database reservation
    // --------------------------------------------------
    //
    // IMPORTANT:
    //
    // This RPC must perform its own final
    // concurrency-safe availability check
    // before inserting the hold.
    //
    // The function will be created separately
    // in PostgreSQL.
    // --------------------------------------------------
    console.log("🔥 RPC FUNCTION BEING CALLED: create_atomic_booking_hold_v2");

    const {
      data: rpcData,
      error: rpcError,
    } = await supabase.rpc(
      "create_atomic_booking_hold_v2",
      {
        p_business_id:
          businessId,

          p_customer_id:
          customerId ?? null ,

        p_expires_at:
          holdExpiresAt,

        p_total_amount:
          totalAmount,

        p_items:
          holdItemsPayload,
      }
    );
    console.log("RPC DATA:", rpcData);
    console.log("RPC ERROR:", rpcError);
    if (rpcError) {
      console.error(
        "Atomic booking hold failed:",
        rpcError
      );

      if (
        rpcError.code ===
        "23P01"
      ) {
        return NextResponse.json(
          {
            error:
              "The selected time is no longer available.",
            code:
              "SLOT_UNAVAILABLE",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: "Unable to create booking hold.",
          code: "HOLD_CREATION_FAILED",
          rpcError,
        },
        { status: 500 }
      );
    }

    if (
      !rpcData?.[0]?.hold_id 
     
    ) {
      console.error(
        "Atomic booking hold returned invalid data:",
        rpcData
      );

      return NextResponse.json(
        {
          error:
            "Booking hold was not created correctly.",
          code:
            "HOLD_CREATION_FAILED",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // PART 18 — Return hold
    // --------------------------------------------------

    return NextResponse.json(
      {
        success: true,

        holdId:
          rpcData[0].hold_id,

        expiresAt:
          holdExpiresAt,

        totalAmount,

        date,

        time,

        timezone:
          IST_TIMEZONE,

        allocations:
          holdItemsPayload.map(
            (item) => ({
              service_id:
                item.service_id,

              staff_id:
                item.staff_id,

              start_time:
                item.start_time,

              end_time:
                item.end_time,
            })
          ),
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error(
      "Booking hold API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Internal server error while creating booking hold.",
      },
      { status: 500 }
    );
  }
}