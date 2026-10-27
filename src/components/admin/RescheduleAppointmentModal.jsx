"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, X } from "lucide-react";
import toast from "react-hot-toast";
import ServiceSelectionStep from "@/components/bookings/ServiceSelectionStep";
import DateTimeStep from "@/components/bookings/DateTimeStep";
import StaffAssignmentModal from "@/components/bookings/StaffAssignmentModal";

function businessDate(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date(value));
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function businessTime(value) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value));
}

function dateFromBusinessDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", year: "numeric",
  }).format(new Date(value));
}

function timeLabel(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(value));
}

function serviceKey(value) {
  return value == null ? "" : String(value);
}

export default function RescheduleAppointmentModal({ appointment, onClose, onUpdated }) {
  const [services, setServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(() => dateFromBusinessDate(businessDate(appointment.start_time)));
  const [selectedTime, setSelectedTime] = useState(() => businessTime(appointment.start_time));
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [staffState, setStaffState] = useState({ loading: false, options: [], error: "" });
  const [phase, setPhase] = useState("preview");
  const [editStep, setEditStep] = useState("services");
  const [assignmentOpen, setAssignmentOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hold, setHold] = useState(null);
  const [error, setError] = useState("");
  const requestRef = useRef(false);

  const originalServices = useMemo(() => [...(appointment.appointment_services || [])]
    .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
    .map((item) => ({
    id: item.service_id,
    name: item.services?.name || "Service",
    price: Number(item.price || 0),
    duration: Number(item.duration_minutes || 0),
    buffer: Number(item.buffer_minutes || 0),
    staffName: item.staff?.name || "Unassigned",
  })), [appointment]);
  const originalTotal = Number(appointment.total_amount || 0);
  const proposedTotal = selectedServices.reduce((sum, item) => sum + Number(item.price || 0), 0);
  const categories = useMemo(() => ["All", ...new Set(services.map((item) => item.category).filter(Boolean))], [services]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const filteredServices = useMemo(() => services.filter((item) =>
    (category === "All" || item.category === category) &&
    `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase())
  ), [services, category, search]);
  const selectedServiceIds = [...new Map(selectedServices.map((item) => [serviceKey(item.id), item.id])).values()];
  const unavailableSelectedServices = selectedServices.filter((item) =>
    !services.some((service) => serviceKey(service.id) === serviceKey(item.id))
  );

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch("/api/services?mode=admin", { cache: "no-store" });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Unable to load services.");
        if (!active) return;
        const available = data.map((service) => ({
          id: service.id, name: service.name, description: service.description || "",
          category: service.category || "Other", price: Number(service.price),
          duration: Number(service.duration_minutes), buffer: Number(service.buffer_minutes || 0),
          image: service.image || "", badge: service.badge || null,
        }));
        setServices(available);
        const chosenById = new Map();
        for (const item of appointment.appointment_services || []) {
          const key = serviceKey(item.service_id);
          if (!key || chosenById.has(key)) continue;
          chosenById.set(key, available.find((service) => serviceKey(service.id) === key) || {
            id: item.service_id, name: item.services?.name || "Unavailable service",
            description: item.services?.description || "", category: "Current appointment",
            price: Number(item.price), duration: Number(item.duration_minutes), buffer: Number(item.buffer_minutes || 0),
            image: item.services?.image || "", badge: item.services?.badge || null,
            unavailable: true,
          });
        }
        setSelectedServices([...chosenById.values()]);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load services.");
      } finally {
        if (active) setServicesLoading(false);
      }
    })();
    return () => { active = false; };
  }, [appointment]);

  const releaseHold = useCallback(async ({ keepalive = false } = {}) => {
    if (!hold?.holdId) return true;
    try {
      const response = await fetch("/api/bookings/hold", {
        method: "DELETE", keepalive,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hold_id: hold.holdId, admin_mode: true,
          reschedule_appointment_id: appointment.id,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || "Could not release the hold.");
      setHold(null);
      return true;
    } catch (releaseError) {
      if (!keepalive) setError(releaseError.message || "Could not release the hold. It will expire automatically in five minutes.");
      return false;
    }
  }, [appointment.id, hold]);

  useEffect(() => {
    if (!hold?.holdId) return undefined;
    const releaseOnHide = () => { void releaseHold({ keepalive: true }); };
    window.addEventListener("pagehide", releaseOnHide);
    return () => window.removeEventListener("pagehide", releaseOnHide);
  }, [hold, releaseHold]);

  const changeServices = async (service) => {
    const key = serviceKey(service.id);
    const isSelected = selectedServices.some((item) => serviceKey(item.id) === key);
    if (!isSelected && selectedServices.length >= 5) {
      toast.error("You can select a maximum of 5 services per booking.");
      setError("You can select a maximum of 5 services per booking.");
      return;
    }
    if (hold && !(await releaseHold())) return;
    setError("");
    setSelectedSlot(null);
    setSelectedTime(null);
    setSelectedServices((current) => {
      if (current.some((item) => serviceKey(item.id) === key)) {
        return current.filter((item) => serviceKey(item.id) !== key);
      }
      if (current.length >= 5) return current;
      return [...current, service];
    });
  };

  const chooseDate = async (date) => {
    if (hold && !(await releaseHold())) return;
    setSelectedDate(date);
    setSelectedTime(null);
    setSelectedSlot(null);
    setError("");
  };

  const chooseTime = (time, slot = null) => {
    setSelectedTime(time);
    setSelectedSlot(slot);
    setError("");
  };

  const refreshAndOpenAssignments = async () => {
    if (servicesLoading || !selectedServices.length || selectedServices.length > 5 || unavailableSelectedServices.length > 0 || !selectedDate || !selectedTime) {
      setError("Choose one to five services, a date, and an available time.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const date = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      const query = new URLSearchParams({
        mode: "admin", date, services: selectedServiceIds.join(","), time: selectedTime,
        reschedule_appointment_id: appointment.id,
      });
      const response = await fetch(`/api/services/availability?${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to refresh availability.");
      const slot = (data.availableSlots || []).find((item) => item.time === selectedTime);
      if (!slot) throw new Error("That time is no longer available. Choose another slot.");
      setSelectedSlot(slot);
      setStaffState({ loading: false, options: data.staffAvailability || [], error: "" });
      setAssignmentOpen(true);
    } catch (requestError) {
      setError(requestError.message || "Unable to verify the selected time.");
    } finally {
      setBusy(false);
    }
  };

  const createHold = async (_mode, staffAssignments) => {
    if (requestRef.current) return;
    requestRef.current = true;
    setBusy(true);
    setError("");
    try {
      const date = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
      const response = await fetch("/api/bookings/hold", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admin_mode: true, reschedule_appointment_id: appointment.id,
          service_ids: selectedServiceIds, date, time: selectedTime,
          ...(staffAssignments ? { staff_assignments: staffAssignments } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to reserve this reschedule.");
      setHold({ holdId: data.holdId, expiresAt: data.expiresAt, allocations: data.allocations || [] });
      setAssignmentOpen(false);
      setPhase("review");
    } catch (requestError) {
      setError(requestError.message || "Unable to create the reschedule hold.");
    } finally {
      setBusy(false);
      requestRef.current = false;
    }
  };

  const confirm = async () => {
    if (!hold?.holdId || requestRef.current) return;
    requestRef.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/appointments/confirm", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_mode: true, hold_id: hold.holdId, reschedule_appointment_id: appointment.id }),
      });
      const data = await response.json();
      if (!response.ok || data.appointment_id !== appointment.id) {
        throw new Error(data.error || "The reschedule could not be confirmed.");
      }
      setHold(null);
      toast.success("Appointment rescheduled.");
      await onUpdated();
      onClose();
    } catch (confirmError) {
      // The response can be lost after the database commits. Refresh before
      // allowing another confirmation or suggesting a replacement hold.
      try {
        const refresh = await fetch(`/api/admin/appointments/${appointment.id}`, { cache: "no-store" });
        const current = await refresh.json();
        const latest = current.appointment;
        const expectedDate = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
        const latestIds = (latest?.appointment_services || []).map((item) => item.service_id).sort();
        const expectedStaff = new Map((hold?.allocations || []).map((item) => [item.service_id, item.staff_id]));
        const staffMatches = (latest?.appointment_services || []).length === expectedStaff.size &&
          latest.appointment_services.every((item) => expectedStaff.get(item.service_id) === item.staff_id);
        if (latest && businessDate(latest.start_time) === expectedDate && businessTime(latest.start_time) === selectedTime &&
            latest.status === appointment.status && Number(latest.total_amount) === proposedTotal &&
            latestIds.join(",") === [...selectedServiceIds].sort().join(",") && staffMatches) {
          setHold(null);
          toast.success("Appointment rescheduled.");
          await onUpdated();
          onClose();
          return;
        }
      } catch {
        // Keep the hold ID visible; the admin can retry after checking state.
      }
      setError(confirmError.message || "Unable to confirm. Appointment details were refreshed; do not create another hold until the state is clear.");
    } finally {
      setBusy(false);
      requestRef.current = false;
    }
  };

  const cancel = async () => {
    if (busy) return;
    if (hold && !(await releaseHold())) return;
    onClose();
  };

  const startTimeISO = selectedSlot?.start_timestamp || null;
  const endTimeISO = selectedSlot?.end_timestamp || null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/60 p-3 sm:p-6" role="presentation">
      <section role="dialog" aria-modal="true" aria-labelledby="reschedule-title" className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Appointment {appointment.id}</p>
            <h2 id="reschedule-title" className="mt-1 text-xl font-semibold text-slate-900">{phase === "preview" ? "Schedule" : phase === "review" ? "Review reschedule" : "Edit schedule"}</h2>
          </div>
          <button type="button" aria-label="Close reschedule dialog" onClick={cancel} disabled={busy} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-50"><X className="h-5 w-5" /></button>
        </header>

        <div className="space-y-6 p-5 sm:p-7">
          {phase === "preview" && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><CalendarDays className="h-4 w-4" /> Current schedule</p>
                  <p className="mt-3 text-sm text-slate-600">{dateLabel(appointment.start_time)}</p>
                  <p className="mt-1 text-sm text-slate-600">{timeLabel(appointment.start_time)} – {timeLabel(appointment.end_time)}</p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Clock3 className="h-4 w-4" /> Current total</p>
                  <p className="mt-3 text-2xl font-bold text-slate-900">₹{originalTotal}</p>
                  <p className="mt-1 text-sm text-slate-500">{originalServices.length} service{originalServices.length === 1 ? "" : "s"}</p>
                </div>
              </div>
              <div className="rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3 font-semibold text-slate-800">Current services</div>
                {originalServices.map((item) => <div key={item.id} className="flex flex-wrap justify-between gap-2 border-b last:border-0 border-slate-100 px-4 py-3 text-sm"><span className="font-medium">{item.name} · {item.duration} min · {item.staffName}</span><span>₹{item.price}</span></div>)}
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={cancel} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium">Cancel</button>
                <button onClick={() => { setPhase("edit"); setEditStep("services"); }} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white">Edit appointment</button>
              </div>
            </>
          )}

          {phase === "edit" && (
            <>
              <div className="flex gap-2 border-b border-slate-200 pb-3">
                <button onClick={() => setEditStep("services")} className={`rounded-full px-4 py-2 text-sm ${editStep === "services" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>Services ({selectedServices.length}/5)</button>
                <button onClick={() => setEditStep("schedule")} disabled={!selectedServices.length} className={`rounded-full px-4 py-2 text-sm ${editStep === "schedule" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700"}`}>Date & time</button>
              </div>
              {editStep === "services" ? (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{selectedServices.length} of 5 services selected</p>
                      <p className="mt-0.5 text-xs text-slate-500">Choose services, then set the new date and time.</p>
                    </div>
                    <p className="text-base font-bold text-slate-900">₹{proposedTotal}</p>
                  </div>
                  {unavailableSelectedServices.length > 0 && (
                    <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm font-semibold text-amber-900">Some current services can’t be booked now</p>
                      <p className="mt-1 text-xs leading-5 text-amber-800">They may be inactive or have no eligible staff assigned. Remove them to continue, or make them bookable in Services first.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {unavailableSelectedServices.map((item) => (
                          <button key={serviceKey(item.id)} type="button" onClick={() => changeServices(item)} className="rounded-full border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100">
                            Remove {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  <ServiceSelectionStep
                    eyebrow="Reschedule appointment" title="Choose services"
                    description="Keep the current services or update them before choosing a new time."
                    categories={categories} activeCategory={category} onCategoryChange={setCategory}
                    searchQuery={search} onSearchChange={setSearch} filteredServices={filteredServices}
                    selectedServices={selectedServices} onSelectService={changeServices}
                    isLoadingServices={servicesLoading} limitNotice={selectedServices.length >= 5 ? "You can select up to 5 services. Remove one to add another." : ""} maxServices={5}
                  />
                </>
              ) : (
                <DateTimeStep
                  selectedDate={selectedDate} selectedTime={selectedTime} selectedSlot={selectedSlot}
                  onSelectDate={chooseDate} onSelectTime={chooseTime}
                  serviceIds={selectedServiceIds} adminMode rescheduleAppointmentId={appointment.id}
                  onAssignmentOptionsChange={setStaffState}
                />
              )}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                <p className="text-sm font-semibold text-slate-700">Proposed total: ₹{proposedTotal}</p>
                <div className="flex gap-3">
                  <button onClick={() => setPhase("preview")} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Back</button>
                  {editStep === "services" ? <button onClick={() => setEditStep("schedule")} disabled={!selectedServices.length || unavailableSelectedServices.length > 0} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">Choose date & time</button> : <button onClick={refreshAndOpenAssignments} disabled={busy || staffState.loading || !selectedDate || !selectedTime || unavailableSelectedServices.length > 0} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Checking…" : "Review changes"}</button>}
                </div>
              </div>
            </>
          )}

          {phase === "review" && hold && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4"><p className="font-semibold">Before</p><p className="mt-2 text-sm">{dateLabel(appointment.start_time)} · {timeLabel(appointment.start_time)}–{timeLabel(appointment.end_time)}</p><p className="mt-1 text-sm">{originalServices.map((item) => item.name).join(", ")}</p><p className="mt-2 font-semibold">₹{originalTotal}</p></div>
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4"><p className="font-semibold">Proposed</p><p className="mt-2 text-sm">{selectedDate?.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })} · {selectedTime}{startTimeISO && endTimeISO ? `–${timeLabel(endTimeISO)}` : ""}</p><p className="mt-1 text-sm">{selectedServices.map((item) => item.name).join(", ")}</p><p className="mt-2 font-semibold">₹{proposedTotal}</p></div>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="font-semibold">Proposed services and staff</p>
                {hold.allocations.map((allocation) => <p key={allocation.service_id} className="mt-2 text-sm text-slate-700">{selectedServices.find((item) => item.id === allocation.service_id)?.name || "Service"} · {staffState.options.find((item) => item.staff_id === allocation.staff_id)?.name || allocation.staff_id}</p>)}
                <p className="mt-3 text-xs text-amber-800">This reservation expires at {new Date(hold.expiresAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}. Confirm before it expires.</p>
              </div>
              <div className="flex justify-end gap-3"><button onClick={async () => { if (await releaseHold()) { setPhase("edit"); setEditStep("schedule"); } }} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Change proposal</button><button onClick={cancel} disabled={busy} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Cancel</button><button onClick={confirm} disabled={busy} className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Confirming…" : "Confirm reschedule"}</button></div>
            </>
          )}
          {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>}
        </div>
        {assignmentOpen && <StaffAssignmentModal
          services={selectedServices} staffAvailability={staffState.options}
          automaticAssignments={selectedSlot?.assignments || []}
          onCancel={() => setAssignmentOpen(false)} onConfirm={createHold} isSaving={busy}
        />}
      </section>
    </div>
  );
}
