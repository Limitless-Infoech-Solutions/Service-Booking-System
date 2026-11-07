"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, CalendarDays, Mail, Phone } from "lucide-react";

const TIME_ZONE = "Asia/Kolkata";
const FILTERS = [
  ["all", "All"],
  ["upcoming", "Upcoming"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["no_show", "No-show"],
  ["rescheduled", "Rescheduled"],
  ["booked_again", "Booked Again"],
];

const STATUS_LABELS = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  in_service: "In Service",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const STATUS_STYLES = {
  confirmed: "border-blue-200 bg-blue-50 text-blue-800",
  arrived: "border-indigo-200 bg-indigo-50 text-indigo-800",
  in_service: "border-violet-200 bg-violet-50 text-violet-800",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800",
  no_show: "border-slate-200 bg-slate-100 text-slate-700",
};

function formatDate(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(date);
}

function formatTime(value) {
  const date = new Date(value);
  if (!value || Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TIME_ZONE,
  }).format(date);
}

function bookingSourceLabel(source) {
  return {
    online: "Online booking",
    admin: "Admin booking",
    walk_in: "Walk-in",
  }[source] || (source ? source.replaceAll("_", " ") : "Booking source unavailable");
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const customerId = params?.customer_id;
  const [customer, setCustomer] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [historyEventsAvailable, setHistoryEventsAvailable] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadCustomerHistory = useCallback(async (signal) => {
    if (!customerId) return;
    setLoading(true);
    setError("");

    try {
      const encodedId = encodeURIComponent(customerId);
      const [customerResponse, appointmentsResponse] = await Promise.all([
        fetch(`/api/admin/customers?customer_id=${encodedId}`, {
          signal,
          cache: "no-store",
        }),
        fetch(`/api/admin/appointments?customer_id=${encodedId}`, {
          signal,
          cache: "no-store",
        }),
      ]);
      const [customerResult, appointmentsResult] = await Promise.all([
        customerResponse.json(),
        appointmentsResponse.json(),
      ]);

      if (!customerResponse.ok) {
        throw new Error(customerResult.error || "Failed to load customer.");
      }
      if (!appointmentsResponse.ok) {
        throw new Error(appointmentsResult.error || "Failed to load appointments.");
      }

      setCustomer(customerResult.customer);
      setAppointments(appointmentsResult.appointments || []);
      setHistoryEventsAvailable(appointmentsResult.historyEventsAvailable !== false);
    } catch (loadError) {
      if (loadError.name !== "AbortError") {
        setError(loadError.message || "Failed to load customer details.");
        setCustomer(null);
        setAppointments([]);
        setHistoryEventsAvailable(false);
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => loadCustomerHistory(controller.signal));
    return () => controller.abort();
  }, [loadCustomerHistory]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(interval);
  }, []);

  const statistics = useMemo(() => {
    const counts = {
      total: appointments.length,
      completed: 0,
      cancelled: 0,
      no_show: 0,
      upcoming: 0,
      arrived: 0,
      in_service: 0,
    };
    for (const appointment of appointments) {
      if (Object.hasOwn(counts, appointment.status)) counts[appointment.status] += 1;
      if (
        appointment.status === "confirmed" &&
        new Date(appointment.start_time).getTime() > now
      ) {
        counts.upcoming += 1;
      }
    }
    return counts;
  }, [appointments, now]);

  const filteredAppointments = useMemo(() => appointments.filter((appointment) => {
    const eventTypes = appointment.history_event_types || [];
    switch (selectedFilter) {
      case "upcoming":
        return appointment.status === "confirmed" && new Date(appointment.start_time).getTime() > now;
      case "completed":
      case "cancelled":
      case "no_show":
        return appointment.status === selectedFilter;
      case "rescheduled":
      case "booked_again":
        return eventTypes.includes(selectedFilter);
      default:
        return true;
    }
  }), [appointments, now, selectedFilter]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin/customers"
          className="mb-6 inline-flex items-center gap-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <ArrowLeft size={17} /> Back to Customers
        </Link>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading customer details…
          </div>
        ) : error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            {error}
          </div>
        ) : customer ? (
          <>
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <CalendarDays size={23} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-500">Customer</p>
                  <h1 className="text-2xl font-bold tracking-tight">{customer.name || "Unnamed customer"}</h1>
                </div>
              </div>
              <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
                <p className="flex min-w-0 items-center gap-2"><Phone size={16} className="shrink-0 text-slate-400" />{customer.phone || "No phone number"}</p>
                <p className="flex min-w-0 items-center gap-2 break-all"><Mail size={16} className="shrink-0 text-slate-400" />{customer.email || "No email provided"}</p>
              </div>
            </section>

            <section aria-label="Appointment statistics" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              <StatCard label="Total Appointments" value={statistics.total} />
              <StatCard label="Completed" value={statistics.completed} />
              <StatCard label="Cancelled" value={statistics.cancelled} />
              <StatCard label="No-show" value={statistics.no_show} />
              <StatCard label="Upcoming" value={statistics.upcoming} />
              <StatCard label="Arrived" value={statistics.arrived} />
              <StatCard label="In Service" value={statistics.in_service} />
            </section>

            <section aria-labelledby="customer-history-heading">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 id="customer-history-heading" className="text-xl font-semibold">Appointment History</h2>
                  <p className="mt-1 text-sm text-slate-500">{appointments.length} {appointments.length === 1 ? "appointment" : "appointments"}</p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2" aria-label="Filter appointment history">
                {FILTERS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selectedFilter === value}
                    disabled={
                      !historyEventsAvailable &&
                      ["rescheduled", "booked_again"].includes(value)
                    }
                    onClick={() => setSelectedFilter(value)}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${selectedFilter === value ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
{ /*
              {!historyEventsAvailable && (

                <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Rescheduled and Booked Again event information is unavailable right now.
                </p>
              )}
  */}
              {appointments.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
                  <p className="font-medium text-slate-700">No appointments yet</p>
                  <p className="mt-1 text-sm text-slate-500">Appointments for this customer will appear here.</p>
                </div>
              ) : filteredAppointments.length === 0 ? (
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  No appointments match this filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredAppointments.map((appointment) => {
                    const serviceNames = [...new Set((appointment.appointment_services || [])
                      .map((item) => item.services?.name)
                      .filter(Boolean))];
                    const eventTypes = appointment.history_event_types || [];
                    return (
                      <Link
                        key={appointment.id}
                        href={`/admin/appointments/${encodeURIComponent(appointment.id)}`}
                        className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-semibold text-slate-900">{formatDate(appointment.start_time)}</h3>
                              <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[appointment.status] || "border-slate-200 bg-slate-100 text-slate-700"}`}>
                                {STATUS_LABELS[appointment.status] || appointment.status?.replaceAll("_", " ") || "Unknown"}
                              </span>
                              {eventTypes.includes("rescheduled") && <span className="rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">Rescheduled</span>}
                              {eventTypes.includes("booked_again") && <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">Booked Again</span>}
                            </div>
                            <p className="mt-1 text-sm text-slate-600">{formatTime(appointment.start_time)} – {formatTime(appointment.end_time)}</p>
                          </div>
                          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                            {bookingSourceLabel(appointment.booking_source)}
                          </span>
                        </div>
                        <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
                          <p><span className="font-medium text-slate-800">Services:</span> {serviceNames.join(", ") || "No service details available"}</p>
                          <p className="mt-1"><span className="font-medium text-slate-800">Staff:</span> {[...new Set((appointment.appointment_services || []).map((item) => item.staff?.name).filter(Boolean))].join(", ") || "Unassigned"}</p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}
