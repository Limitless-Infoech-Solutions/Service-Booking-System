"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Pencil,
  UserRound,
} from "lucide-react";
import StaffServicesModal from "@/components/admin/StaffServicesModal";

const TIME_ZONE = "Asia/Kolkata";
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatAppointmentDate(value, options = {}) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    dateStyle: "medium",
    ...options,
  }).format(new Date(value));
}

function formatAppointmentTime(value) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatBusinessTime(value) {
  if (!value) return "—";
  const [hour, minute] = value.split(":").map(Number);
  const date = new Date(Date.UTC(2020, 0, 1, hour, minute));
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(date);
}

function AppointmentList({ period, data, loading, error, page, onPageChange }) {
  const appointments = data?.appointments || [];
  const pagination = data?.pagination || { total: 0, total_pages: 0 };

  if (loading) return <div className="flex items-center justify-center gap-3 py-12 text-sm text-gray-500"><LoaderCircle size={20} className="animate-spin text-[#1e9be0]" />Loading appointments...</div>;
  if (error) return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>;
  if (!appointments.length) return <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center"><CalendarClock size={25} className="mx-auto text-gray-400" /><p className="mt-3 text-sm font-medium text-gray-700">No {period} appointments found.</p></div>;

  return <>
    <div className="space-y-3">
      {appointments.map((appointment) => {
        const serviceItems = appointment.appointment_services || [];
        const serviceNames = [...new Set(serviceItems.map((item) => item.services?.name).filter(Boolean))];
        const duration = serviceItems.reduce((total, item) => total + Number(item.duration_minutes || 0), 0);
        return <article key={appointment.id} className="rounded-xl border border-gray-200 p-4 sm:flex sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="font-semibold">{formatAppointmentDate(appointment.start_time)} · {formatAppointmentTime(appointment.start_time)}–{formatAppointmentTime(appointment.end_time)}</p>
            <p className="mt-1 text-sm text-gray-700">{appointment.customers?.name || "Customer"}</p>
            <p className="mt-1 text-sm text-gray-500">{serviceNames.length ? serviceNames.join(", ") : "Service details unavailable"} · {duration || "—"} min</p>
            <p className="mt-1 text-xs capitalize text-gray-500">Status: {String(appointment.status || "unknown").replaceAll("_", " ")}</p>
          </div>
          <a href={`/admin/appointments/${encodeURIComponent(appointment.id)}`} className="mt-3 inline-flex shrink-0 items-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:mt-0">View appointment</a>
        </article>;
      })}
    </div>
    <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-gray-500">{pagination.total} appointment{pagination.total === 1 ? "" : "s"}</p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <span className="text-sm text-gray-600">Page {page} of {pagination.total_pages || 1}</span>
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft size={16} />Previous</button>
        <button type="button" disabled={page >= (pagination.total_pages || 1)} onClick={() => onPageChange(page + 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40">Next<ChevronRight size={16} /></button>
      </div>
    </div>
  </>;
}

export default function StaffDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.staff_id;
  const [staff, setStaff] = useState(null);
  const [businessHours, setBusinessHours] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState("upcoming");
  const [upcomingPage, setUpcomingPage] = useState(1);
  const [pastPage, setPastPage] = useState(1);
  const [upcomingData, setUpcomingData] = useState(null);
  const [pastData, setPastData] = useState(null);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState("");
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const page = activeTab === "upcoming" ? upcomingPage : pastPage;
  const appointmentData = activeTab === "upcoming" ? upcomingData : pastData;

  const loadDetails = useCallback(async () => {
    const response = await fetch(`/api/admin/staff/${encodeURIComponent(staffId)}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Failed to load staff details.");
    setStaff(result.staff);
    setBusinessHours(result.business_hours || []);
  }, [staffId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        setDetailsLoading(true);
        setError("");
        await loadDetails();
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Failed to load staff details.");
      } finally {
        if (!cancelled) setDetailsLoading(false);
      }
    }
    if (staffId) run();
    return () => { cancelled = true; };
  }, [staffId, loadDetails, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    async function loadAppointments() {
      if (!staffId) return;
      setAppointmentsLoading(true);
      setAppointmentsError("");
      try {
        const response = await fetch(
          `/api/admin/staff/${encodeURIComponent(staffId)}/appointments?period=${activeTab}&page=${page}`,
          { cache: "no-store" }
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to load appointments.");
        if (cancelled) return;
        const totalPages = result.pagination?.total_pages || 0;
        if ((totalPages > 0 && page > totalPages) || (totalPages === 0 && page > 1)) {
          const safePage = Math.max(1, totalPages);
          if (activeTab === "upcoming") setUpcomingPage(safePage);
          else setPastPage(safePage);
          return;
        }
        if (activeTab === "upcoming") setUpcomingData(result);
        else setPastData(result);
      } catch (loadError) {
        if (!cancelled) setAppointmentsError(loadError.message || "Failed to load appointments.");
      } finally {
        if (!cancelled) setAppointmentsLoading(false);
      }
    }
    loadAppointments();
    return () => { cancelled = true; };
  }, [staffId, activeTab, page, refreshKey]);

  async function toggleActivation() {
    setUpdating(true);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/staff/${encodeURIComponent(staffId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !staff.is_active }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update staff activation.");
      setStaff((current) => ({ ...current, ...result.staff }));
    } catch (updateError) {
      setActionError(updateError.message || "Could not update staff activation.");
    } finally {
      setUpdating(false);
    }
  }

  if (detailsLoading) return <main className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-gray-500"><LoaderCircle className="animate-spin text-[#1e9be0]" />Loading staff profile...</main>;

  return <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 text-[#0b0e14] sm:px-8">
    <div className="mx-auto max-w-6xl">
      <button type="button" onClick={() => router.push("/admin/staff")} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1e9be0]"><ArrowLeft size={17} />Back to staff</button>
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
      {staff && <>
        <section className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7 ${staff.is_active ? "" : "grayscale bg-gray-100"}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-4">
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${staff.is_active ? "bg-blue-50 text-[#1e9be0]" : "bg-gray-200 text-gray-500"}`}><UserRound size={25} /></div>
              <div><h1 className="text-2xl font-bold">{staff.name}</h1><p className="mt-1 text-gray-500">{staff.role || "No role specified"}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className={`rounded-full px-2.5 py-1 font-medium ${staff.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>{staff.is_active ? "Active" : "Inactive"}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium ${staff.status === "completed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{staff.status === "completed" ? <CheckCircle2 size={13} /> : <Clock3 size={13} />}{staff.status === "completed" ? "Completed" : "Incomplete"}</span>
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 font-medium text-gray-600">{staff.assigned_services_count} services assigned</span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => router.push(`/admin/staff/${encodeURIComponent(staffId)}/edit`)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"><Pencil size={15} />Edit</button>
              <button type="button" onClick={() => setSelectedStaff(staff)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50">Manage Services</button>
              <button type="button" disabled={updating} onClick={toggleActivation} className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${staff.is_active ? "border border-gray-200 text-gray-700" : "bg-[#0b0e14] text-white"}`}>{updating ? "Saving..." : staff.is_active ? "Deactivate" : "Reactivate"}</button>
            </div>
          </div>
        </section>

        {actionError && <div role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex items-center gap-3"><Clock3 size={19} className="text-[#1e9be0]" /><div><h2 className="font-semibold">Business working hours</h2><p className="text-xs text-gray-500">Staff follows the business schedule · Asia/Kolkata</p></div></div>
          {businessHours.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{businessHours.map((hours) => {
            const dayKey = String(hours.day_of_week);
            const dayName = /^\d$/.test(dayKey) ? DAY_NAMES[Number(dayKey)] : dayKey;
            return <div key={dayKey} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-sm"><span>{dayName}</span><span className="text-gray-500">{hours.is_open ? `${formatBusinessTime(hours.open_time)} – ${formatBusinessTime(hours.close_time)}` : "Closed"}</span></div>;
          })}</div> : <p className="mt-4 text-sm text-gray-500">No business hours are configured.</p>}
          <p className="mt-3 text-xs leading-5 text-gray-500">Business hours describe opening times. Appointment conflicts, buffers, service assignments, and activation state still determine booking availability.</p>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div><div className="flex items-center gap-2"><BriefcaseBusiness size={18} className="text-[#1e9be0]" /><h2 className="font-semibold">Assigned services</h2></div><p className="mt-1 text-sm text-gray-500">{staff.assigned_services_count} service{staff.assigned_services_count === 1 ? "" : "s"} linked to this staff member.</p></div>
            <button type="button" onClick={() => setSelectedStaff(staff)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50">Manage Services</button>
          </div>
        </section>

        <section className="mt-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="border-b border-gray-100">
            <div role="tablist" aria-label="Appointment history" className="flex gap-6">
              {["upcoming", "past"].map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`border-b-2 px-1 pb-3 text-sm font-semibold capitalize ${activeTab === tab ? "border-[#1e9be0] text-[#1e9be0]" : "border-transparent text-gray-500 hover:text-gray-800"}`}>{tab}</button>)}
            </div>
          </div>
          <div className="pt-5">
            <AppointmentList period={activeTab} data={appointmentData} loading={appointmentsLoading} error={appointmentsError} page={page} onPageChange={(nextPage) => activeTab === "upcoming" ? setUpcomingPage(nextPage) : setPastPage(nextPage)} />
          </div>
        </section>
      </>}
    </div>
    {selectedStaff && <StaffServicesModal staff={selectedStaff} returnTo={`/admin/staff/${staffId}`} onClose={() => setSelectedStaff(null)} onSaved={() => setRefreshKey((current) => current + 1)} />}
  </main>;
}
