
import { NextResponse } from "next/server"; 
import { supabase } from "@/lib/supabase"; 
 
const SLOT_INTERVAL_MINUTES = 15; 
const MINIMUM_LEAD_TIME_MINUTES = 5 * 60; 
const IST_TIMEZONE = "Asia/Kolkata"; 
const IST_OFFSET = "+05:30"; 
 
function getISTEpochMs(dateStr, timeStr) { 
  const [hours, minutes] = timeStr.split(":"); 
 
  return new Date( 
    `${dateStr}T${hours.padStart(2, "0")}:${minutes.padStart( 
      2, 
      "0" 
    )}:00${IST_OFFSET}` 
  ).getTime(); //convert IST time in ms(millisecond).
} 
 
function getISTDayOfWeek(dateStr) { 
  const [year, month, day] = dateStr.split("-").map(Number); 
 
  const dateObj = new Date( 
    Date.UTC(year, month - 1, day, 12, 0, 0) 
  ); 
 
  const dayName = new Intl.DateTimeFormat("en-US", {  //asks what time is in India and day.
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
  //checks the format of date is correct format.
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
//Two intervals overlap if and only if the latest starting time is strictly earlier than the earliest ending time(secret formula)
function intervalsOverlap(aStart, aEnd, bStart, bEnd) { 
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd); 
} 
 
function allocateStaffMRV( 
  orderedServices, //haircut,facial..
  slotStartMs, //The appointment start time in milliseconds.
  staffByServiceMap, //Which staff members are trained to do each service.
  staffBlockedIntervals //Existing staff schedules/busy times.
) { 
  const serviceBounds = []; //It will store the calculated time blocks for each service.
  let cursorMs = slotStartMs;  //keeps track of where the current service starts.
 
  for ( 
    let index = 0; 
    index < orderedServices.length; 
    index += 1 
  ) { 
    const service = orderedServices[index]; 
 
    const durationMs = 
      service.duration_minutes * 60 * 1000; 
 
    const bufferMs = 
      service.buffer_minutes * 60 * 1000; 
 
    const startMs = cursorMs; 
    const endMs = startMs + durationMs; 
    const occupiedEndMs = endMs + bufferMs; 
 
    serviceBounds.push({ 
      service, 
      sequenceIndex: index, 
      startMs, 
      endMs, 
      occupiedEndMs, 
    }); 
 
    // Services are sequential. 
    // Buffer blocks the assigned staff after a service, 
    // but does not automatically create a gap before 
    // the next service in the same customer journey. 
    cursorMs = endMs; 
  } 
 //MRV stands for Minimum Remaining Values 
 /* sorted result:  bound is object of services(facial)
 [
  { bound: FacialObj, candidateCount: 1 },    // Scheduled 1st (Hardest to fill)
  { bound: HairColorObj, candidateCount: 3 }, // Scheduled 2nd
  { bound: HaircutObj, candidateCount: 5 }    // Scheduled 3rd (Easiest to fill)
] */
  const indexedServices = serviceBounds 
    .map((bound) => ({ 
      bound, 
      candidateCount: ( 
        staffByServiceMap.get(bound.service.id) || [] 
      ).length, 
    })) 
    .sort( 
      (a, b) => a.candidateCount - b.candidateCount 
    ); 
 
  const assignments = new Map(); 
 
  function backtrack(mrvIndex) { 
    if (mrvIndex === indexedServices.length) { 
      return true; 
    } 
 
    const { bound } = indexedServices[mrvIndex]; 
 
    const eligibleStaffIds = 
      staffByServiceMap.get(bound.service.id) || []; 
 
    for (const staffId of eligibleStaffIds) { 
      const blockedIntervals = 
        staffBlockedIntervals.get(staffId) || []; 
 
      const conflictsWithDatabase = blockedIntervals.some( 
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
 
      let conflictsWithCurrentBooking = false; 
 
      for (const assignment of assignments.values()) { 
        if (assignment.staffId !== staffId) { 
          continue; 
        } 
 
        const directlySequential = 
          assignment.endMs === bound.startMs || 
          bound.endMs === assignment.startMs; 
 
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
 
      assignments.set(bound.sequenceIndex, { 
        serviceId: bound.service.id, 
        staffId, 
        startMs: bound.startMs, 
        endMs: bound.endMs, 
        occupiedEndMs: bound.occupiedEndMs, 
      }); 
 
      if (backtrack(mrvIndex + 1)) { 
        return true; 
      } 
 
      assignments.delete(bound.sequenceIndex); 
    } 
 
    return false; 
  } 
 
  return backtrack(0) ? assignments : null; 
} 
 
export async function GET(request) { 
  try { 
    const { searchParams } = new URL(request.url); 
 
    const date = searchParams.get("date"); 
    const businessId = searchParams.get("business_id");
    const serviceIdsParam = 
      searchParams.get("services"); 
 
    if (!date || !businessId || !serviceIdsParam) { 
      return NextResponse.json( 
        { 
          error: 
            "Missing required query parameters: business_id, date, services", 
        }, 
        { status: 400 } 
      ); 
    } 
 
    if (!isValidDate(date)) { 
      return NextResponse.json( 
        { 
          error: 
            "Invalid date. Use a real YYYY-MM-DD calendar date.", 
        }, 
        { status: 400 } 
      ); 
    } 
 
    const serviceIds = serviceIdsParam 
      .split(",") 
      .map((value) => value.trim()) 
      .filter(Boolean); 
 
    if (serviceIds.length === 0) { 
      return NextResponse.json( 
        { 
          error: 
            "service_ids must contain at least one service ID.", 
        }, 
        { status: 400 } 
      ); 
    } 
 
    const dayOfWeek = getISTDayOfWeek(date); 
 
    // 1. Load business opening hours. 
    const { 
      data: businessHours, 
      error: businessHoursError, 
    } = await supabase 
      .from("business_hours") 
      .select("is_open, open_time, close_time") 
      .eq("business_id", businessId)
      .eq("day_of_week", dayOfWeek) 
      .maybeSingle(); 
      
 
    if (businessHoursError) { 
      console.error( 
        "Business-hours lookup failed:", 
        businessHoursError 
      ); 
 
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
 
    const businessOpenMs = getISTEpochMs( 
      date, 
      businessHours.open_time 
    ); 
 
    const businessCloseMs = getISTEpochMs( 
      date, 
      businessHours.close_time 
    ); 
 
    if (businessCloseMs <= businessOpenMs) { 
      return NextResponse.json( 
        { 
          error: 
            "Business hours are configured incorrectly.", 
        }, 
        { status: 500 } 
      ); 
    } 
 
    // 2. Load requested services. 
    const { 
      data: servicesData, 
      error: servicesError, 
    } = await supabase 
      .from("services") 
      .select( 
        "id, duration_minutes, buffer_minutes" 
      ) 
      .eq("business_id", businessId)
      .in("id", serviceIds); 
 
    if (servicesError) { 
      console.error( 
        "Service lookup failed:", 
        servicesError 
      ); 
 
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
          duration_minutes: 
            Number(service.duration_minutes || 0), 
          buffer_minutes: 
            Number(service.buffer_minutes || 0), 
        }, 
      ]) 
    ); 
 
    const orderedServices = serviceIds 
      .map((serviceId) => 
        serviceMap.get(serviceId) 
      ) 
      .filter(Boolean); 
 
    if ( 
      orderedServices.length !== serviceIds.length 
    ) { 
      return NextResponse.json( 
        { 
          error: 
            "One or more requested services are invalid.", 
        }, 
        { status: 404 } 
      ); 
    } 
 
    if ( 
      orderedServices.some( 
        (service) => 
          service.duration_minutes <= 0 
      ) 
    ) { 
      return NextResponse.json( 
        { 
          error: 
            "One or more services have an invalid duration.", 
        }, 
        { status: 500 } 
      ); 
    } 
 
    const netServiceDurationMs = 
      orderedServices.reduce( 
        (total, service) => 
          total + service.duration_minutes, 
        0 
      ) * 
      60 * 
      1000; 
 
    const finalBufferMs = 
      (orderedServices.at(-1)?.buffer_minutes || 0) * 
      60 * 
      1000; 
 
    // 3. Load qualified active staff. 
    const { 
      data: staffServicesData, 
      error: staffServicesError, 
    } = await supabase 
      .from("staff_services") 
      .select(
        "staff_id, service_id, staff!staff_services_staff_business_fkey(id, is_active, business_id)"
      )
      .eq("business_id", businessId)
      .in("service_id", serviceIds) 
     
      .eq("staff.business_id", businessId)
      .eq("staff.is_active", true); 
 
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
 
    const staffByServiceMap = new Map(); 
    const eligibleStaffIdsSet = new Set(); 
 
    for (const row of staffServicesData || []) { 
      eligibleStaffIdsSet.add(row.staff_id); 
 
      const staffIds = 
        staffByServiceMap.get(row.service_id) || []; 
 
      staffIds.push(row.staff_id); 
 
      staffByServiceMap.set( 
        row.service_id, 
        staffIds 
      ); 
    } 
 
    for (const service of orderedServices) { 
      if ( 
        !(staffByServiceMap.get(service.id) || []) 
          .length 
      ) { 
        return NextResponse.json( 
          { 
            date, 
            timezone: IST_TIMEZONE, 
            availableSlots: [], 
          }, 
          { status: 200 } 
        ); 
      } 
    } 
 
    const eligibleStaffIds = [ 
      ...eligibleStaffIdsSet, 
    ]; 
 
    if (eligibleStaffIds.length === 0) { 
      return NextResponse.json( 
        { 
          date, 
          timezone: IST_TIMEZONE, 
          availableSlots: [], 
        }, 
        { status: 200 } 
      ); 
    } 
 
    const { 
      data: staffList, 
      error: staffError, 
    } = await supabase 
      .from("staff") 
      .select("id, name") 
      
      .eq("business_id", businessId)
      .eq("is_active", true) 
      .in("id", eligibleStaffIds); 
 
    if (staffError) { 
      console.error( 
        "Staff lookup failed:", 
        staffError 
      ); 
 
      return NextResponse.json( 
        { 
          error: "Failed to fetch staff.", 
        }, 
        { status: 500 } 
      ); 
    } 
 
    // 4. Define the full IST date window. 
    const dayStartMs = getISTEpochMs( 
      date, 
      "00:00" 
    ); 
 
    const nextDayDate = new Date( 
      Date.UTC( 
        Number(date.slice(0, 4)), 
        Number(date.slice(5, 7)) - 1, 
        Number(date.slice(8, 10)) + 1 
      ) 
    ) 
      .toISOString() 
      .slice(0, 10); 
 
    const nextDayStartMs = getISTEpochMs( 
      nextDayDate, 
      "00:00" 
    ); 
 
    const queryWindowStartIso = 
      new Date(dayStartMs).toISOString(); 
 
    const queryWindowEndIso = 
      new Date(nextDayStartMs).toISOString(); 
 
    const blockedIntervalsByStaff = new Map( 
      eligibleStaffIds.map((staffId) => [ 
        staffId, 
        [], 
      ]) 
    ); 
 
    // 5. Add existing appointment blocks. 
    // Only pending and confirmed appointments 
    // consume staff capacity. 
    const { 
      data: appointmentItems, 
      error: appointmentItemsError, 
    } = await supabase 
      .from("appointment_services") 
      .select(` 
        staff_id, 
        start_time, 
        end_time, 
        buffer_minutes, 
        appointments!inner(status, business_id) 
      `) 
      .in("staff_id", eligibleStaffIds)
      .eq("appointments.business_id", businessId) 
      .in("appointments.status", [ 
        "pending", 
        "confirmed", 
      ]) 
      .lt("start_time", queryWindowEndIso) 
      .gt("end_time", queryWindowStartIso); 
 
    if (appointmentItemsError) { 
      console.error( 
        "Appointment conflict lookup failed:", 
        appointmentItemsError 
      ); 
 
      return NextResponse.json( 
        { 
          error: 
            "Failed to fetch existing appointments.", 
        }, 
        { status: 500 } 
      ); 
    } 
 
    for (const item of appointmentItems || []) { 
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
          new Date(item.end_time).getTime() + 
          Number(item.buffer_minutes || 0) * 
            60 * 
            1000, 
      }); 
    } 
 
    // 6. Add active unexpired hold blocks. 
    const nowIso = new Date().toISOString(); 
 
    const { 
      data: holdItems, 
      error: holdItemsError, 
    } = await supabase 
      .from("booking_hold_services") 
      .select(` 
        staff_id, 
        start_time, 
        end_time, 
        buffer_minutes, 
        booking_holds!inner(expires_at, status, business_id) 
      `) 
      .in("staff_id", eligibleStaffIds)
      .eq("booking_holds.business_id", businessId) 
      .eq("booking_holds.status", "active") 
      .gt( 
        "booking_holds.expires_at", 
        nowIso 
      ) 
      .lt("start_time", queryWindowEndIso) 
      .gt("end_time", queryWindowStartIso); 
 
    if (holdItemsError) { 
      console.error( 
        "Hold conflict lookup failed:", 
        holdItemsError 
      ); 
 
      return NextResponse.json( 
        { 
          error: 
            "Failed to fetch active holds.", 
        }, 
        { status: 500 } 
      ); 
    } 
 
    for (const item of holdItems || []) { 
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
          new Date(item.end_time).getTime() + 
          Number(item.buffer_minutes || 0) * 
            60 * 
            1000, 
      }); 
    } 
 
    // 7. Add non-working periods. 
    // For now, all staff follow the business hours. 
    let earliestCandidateStartMs = 
      businessOpenMs; 
 
    let latestCandidateEndMs = 
      businessCloseMs; 
 
    for (const staff of staffList || []) { 
      const blockedList = 
        blockedIntervalsByStaff.get(staff.id); 
 
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
 
    if ( 
      earliestCandidateStartMs >= 
      latestCandidateEndMs 
    ) { 
      return NextResponse.json( 
        { 
          date, 
          timezone: IST_TIMEZONE, 
          availableSlots: [], 
        }, 
        { status: 200 } 
      ); 
    } 
 
    // 8. Scan each 15-minute candidate start time. 
    const minLeadTimeMs = 
      Date.now() + 
      MINIMUM_LEAD_TIME_MINUTES * 
        60 * 
        1000; 
 
    const slotStepMs = 
      SLOT_INTERVAL_MINUTES * 
      60 * 
      1000; 
 
    const availableSlots = []; 
    console.log("DEBUG businessOpenMs:", businessOpenMs);
console.log("DEBUG businessCloseMs:", businessCloseMs);
console.log("DEBUG earliestCandidateStartMs:", earliestCandidateStartMs);
console.log("DEBUG latestCandidateEndMs:", latestCandidateEndMs);
console.log("DEBUG minLeadTimeMs:", minLeadTimeMs);
console.log("DEBUG netServiceDurationMs:", netServiceDurationMs);
console.log("DEBUG finalBufferMs:", finalBufferMs);
 
    for ( 
      let candidateStartMs = 
        earliestCandidateStartMs; 
 
      candidateStartMs + 
        netServiceDurationMs + 
        finalBufferMs <= 
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
        blockedIntervalsByStaff 
      ); 
 
      if (!assignments) { 
        continue; 
      } 
 
      const formattedTime = 
        new Intl.DateTimeFormat("en-GB", { 
          timeZone: IST_TIMEZONE, 
          hour: "2-digit", 
          minute: "2-digit", 
          hour12: false, 
        }).format( 
          new Date(candidateStartMs) 
        ); 
 
      availableSlots.push({ 
        time: formattedTime, 
 
        start_timestamp: 
          new Date( 
            candidateStartMs 
          ).toISOString(), 
 
        end_timestamp: 
          new Date( 
            candidateStartMs + 
              netServiceDurationMs 
          ).toISOString(), 
 
        occupied_until_timestamp: 
          new Date( 
            candidateStartMs + 
              netServiceDurationMs + 
              finalBufferMs 
          ).toISOString(), 
 
        assignments: [ 
          ...assignments.values(), 
        ] 
          .sort( 
            (a, b) => 
              a.startMs - b.startMs 
          ) 
          .map((assignment) => ({ 
            service_id: 
              assignment.serviceId, 
 
            staff_id: 
              assignment.staffId, 
 
            start_time: 
              new Date( 
                assignment.startMs 
              ).toISOString(), 
 
            end_time: 
              new Date( 
                assignment.endMs 
              ).toISOString(), 
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
 
    return NextResponse.json( 
      { 
        date, 
        timezone: IST_TIMEZONE, 
        businessHours: {
          isOpen: businessHours.is_open,
          openTime: businessHours.open_time,
          closeTime: businessHours.close_time,
        },
        availableSlots, 
      }, 
      { status: 200 } 
    ); 
  } catch (error) { 
    console.error( 
      "Availability API error:", 
      error 
    ); 
  
    return NextResponse.json( 
      { 
        error: 
          "Internal server error while finding availability.", 
      }, 
      { status: 500 } 
    ); 
  } 
}

