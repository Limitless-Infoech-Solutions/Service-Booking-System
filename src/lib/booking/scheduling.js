export const SLOT_INTERVAL_MINUTES = 15;
export const MINIMUM_LEAD_TIME_MINUTES = 5 * 60;
export const BUSINESS_TIMEZONE = "Asia/Kolkata";
const IST_OFFSET = "+05:30";

export function getBusinessEpochMs(dateStr, timeStr) {
  const [hours, minutes] = timeStr.split(":");
  return new Date(
    `${dateStr}T${hours.padStart(2, "0")}:${minutes.padStart(
      2,
      "0"
    )}:00${IST_OFFSET}`
  ).getTime();
}

export function getBusinessDayOfWeek(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayName = new Intl.DateTimeFormat("en-US", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
  }).format(new Date(Date.UTC(year, month - 1, day, 12, 0, 0)));
  return { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }[dayName];
}

export function isValidBookingDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [year, month, day] = dateStr.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function intervalsOverlap(aStart, aEnd, bStart, bEnd) {
  return Math.max(aStart, bStart) < Math.min(aEnd, bEnd);
}

export function allocateStaffMRV(
  orderedServices,
  slotStartMs,
  staffByServiceMap,
  staffBlockedIntervals,
  { fixedStaffByService = null, enforceAdjacentBuffers = false } = {}
) {
  const serviceBounds = [];
  let cursorMs = slotStartMs;

  for (let index = 0; index < orderedServices.length; index += 1) {
    const service = orderedServices[index];
    const startMs = cursorMs;
    const endMs = startMs + Number(service.duration_minutes) * 60_000;
    const occupiedEndMs = endMs + Number(service.buffer_minutes || 0) * 60_000;
    serviceBounds.push({
      service,
      sequenceIndex: index,
      startMs,
      endMs,
      occupiedEndMs,
    });
    cursorMs = endMs;
  }

  const indexedServices = serviceBounds
    .map((bound) => ({
      bound,
      candidateCount: (staffByServiceMap.get(bound.service.id) || []).length,
    }))
    .sort((a, b) => a.candidateCount - b.candidateCount);
  const assignments = new Map();

  function backtrack(mrvIndex) {
    if (mrvIndex === indexedServices.length) return true;
    const { bound } = indexedServices[mrvIndex];
    const eligible = staffByServiceMap.get(bound.service.id) || [];
    const fixedStaffId = fixedStaffByService?.get(bound.service.id);
    const candidates = fixedStaffByService?.has(bound.service.id)
      ? eligible.filter((id) => id === fixedStaffId)
      : eligible;

    for (const staffId of candidates) {
      const blocked = staffBlockedIntervals.get(staffId) || [];
      if (
        blocked.some((item) =>
          intervalsOverlap(
            bound.startMs,
            bound.occupiedEndMs,
            item.startMs,
            item.endMs
          )
        )
      )
        continue;

      let conflict = false;
      for (const assignment of assignments.values()) {
        if (assignment.staffId !== staffId) continue;
        const directlySequential =
          assignment.endMs === bound.startMs ||
          bound.endMs === assignment.startMs;
        const requestedEnd =
          directlySequential && !enforceAdjacentBuffers
            ? bound.endMs
            : bound.occupiedEndMs;
        const assignedEnd =
          directlySequential && !enforceAdjacentBuffers
            ? assignment.endMs
            : assignment.occupiedEndMs;
        if (
          intervalsOverlap(
            bound.startMs,
            requestedEnd,
            assignment.startMs,
            assignedEnd
          )
        ) {
          conflict = true;
          break;
        }
      }
      if (conflict) continue;

      assignments.set(bound.sequenceIndex, {
        serviceId: bound.service.id,
        staffId,
        startMs: bound.startMs,
        endMs: bound.endMs,
        occupiedEndMs: bound.occupiedEndMs,
      });
      if (backtrack(mrvIndex + 1)) return true;
      assignments.delete(bound.sequenceIndex);
    }
    return false;
  }

  return backtrack(0) ? assignments : null;
}

export function getFreeIntervals(startMs, endMs, blockedIntervals) {
  const blocked = blockedIntervals
    .map(({ startMs: start, endMs: end }) => ({
      start: Math.max(start, startMs),
      end: Math.min(end, endMs),
    }))
    .filter((item) => item.start < item.end)
    .sort((a, b) => a.start - b.start);
  const merged = [];
  for (const item of blocked) {
    const previous = merged.at(-1);
    if (previous && item.start <= previous.end)
      previous.end = Math.max(previous.end, item.end);
    else merged.push({ ...item });
  }
  const free = [];
  let cursor = startMs;
  for (const item of merged) {
    if (cursor < item.start) free.push({ startMs: cursor, endMs: item.start });
    cursor = Math.max(cursor, item.end);
  }
  if (cursor < endMs) free.push({ startMs: cursor, endMs });
  return free;
}

export const MAX_SERVICES_PER_BOOKING = 5;

export function getServiceIdsError(ids) {
  if (!Array.isArray(ids) || ids.length === 0) return "At least one service is required.";
  if (ids.some((id) => typeof id !== "string" || !id.trim())) return "service_ids must be a list of service IDs.";
  if (ids.length > MAX_SERVICES_PER_BOOKING) return `At most ${MAX_SERVICES_PER_BOOKING} services can be booked at once.`;
  if (new Set(ids).size !== ids.length) return "Each service can only be selected once.";
  return null;
}
