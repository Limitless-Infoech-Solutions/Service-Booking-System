import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

import {
  allocateStaffMRV,
  BUSINESS_TIMEZONE as IST_TIMEZONE,
  SLOT_INTERVAL_MINUTES,
  MINIMUM_LEAD_TIME_MINUTES,
  getBusinessEpochMs as getISTEpochMs,
  getBusinessDayOfWeek as getISTDayOfWeek,
  isValidBookingDate as isValidDate,
  getFreeIntervals,
} from "@/lib/booking/scheduling";

export async function GET(request) {
  let adminContext = null;
  let respond = (body, init) => NextResponse.json(body, init);
  try {
    const { searchParams } = new URL(request.url);

    const date = searchParams.get("date");
    const isAdminMode = searchParams.get("mode") === "admin";
    let businessId = searchParams.get("business_id");
    let bookingClient = supabase;
    const requestedTime = searchParams.get("time");
    if (isAdminMode) {
      adminContext = await authorizeBusinessAdmin(
        request,
        businessId || undefined
      );
      if (adminContext.error)
        return adminJson(
          adminContext,
          { error: adminContext.error },
          { status: adminContext.status }
        );
      businessId = adminContext.businessId;
      bookingClient = adminContext.supabase;
      respond = (body, init) => adminJson(adminContext, body, init);
    }
    const serviceIdsParam = searchParams.get("services");

    if (!date || !businessId || !serviceIdsParam) {
      return respond(
        {
          error:
            "Missing required query parameters: business_id, date, services",
        },
        { status: 400 }
      );
    }

    if (!isValidDate(date)) {
      return respond(
        {
          error: "Invalid date. Use a real YYYY-MM-DD calendar date.",
        },
        { status: 400 }
      );
    }

    const serviceIds = serviceIdsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (serviceIds.length === 0) {
      return respond(
        {
          error: "service_ids must contain at least one service ID.",
        },
        { status: 400 }
      );
    }

    const dayOfWeek = getISTDayOfWeek(date);

    // 1. Load business opening hours.
    const { data: businessHours, error: businessHoursError } =
      await bookingClient
        .from("business_hours")
        .select("is_open, open_time, close_time")
        .eq("business_id", businessId)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

    if (businessHoursError) {
      console.error("Business-hours lookup failed:", businessHoursError);

      return respond(
        {
          error: "Unable to check business hours.",
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
      return respond(
        {
          date,
          timezone: IST_TIMEZONE,
          businessHours: {
            isOpen: false,
            openTime: null,
            closeTime: null,
          },
          availableSlots: [],
        },
        { status: 200 }
      );
    }

    const businessOpenMs = getISTEpochMs(date, businessHours.open_time);

    const businessCloseMs = getISTEpochMs(date, businessHours.close_time);

    if (businessCloseMs <= businessOpenMs) {
      return respond(
        {
          error: "Business hours are configured incorrectly.",
        },
        { status: 500 }
      );
    }

    // 2. Load requested services.
    const { data: servicesData, error: servicesError } = await bookingClient
      .from("services")
      .select("id, duration_minutes, buffer_minutes")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .eq("status", "completed")
      .in("id", serviceIds);

    if (servicesError) {
      console.error("Service lookup failed:", servicesError);

      return respond(
        {
          error: "Failed to query services.",
        },
        { status: 500 }
      );
    }

    const serviceMap = new Map(
      (servicesData || []).map((service) => [
        service.id,
        {
          id: service.id,
          duration_minutes: Number(service.duration_minutes || 0),
          buffer_minutes: Number(service.buffer_minutes || 0),
        },
      ])
    );

    const orderedServices = serviceIds
      .map((serviceId) => serviceMap.get(serviceId))
      .filter(Boolean);

    if (orderedServices.length !== serviceIds.length) {
      return respond(
        {
          error: "One or more requested services are invalid.",
        },
        { status: 404 }
      );
    }

    if (orderedServices.some((service) => service.duration_minutes <= 0)) {
      return respond(
        {
          error: "One or more services have an invalid duration.",
        },
        { status: 500 }
      );
    }

    const netServiceDurationMs =
      orderedServices.reduce(
        (total, service) => total + service.duration_minutes,
        0
      ) *
      60 *
      1000;

    const finalBufferMs =
      (orderedServices.at(-1)?.buffer_minutes || 0) * 60 * 1000;

    // 3. Load qualified active staff.
    const { data: staffServicesData, error: staffServicesError } =
      await bookingClient
        .from("staff_services")
        .select(
          "staff_id, service_id, staff!staff_services_staff_business_fkey!inner(id, is_active, status, business_id)"
        )
        .eq("business_id", businessId)
        .in("service_id", serviceIds)

        .eq("staff.business_id", businessId)
        .eq("staff.is_active", true)
        .eq("staff.status", "completed");

    if (staffServicesError) {
      console.error("Staff capability lookup failed:", staffServicesError);

      return respond(
        {
          error: "Failed to resolve staff capabilities.",
        },
        { status: 500 }
      );
    }

    const staffByServiceMap = new Map(); 
    const eligibleStaffIdsSet = new Set();

    for (const row of staffServicesData || []) {
      eligibleStaffIdsSet.add(row.staff_id);

      const staffIds = staffByServiceMap.get(row.service_id) || [];

      staffIds.push(row.staff_id);

      staffByServiceMap.set(row.service_id, staffIds);
    }

    for (const service of orderedServices) {
      if (!(staffByServiceMap.get(service.id) || []).length) {
        return respond(
          {
            date,
            timezone: IST_TIMEZONE,
            availableSlots: [],
          },
          { status: 200 }
        );
      }
    }

    const eligibleStaffIds = [...eligibleStaffIdsSet];

    if (eligibleStaffIds.length === 0) {
      return respond(
        {
          date,
          timezone: IST_TIMEZONE,
          availableSlots: [],
        },
        { status: 200 }
      );
    }

    const { data: staffList, error: staffError } = await bookingClient
      .from("staff")
      .select("id, name")

      .eq("business_id", businessId)
      .eq("is_active", true)
      .eq("status", "completed")
      .in("id", eligibleStaffIds);

    if (staffError) {
      console.error("Staff lookup failed:", staffError);

      return respond(
        {
          error: "Failed to fetch staff.",
        },
        { status: 500 }
      );
    }

    // 4. Define the full IST date window.
    const dayStartMs = getISTEpochMs(date, "00:00");

    const nextDayDate = new Date(
      Date.UTC(
        Number(date.slice(0, 4)),
        Number(date.slice(5, 7)) - 1,
        Number(date.slice(8, 10)) + 1
      )
    )
      .toISOString()
      .slice(0, 10);

    const nextDayStartMs = getISTEpochMs(nextDayDate, "00:00");

    const queryWindowStartIso = new Date(dayStartMs).toISOString();

    const queryWindowEndIso = new Date(nextDayStartMs).toISOString();

    const blockedIntervalsByStaff = new Map(
      eligibleStaffIds.map((staffId) => [staffId, []])
    );

    // 5. Add existing appointment blocks.
    // Only pending and confirmed appointments
    // consume staff capacity.
    const { data: appointmentItems, error: appointmentItemsError } =
      await bookingClient
        .from("appointment_services")
        .select(
          ` 
        staff_id, 
        start_time, 
        end_time, 
        buffer_minutes, 
        appointments!inner(status, business_id) 
      `
        )
        .in("staff_id", eligibleStaffIds)
        .eq("appointments.business_id", businessId)
        .in("appointments.status", ["pending", "confirmed"])
        .lt("start_time", queryWindowEndIso)
        .gt("end_time", queryWindowStartIso);

    if (appointmentItemsError) {
      console.error(
        "Appointment conflict lookup failed:",
        appointmentItemsError
      );

      return respond(
        {
          error: "Failed to fetch existing appointments.",
        },
        { status: 500 }
      );
    }

    for (const item of appointmentItems || []) {
      const blockedList = blockedIntervalsByStaff.get(item.staff_id);

      if (!blockedList) {
        continue;
      }

      blockedList.push({
        startMs: new Date(item.start_time).getTime(),

        endMs:
          new Date(item.end_time).getTime() +
          Number(item.buffer_minutes || 0) * 60 * 1000,
      });
    }

    // 6. Add active unexpired hold blocks.
    const nowIso = new Date().toISOString();

    const { data: holdItems, error: holdItemsError } = await bookingClient
      .from("booking_hold_services")
      .select(
        ` 
        staff_id, 
        start_time, 
        end_time, 
        buffer_minutes, 
        booking_holds!inner(expires_at, status, business_id) 
      `
      )
      .in("staff_id", eligibleStaffIds)
      .eq("booking_holds.business_id", businessId)
      .eq("booking_holds.status", "active")
      .gt("booking_holds.expires_at", nowIso)
      .lt("start_time", queryWindowEndIso)
      .gt("end_time", queryWindowStartIso);

    if (holdItemsError) {
      console.error("Hold conflict lookup failed:", holdItemsError);

      return respond(
        {
          error: "Failed to fetch active holds.",
        },
        { status: 500 }
      );
    }

    for (const item of holdItems || []) {
      const blockedList = blockedIntervalsByStaff.get(item.staff_id);

      if (!blockedList) {
        continue;
      }

      blockedList.push({
        startMs: new Date(item.start_time).getTime(),

        endMs:
          new Date(item.end_time).getTime() +
          Number(item.buffer_minutes || 0) * 60 * 1000,
      });
    }

    // 7. Add non-working periods.
    // For now, all staff follow the business hours.
    let earliestCandidateStartMs = businessOpenMs;

    let latestCandidateEndMs = businessCloseMs;

    for (const staff of staffList || []) {
      const blockedList = blockedIntervalsByStaff.get(staff.id);

      if (!blockedList) {
        continue;
      }

      // Before business opens
      blockedList.push({
        startMs: dayStartMs,
        endMs: businessOpenMs,
      });

      // After business closes
      blockedList.push({
        startMs: businessCloseMs,
        endMs: nextDayStartMs,
      });
    }

    if (earliestCandidateStartMs >= latestCandidateEndMs) {
      return respond(
        {
          date,
          timezone: IST_TIMEZONE,
          availableSlots: [],
        },
        { status: 200 }
      );
    }

    // 8. Scan each 15-minute candidate start time.
    const minLeadTimeMs = Date.now() + MINIMUM_LEAD_TIME_MINUTES * 60 * 1000;

    const slotStepMs = SLOT_INTERVAL_MINUTES * 60 * 1000;

    const availableSlots = [];
    console.log("DEBUG businessOpenMs:", businessOpenMs);
    console.log("DEBUG businessCloseMs:", businessCloseMs);
    console.log("DEBUG earliestCandidateStartMs:", earliestCandidateStartMs);
    console.log("DEBUG latestCandidateEndMs:", latestCandidateEndMs);
    console.log("DEBUG minLeadTimeMs:", minLeadTimeMs);
    console.log("DEBUG netServiceDurationMs:", netServiceDurationMs);
    console.log("DEBUG finalBufferMs:", finalBufferMs);

    for (
      let candidateStartMs = earliestCandidateStartMs;
      candidateStartMs + netServiceDurationMs + finalBufferMs <=
      latestCandidateEndMs;
      candidateStartMs += slotStepMs
    ) {
      if (candidateStartMs < minLeadTimeMs) {
        continue;
      }

      const assignments = allocateStaffMRV(
        orderedServices,
        candidateStartMs,
        staffByServiceMap,
        blockedIntervalsByStaff,
        { enforceAdjacentBuffers: isAdminMode }
      );

      if (!assignments) {
        continue;
      }

      const formattedTime = new Intl.DateTimeFormat("en-GB", {
        timeZone: IST_TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(candidateStartMs));

      availableSlots.push({
        time: formattedTime,

        start_timestamp: new Date(candidateStartMs).toISOString(),

        end_timestamp: new Date(
          candidateStartMs + netServiceDurationMs
        ).toISOString(),

        occupied_until_timestamp: new Date(
          candidateStartMs + netServiceDurationMs + finalBufferMs
        ).toISOString(),

        assignments: [...assignments.values()]
          .sort((a, b) => a.startMs - b.startMs)
          .map((assignment) => ({
            service_id: assignment.serviceId,

            staff_id: assignment.staffId,

            start_time: new Date(assignment.startMs).toISOString(),

            end_time: new Date(assignment.endMs).toISOString(),
          })),
      });
    }
    console.log("DEBUG businessId:", businessId);
    console.log("DEBUG serviceIds:", serviceIds);
    console.log("DEBUG servicesData:", servicesData);
    console.log("DEBUG staffServicesData:", staffServicesData);
    console.log("DEBUG eligibleStaffIds:", eligibleStaffIds);

    console.log(
      "DEBUG staffByServiceMap:",
      Object.fromEntries(staffByServiceMap)
    );

    console.log("DEBUG staffList:", staffList);
    console.log("DEBUG appointmentItems:", appointmentItems);
    console.log("DEBUG holdItems:", holdItems);

    console.log(
      "DEBUG blockedIntervalsByStaff:",
      Object.fromEntries(blockedIntervalsByStaff)
    );

    console.log("DEBUG availableSlots:", availableSlots);

    const selectedSlotAvailable =
      requestedTime &&
      availableSlots.some((slot) => slot.time === requestedTime);
    const assignmentWindowStartMs = selectedSlotAvailable
      ? getISTEpochMs(date, requestedTime)
      : businessOpenMs;
    const assignmentWindowEndMs = Math.min(
      businessCloseMs,
      assignmentWindowStartMs +
        netServiceDurationMs +
        Math.max(
          ...orderedServices.map((service) => service.buffer_minutes * 60_000),
          0
        )
    );
    const staffAvailability =
      isAdminMode && selectedSlotAvailable
        ? (staffList || []).map((staff) => {
            const canAssign = (fixedStaffByService) =>
              Boolean(
                allocateStaffMRV(
                  orderedServices,
                  assignmentWindowStartMs,
                  staffByServiceMap,
                  blockedIntervalsByStaff,
                  { fixedStaffByService, enforceAdjacentBuffers: true }
                )
              );
            const allServiceAssignments = new Map(
              orderedServices.map((service) => [service.id, staff.id])
            );

            return {
              staff_id: staff.id,
              name: staff.name,
              service_ids: orderedServices
                .filter((service) =>
                  (staffByServiceMap.get(service.id) || []).includes(staff.id)
                )
                .map((service) => service.id),
              assignable_service_ids: orderedServices
                .filter((service) =>
                  canAssign(new Map([[service.id, staff.id]]))
                )
                .map((service) => service.id),
              all_services_assignable: canAssign(allServiceAssignments),
              free_intervals: getFreeIntervals(
                assignmentWindowStartMs,
                assignmentWindowEndMs,
                blockedIntervalsByStaff.get(staff.id) || []
              ).map(({ startMs, endMs }) => ({
                start_time: new Date(startMs).toISOString(),
                end_time: new Date(endMs).toISOString(),
                label: `${new Intl.DateTimeFormat("en-IN", {
                  timeZone: IST_TIMEZONE,
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                }).format(new Date(startMs))}–${new Intl.DateTimeFormat(
                  "en-IN",
                  {
                    timeZone: IST_TIMEZONE,
                    hour: "numeric",
                    minute: "2-digit",
                    hour12: true,
                  }
                ).format(new Date(endMs))}`,
              })),
            };
          })
        : undefined;

    return respond(
      {
        date,
        timezone: IST_TIMEZONE,
        businessHours: {
          isOpen: businessHours.is_open,
          openTime: businessHours.open_time,
          closeTime: businessHours.close_time,
        },
        availableSlots,
        ...(staffAvailability ? { staffAvailability } : {}),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Availability API error:", error);

    return respond(
      {
        error: "Internal server error while finding availability.",
      },
      { status: 500 }
    );
  }
}
