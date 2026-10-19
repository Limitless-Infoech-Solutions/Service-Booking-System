import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { BUSINESS_ID } from "@/lib/business";

import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";
import {
  allocateStaffMRV,
  BUSINESS_TIMEZONE as IST_TIMEZONE,
  SLOT_INTERVAL_MINUTES,
  MINIMUM_LEAD_TIME_MINUTES,
  getBusinessEpochMs as getISTEpochMs,
  getBusinessDayOfWeek as getISTDayOfWeek,
  isValidBookingDate as isValidDate,
} from "@/lib/booking/scheduling";

const HOLD_DURATION_MINUTES = 5;

function setBookingHoldCookie(response, holdId, isAdminMode = false) {
  response.cookies.set(
    "booking_flow_hold",
    `${isAdminMode ? "admin" : "customer"}:${holdId}`,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: HOLD_DURATION_MINUTES * 60,
    }
  );
  return response;
}

export async function GET(request) {
  let adminContext = null;
  try {
    const { searchParams } = new URL(request.url);
    const holdId = searchParams.get("hold_id");
    const isAdminMode = searchParams.get("mode") === "admin";
    const flowHoldId = request.cookies.get("booking_flow_hold")?.value;

    if (
      !holdId ||
      flowHoldId !== `${isAdminMode ? "admin" : "customer"}:${holdId}`
    ) {
      return NextResponse.json(
        {
          valid: false,
          error: "Booking hold does not belong to this browser flow.",
        },
        { status: 404 }
      );
    }

    let bookingClient = supabase;
    let businessId = BUSINESS_ID;
    if (isAdminMode) {
      adminContext = await authorizeBusinessAdmin(request);
      if (adminContext.error) {
        return adminJson(
          adminContext,
          { valid: false, error: adminContext.error },
          { status: adminContext.status }
        );
      }
      bookingClient = adminContext.supabase;
      businessId = adminContext.businessId;
    }

    const { data: hold, error } = await bookingClient
      .from("booking_holds")
      .select(
        "id, business_id, customer_id, status, expires_at, booking_hold_services(service_id, staff_id, start_time, end_time)"
      )
      .eq("id", holdId)
      .eq("business_id", businessId)
      .maybeSingle();

    if (error) throw error;
    if (!hold) {
      const body = {
        valid: false,
        error: "Booking hold was not found for this business.",
      };
      return adminContext
        ? adminJson(adminContext, body, { status: 404 })
        : NextResponse.json(body, { status: 404 });
    }

    if (
      hold.status !== "active" ||
      !hold.expires_at ||
      new Date(hold.expires_at) <= new Date()
    ) {
      const body = {
        valid: false,
        code: "HOLD_EXPIRED",
        error: "Booking hold is no longer active or has expired.",
      };
      const response = adminContext
        ? adminJson(adminContext, body, { status: 409 })
        : NextResponse.json(body, { status: 409 });
      response.cookies.set("booking_flow_hold", "", { path: "/", maxAge: 0 });
      return response;
    }

    const body = {
      valid: true,
      hold: {
        id: hold.id,
        business_id: hold.business_id,
        expires_at: hold.expires_at,
        customer_attached: Boolean(hold.customer_id),
        services: hold.booking_hold_services || [],
      },
    };
    return adminContext
      ? adminJson(adminContext, body)
      : NextResponse.json(body);
  } catch (error) {
    console.error("Booking hold validation error:", error);
    const body = { valid: false, error: "Unable to validate booking hold." };
    return adminContext
      ? adminJson(adminContext, body, { status: 500 })
      : NextResponse.json(body, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    console.log("BOOKING HOLD BODY:", body);

    const {
      business_id: requestedBusinessId,
      customer_id: customerId,
      date,
      time,
      service_ids: serviceIds,
      admin_mode: isAdminMode = false,
      staff_assignments: requestedStaffAssignments,
    } = body;
    let businessId = requestedBusinessId;
    let bookingClient = supabase;
    let adminContext = null;
    if (isAdminMode) {
      adminContext = await authorizeBusinessAdmin(
        request,
        requestedBusinessId || undefined
      );
      if (adminContext.error) {
        return adminJson(
          adminContext,
          { error: adminContext.error },
          { status: adminContext.status }
        );
      }
      businessId = adminContext.businessId;
      bookingClient = adminContext.supabase;
    }

    // --------------------------------------------------
    // PART 1 — Validate request
    // --------------------------------------------------

    if (!businessId || !date || !time || !serviceIds) {
      return NextResponse.json(
        {
          error: "business_id, date, time and service_ids are required.",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(serviceIds)) {
      return NextResponse.json(
        {
          error: "service_ids must be an array.",
        },
        { status: 400 }
      );
    }

    if (serviceIds.length === 0) {
      return NextResponse.json(
        {
          error: "At least one service is required.",
        },
        { status: 400 }
      );
    }

    if (!isValidDate(date)) {
      return NextResponse.json(
        {
          error: "Invalid date. Use YYYY-MM-DD.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{2}:\d{2}$/.test(time)) {
      return NextResponse.json(
        {
          error: "Invalid time. Use HH:MM.",
        },
        { status: 400 }
      );
    }

    const [hours, minutes] = time.split(":").map(Number);

    if (hours > 23 || minutes > 59) {
      return NextResponse.json(
        {
          error: "Invalid time.",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // PART 2 — Validate 15-minute slot
    // --------------------------------------------------

    if (minutes % SLOT_INTERVAL_MINUTES !== 0) {
      return NextResponse.json(
        {
          error: "Selected time must be on a 15-minute interval.",
        },
        { status: 400 }
      );
    }

    const requestedStartMs = getISTEpochMs(date, time);

    // --------------------------------------------------
    // PART 3 — Enforce minimum lead time
    // --------------------------------------------------

    const minimumStartMs = Date.now() + MINIMUM_LEAD_TIME_MINUTES * 60 * 1000;

    if (requestedStartMs < minimumStartMs) {
      return NextResponse.json(
        {
          error: "This appointment is too soon. Please choose a later time.",
          code: "LEAD_TIME_NOT_MET",
        },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // PART 4 — Load business hours
    // --------------------------------------------------

    const dayOfWeek = getISTDayOfWeek(date);

    const { data: businessHours, error: businessHoursError } =
      await bookingClient
        .from("business_hours")
        .select("is_open, open_time, close_time")
        .eq("business_id", businessId)
        .eq("day_of_week", dayOfWeek)
        .maybeSingle();

    if (businessHoursError) {
      console.error("Business-hours lookup failed:", businessHoursError);

      return NextResponse.json(
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
      return NextResponse.json(
        {
          error: "The business is closed on the selected date.",
          code: "BUSINESS_CLOSED",
        },
        { status: 409 }
      );
    }

    const businessOpenMs = getISTEpochMs(date, businessHours.open_time);

    const businessCloseMs = getISTEpochMs(date, businessHours.close_time);

    // --------------------------------------------------
    // PART 5 — Load requested services
    // --------------------------------------------------

    const { data: servicesData, error: servicesError } = await bookingClient
      .from("services")
      .select("id, name, price, duration_minutes, buffer_minutes")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .eq("status", "completed")
      .in("id", serviceIds);

    if (servicesError) {
      console.error("Service lookup failed:", servicesError);

      return NextResponse.json(
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
          name: service.name,
          price: Number(service.price),
          duration_minutes: Number(service.duration_minutes),
          buffer_minutes: Number(service.buffer_minutes || 0),
        },
      ])
    );

    // Preserve customer-selected
    // service order.
    const orderedServices = serviceIds
      .map((serviceId) => serviceMap.get(serviceId))
      .filter(Boolean);

    if (orderedServices.length !== serviceIds.length) {
      return NextResponse.json(
        {
          error: "One or more requested services are invalid.",
        },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // PART 6 — Calculate booking totals
    // --------------------------------------------------

    const totalServiceDurationMs =
      orderedServices.reduce(
        (total, service) => total + service.duration_minutes,
        0
      ) *
      60 *
      1000;

    const finalBufferMs =
      (orderedServices.at(-1)?.buffer_minutes || 0) * 60 * 1000;

    const requestedEndMs = requestedStartMs + totalServiceDurationMs;

    const occupiedUntilMs = requestedEndMs + finalBufferMs;

    const totalAmount = orderedServices.reduce(
      (total, service) => total + service.price,
      0
    );

    // Reuse only the live hold bound to this browser flow. If the selection
    // changed, refuse to create a second hold until the existing one expires;
    // the deployed RPC has no locally verified release/update contract.
    const flowCookie = request.cookies.get("booking_flow_hold")?.value;
    const [flowMode, flowHoldId] = flowCookie?.split(":") || [];
    if (flowHoldId) {
      const { data: flowHold, error: flowHoldError } = await bookingClient
        .from("booking_holds")
        .select(
          "id, business_id, customer_id, status, expires_at, booking_hold_services(service_id, staff_id, start_time, end_time)"
        )
        .eq("id", flowHoldId)
        .eq("business_id", businessId)
        .maybeSingle();
      if (flowHoldError) throw flowHoldError;

      if (
        flowHold?.status === "active" &&
        flowHold.expires_at &&
        new Date(flowHold.expires_at) > new Date()
      ) {
        const savedItems = flowHold.booking_hold_services || [];
        let cursor = requestedStartMs;
        const scheduledItems = orderedServices.map((service) => {
          const scheduled = {
            service,
            startMs: cursor,
            endMs: cursor + service.duration_minutes * 60_000,
          };
          cursor = scheduled.endMs;
          return scheduled;
        });
        const savedByService = new Map(
          savedItems.map((item) => [item.service_id, item])
        );
        let exactSchedule =
          flowMode === (isAdminMode ? "admin" : "customer") &&
          savedItems.length === orderedServices.length &&
          orderedServices.every((service) => {
            const scheduled = scheduledItems.find(
              (item) => item.service.id === service.id
            );
            const saved = savedByService.get(service.id);
            return (
              saved &&
              scheduled &&
              new Date(saved.start_time).getTime() === scheduled.startMs &&
              new Date(saved.end_time).getTime() === scheduled.endMs
            );
          });

        if (isAdminMode && requestedStaffAssignments !== undefined) {
          if (!Array.isArray(requestedStaffAssignments)) {
            return NextResponse.json(
              { error: "staff_assignments must be an array." },
              { status: 400 }
            );
          }
          const requestedByService = new Map(
            requestedStaffAssignments.map((item) => [
              item?.service_id,
              item?.staff_id,
            ])
          );
          exactSchedule =
            exactSchedule &&
            requestedByService.size === savedItems.length &&
            savedItems.every(
              (item) =>
                requestedByService.get(item.service_id) === item.staff_id
            );
        }

        if (!exactSchedule) {
          return NextResponse.json(
            {
              error:
                "This booking flow already has an active hold for a different selection. It cannot be replaced until its reservation expires.",
              code: "ACTIVE_FLOW_HOLD",
            },
            { status: 409 }
          );
        }

        const reusedResponse = {
          success: true,
          holdId: flowHold.id,
          expiresAt: flowHold.expires_at,
          totalAmount,
          date,
          time,
          timezone: IST_TIMEZONE,
          reused: true,
          allocations: savedItems.map((item) => ({
            service_id: item.service_id,
            staff_id: item.staff_id,
            start_time: item.start_time,
            end_time: item.end_time,
          })),
        };
        const response = isAdminMode
          ? adminJson(adminContext, reusedResponse, { status: 200 })
          : NextResponse.json(reusedResponse, { status: 200 });
        if (isAdminMode) {
          response.cookies.set("admin_booking_business", businessId, {
            httpOnly: true,
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
            path: "/",
            maxAge: HOLD_DURATION_MINUTES * 60,
          });
        }
        return setBookingHoldCookie(response, flowHold.id, isAdminMode);
      }
    }

    if (customerId) {
      const { data: existingCustomer, error: customerError } =
        await bookingClient
          .from("customers")
          .select("id")
          .eq("id", customerId)
          .eq("business_id", businessId)
          .maybeSingle();
      if (customerError) throw customerError;
      if (!existingCustomer) {
        return NextResponse.json(
          { error: "Customer does not belong to this business." },
          { status: 404 }
        );
      }
    }

    // --------------------------------------------------
    // PART 7 — Make sure booking fits business hours
    // --------------------------------------------------

    if (
      requestedStartMs < businessOpenMs ||
      occupiedUntilMs > businessCloseMs
    ) {
      return NextResponse.json(
        {
          error: "The selected time does not fit within business hours.",
          code: "OUTSIDE_BUSINESS_HOURS",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // PART 8 — Load qualified active staff
    // --------------------------------------------------

    const { data: staffServicesData, error: staffServicesError } =
      await bookingClient
        .from("staff_services")
        .select(
          `
        staff_id,
        service_id,
        staff!staff_services_staff_business_fkey!inner(
          id,
          business_id,
          is_active,
          status
        )
        `
        )
        .eq("business_id", businessId)
        .in("service_id", serviceIds)
        .eq("staff.business_id", businessId)
        .eq("staff.is_active", true)
        .eq("staff.status", "completed");

    if (staffServicesError) {
      console.error("Staff capability lookup failed:", staffServicesError);

      return NextResponse.json(
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

    // Every requested service
    // must have at least one
    // qualified staff member.
    for (const service of orderedServices) {
      if (!(staffByServiceMap.get(service.id) || []).length) {
        return NextResponse.json(
          {
            error: `No staff is available to perform ${service.name}.`,
            code: "SERVICE_STAFF_UNAVAILABLE",
          },
          { status: 409 }
        );
      }
    }

    const eligibleStaffIds = [...eligibleStaffIdsSet];

    if (eligibleStaffIds.length === 0) {
      return NextResponse.json(
        {
          error: "No eligible staff found.",
          code: "NO_ELIGIBLE_STAFF",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // PART 9 — Load staff
    // --------------------------------------------------

    const { data: staffList, error: staffError } = await bookingClient
      .from("staff")
      .select("id, name")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .eq("status", "completed")
      .in("id", eligibleStaffIds);

    if (staffError) {
      console.error("Staff lookup failed:", staffError);

      return NextResponse.json(
        {
          error: "Failed to fetch staff.",
        },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // PART 10 — Create date query window
    // --------------------------------------------------

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

    // --------------------------------------------------
    // PART 11 — Prepare staff blocked intervals
    // --------------------------------------------------

    const blockedIntervalsByStaff = new Map(
      eligibleStaffIds.map((staffId) => [staffId, []])
    );

    // --------------------------------------------------
    // PART 12 — Existing appointments
    // --------------------------------------------------

    const { data: appointmentItems, error: appointmentItemsError } =
      await bookingClient
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

      return NextResponse.json(
        {
          error: "Failed to check existing appointments.",
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

    // --------------------------------------------------
    // PART 13 — Existing active holds
    // --------------------------------------------------

    const nowIso = new Date().toISOString();

    const { data: holdItems, error: holdItemsError } = await bookingClient
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
      .in("staff_id", eligibleStaffIds)
      .eq("booking_holds.business_id", businessId)
      .eq("booking_holds.status", "active")
      .gt("booking_holds.expires_at", nowIso)
      .lt("start_time", queryWindowEndIso)
      .gt("end_time", queryWindowStartIso);

    if (holdItemsError) {
      console.error("Hold conflict lookup failed:", holdItemsError);

      return NextResponse.json(
        {
          error: "Failed to check existing booking holds.",
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

    // --------------------------------------------------
    // PART 14 — Block staff outside business hours
    // --------------------------------------------------

    for (const staff of staffList || []) {
      const blockedList = blockedIntervalsByStaff.get(staff.id);

      if (!blockedList) {
        continue;
      }

      blockedList.push({
        startMs: dayStartMs,
        endMs: businessOpenMs,
      });

      blockedList.push({
        startMs: businessCloseMs,
        endMs: nextDayStartMs,
      });
    }

    // --------------------------------------------------
    // PART 15 — Re-check exact requested slot
    // --------------------------------------------------

    let fixedStaffByService = null;
    if (isAdminMode && requestedStaffAssignments !== undefined) {
      if (!Array.isArray(requestedStaffAssignments)) {
        return NextResponse.json(
          { error: "staff_assignments must be an array." },
          { status: 400 }
        );
      }
      fixedStaffByService = new Map(
        requestedStaffAssignments.map((item) => [
          item?.service_id,
          item?.staff_id,
        ])
      );
      if (
        fixedStaffByService.size !== orderedServices.length ||
        orderedServices.some((service) => !fixedStaffByService.get(service.id))
      ) {
        return NextResponse.json(
          {
            error:
              "Choose an eligible staff member for every selected service.",
          },
          { status: 400 }
        );
      }
    }

    const assignments = allocateStaffMRV(
      orderedServices,
      requestedStartMs,
      staffByServiceMap,
      blockedIntervalsByStaff,
      { fixedStaffByService, enforceAdjacentBuffers: Boolean(isAdminMode) }
    );

    if (!assignments) {
      return NextResponse.json(
        {
          error: "The selected time is no longer available.",
          code: "SLOT_UNAVAILABLE",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // PART 16 — Build atomic RPC payload
    // --------------------------------------------------

    const holdExpiresAt = new Date(
      Date.now() + HOLD_DURATION_MINUTES * 60 * 1000
    ).toISOString();

    const holdItemsPayload = [...assignments.values()]
      .sort((a, b) => a.startMs - b.startMs)
      .map((assignment) => {
        const service = serviceMap.get(assignment.serviceId);

        return {
          service_id: assignment.serviceId,

          staff_id: assignment.staffId,

          price: service.price,

          duration_minutes: service.duration_minutes,

          buffer_minutes: service.buffer_minutes,

          start_time: new Date(assignment.startMs).toISOString(),

          end_time: new Date(assignment.endMs).toISOString(),
        };
      });

    // --------------------------------------------------
    // PART 17 — Atomic database reservation
    // --------------------------------------------------
    //
    // IMPORTANT:
    //
    // The deployed RPC receives this validated candidate payload.
    // Its database-side concurrency guarantees are defined by the
    // existing Supabase function, not by this route.
    // --------------------------------------------------
    console.log("🔥 RPC FUNCTION BEING CALLED: create_atomic_booking_hold_v2");

    const { data: rpcData, error: rpcError } = await bookingClient.rpc(
      "create_atomic_booking_hold_v2",
      {
        p_business_id: businessId,

        p_customer_id: customerId ?? null,

        p_expires_at: holdExpiresAt,

        p_total_amount: totalAmount,

        p_items: holdItemsPayload,
      }
    );
    console.log("RPC DATA:", rpcData);
    console.log("RPC ERROR:", rpcError);
    if (rpcError) {
      console.error("Atomic booking hold failed:", rpcError);

      if (rpcError.code === "23P01") {
        return NextResponse.json(
          {
            error: "The selected time is no longer available.",
            code: "SLOT_UNAVAILABLE",
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

    if (!rpcData?.[0]?.hold_id) {
      console.error("Atomic booking hold returned invalid data:", rpcData);

      return NextResponse.json(
        {
          error: "Booking hold was not created correctly.",
          code: "HOLD_CREATION_FAILED",
        },
        { status: 500 }
      );
    }

    let savedAdminAllocations = null;
    if (isAdminMode) {
      const { data: savedItems, error: savedItemsError } = await bookingClient
        .from("booking_hold_services")
        .select(
          "service_id, staff_id, start_time, end_time, booking_holds!inner(id, business_id)"
        )
        .eq("booking_holds.id", rpcData[0].hold_id)
        .eq("booking_holds.business_id", businessId);
      if (savedItemsError) throw savedItemsError;

      const savedByService = new Map(
        (savedItems || []).map((item) => [item.service_id, item])
      );
      const storedExactly =
        holdItemsPayload.length === serviceIds.length &&
        savedByService.size === holdItemsPayload.length &&
        holdItemsPayload.every((expected) => {
          const saved = savedByService.get(expected.service_id);
          return (
            saved &&
            saved.staff_id === expected.staff_id &&
            new Date(saved.start_time).getTime() ===
              new Date(expected.start_time).getTime() &&
            new Date(saved.end_time).getTime() ===
              new Date(expected.end_time).getTime()
          );
        });
      if (!storedExactly) {
        return NextResponse.json(
          {
            error:
              "The database did not preserve the requested staff assignments and schedule. The hold was not sent to customer verification.",
            code: "HOLD_ASSIGNMENT_MISMATCH",
          },
          { status: 500 }
        );
      }
      savedAdminAllocations = holdItemsPayload.map((item) => {
        const saved = savedByService.get(item.service_id);
        return {
          service_id: saved.service_id,
          staff_id: saved.staff_id,
          start_time: saved.start_time,
          end_time: saved.end_time,
        };
      });
    }

    // --------------------------------------------------
    // PART 18 — Return hold
    // --------------------------------------------------

    const holdResponse = {
      success: true,

      holdId: rpcData[0].hold_id,

      expiresAt: holdExpiresAt,

      totalAmount,

      date,

      time,

      timezone: IST_TIMEZONE,

      allocations: (savedAdminAllocations || holdItemsPayload).map((item) => ({
        service_id: item.service_id,

        staff_id: item.staff_id,

        start_time: item.start_time,

        end_time: item.end_time,
      })),
    };
    if (isAdminMode) {
      const response = adminJson(adminContext, holdResponse, { status: 201 });
      // CustomerAuthModal has a fixed request contract and cannot accept a
      // business ID prop. This short-lived context is only a selector; the
      // customer-check route revalidates it against the admin membership.
      response.cookies.set("admin_booking_business", businessId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: HOLD_DURATION_MINUTES * 60,
      });
      return setBookingHoldCookie(response, holdResponse.holdId, true);
    }
    return setBookingHoldCookie(
      NextResponse.json(holdResponse, { status: 201 }),
      holdResponse.holdId,
      false
    );
  } catch (error) {
    console.error("Booking hold API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error while creating booking hold.",
      },
      { status: 500 }
    );
  }
}
