"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import AppointmentStatusManager from "@/components/admin/AppointmentStatusManager";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";

const TIME_ZONE = "Asia/Kolkata";
const STATUSES = [
  ["", "All statuses"],
  ["confirmed", "Confirmed"],
  ["arrived", "Arrived"],
  ["in_service", "In Service"],
  ["completed", "Completed"],
  ["cancelled", "Cancelled"],
  ["no_show", "No Show"],
];
const pad = (n) => String(n).padStart(2, "0");
const dateKey = (date) =>
  `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
const fromKey = (key) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const addDays = (key, amount) => {
  const date = fromKey(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
};
const todayInBusinessZone = () => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .map(({ type, value }) => [type, value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
};
const readableDate = (key, options) =>
  new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", ...options }).format(
    fromKey(key)
  );
const statusLabel = (status) =>
  ({ no_show: "No Show" }[status] || status?.replaceAll("_", " ") || "Unknown");

const statusClasses = {
  confirmed: "border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100",
  arrived: "border-indigo-200 bg-indigo-50 text-indigo-800 hover:bg-indigo-100",
  in_service: "border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100",
  completed: "border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100",
  cancelled: "border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
  no_show: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
};

export default function AppointmentsPage() {
  const [selectedDate, setSelectedDate] = useState(() => todayInBusinessZone());
  const [windowStart, setWindowStart] = useState(() => todayInBusinessZone());
  const [appointments, setAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [month, setMonth] = useState(() => todayInBusinessZone().slice(0, 7));
  const calendarRef = useRef(null);
  const today = todayInBusinessZone();
  const dates = Array.from({ length: 7 }, (_, index) =>
    addDays(windowStart, index)
  );

  useEffect(() => {
    const timeout = setTimeout(() => setSearchQuery(search.trim()), 250);
    return () => clearTimeout(timeout);
  }, [search]);

  const appointmentUrl = `/api/admin/appointments?${new URLSearchParams({
    date: selectedDate,
    status,
    search: searchQuery,
  })}`;
  useEffect(() => {
    const refreshAppointments = () => setRefreshKey((key) => key + 1);
    window.addEventListener("appointment-status-updated", refreshAppointments);
    return () => window.removeEventListener("appointment-status-updated", refreshAppointments);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch(appointmentUrl, { signal: controller.signal })
      .then(async (response) => ({ response, result: await response.json() }))
      .then(({ response, result }) => {
        if (!response.ok)
          throw new Error(result.error || "Failed to load appointments.");
        setAppointments(result.appointments || []);
        setError("");
      })
      .catch((loadError) => {
        if (loadError.name !== "AbortError") {
          setError(loadError.message || "Failed to load appointments.");
          setAppointments([]);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [appointmentUrl, refreshKey]);
  useEffect(() => {
    const onPointerDown = (event) => {
      if (!calendarRef.current?.contains(event.target)) setCalendarOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function selectDate(date) {
    setLoading(true);
    setSelectedDate(date);
    if (date < windowStart || date > addDays(windowStart, 6))
      setWindowStart(addDays(date, -3));
  }
  function navigateWindow(direction) {
    setLoading(true);
    const nextStart = addDays(windowStart, direction);
    setWindowStart(nextStart);
    if (selectedDate < nextStart || selectedDate > addDays(nextStart, 6))
      selectDate(
        direction > 0 ? addDays(selectedDate, 1) : addDays(selectedDate, -1)
      );
  }
  async function refreshSelectedAppointment() {
    if (!selectedAppointment?.id) return;
    setRefreshKey((key) => key + 1);
    try {
      const response = await fetch(`/api/admin/appointments/${encodeURIComponent(selectedAppointment.id)}`, { cache: "no-store" });
      const result = await response.json();
      if (response.ok && result.appointment) setSelectedAppointment(result.appointment);
    } catch (refreshError) {
      console.error("Failed to refresh appointment after status transition:", refreshError);
    }
  }
  const [year, monthNumber] = month.split("-").map(Number);
  const monthStartKey = `${month}-01`;
  const weekdayOffset = fromKey(monthStartKey).getUTCDay();
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const calendarCells = Array.from(
    { length: Math.ceil((weekdayOffset + daysInMonth) / 7) * 7 },
    (_, index) => index - weekdayOffset + 1
  );
  const monthMove = (amount) => {
    const d = new Date(Date.UTC(year, monthNumber - 1 + amount, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Appointments
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Appointments for{" "}
            {readableDate(selectedDate, {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="relative" ref={calendarRef}>
          <button
            type="button"
            aria-expanded={calendarOpen}
            onClick={() => {
              setMonth(selectedDate.slice(0, 7));
              setCalendarOpen(!calendarOpen);
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <CalendarDays size={17} className="text-blue-600" />
            {selectedDate === today ? "Today" : "Selected"} ·{" "}
            {readableDate(selectedDate, {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
            <ChevronDown size={16} />
          </button>
          {calendarOpen && (
            <div
              role="dialog"
              aria-label="Choose appointment date"
              className="absolute right-0 z-30 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-4 shadow-xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <button
                  aria-label="Previous month"
                  onClick={() => monthMove(-1)}
                  className="rounded p-1.5 hover:bg-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>
                <strong className="text-sm">
                  {readableDate(monthStartKey, {
                    month: "long",
                    year: "numeric",
                  })}
                </strong>
                <button
                  aria-label="Next month"
                  onClick={() => monthMove(1)}
                  className="rounded p-1.5 hover:bg-slate-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-400">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <span key={day} className="py-1">
                    {day}
                  </span>
                ))}
                {calendarCells.map((day, index) => {
                  if (day < 1 || day > daysInMonth) return <span key={index} />;
                  const key = `${month}-${pad(day)}`;
                  const isSelected = key === selectedDate;
                  const isToday = key === today;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        selectDate(key);
                        setCalendarOpen(false);
                      }}
                      aria-pressed={isSelected}
                      className={`h-8 rounded-full text-sm ${
                        isSelected
                          ? "bg-blue-600 font-semibold text-white"
                          : isToday
                          ? "border border-blue-500 text-blue-700"
                          : "text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  selectDate(today);
                  setMonth(today.slice(0, 7));
                  setCalendarOpen(false);
                }}
                className="mt-3 w-full rounded-lg bg-slate-50 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Today
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2">
          <button
            aria-label="Previous day"
            onClick={() => navigateWindow(-1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <ChevronLeft size={20} />
          </button>
          <div className="grid flex-1 grid-cols-4 gap-2 sm:grid-cols-7">
            {dates.map((date) => (
              <button
                key={date}
                onClick={() => selectDate(date)}
                aria-pressed={date === selectedDate}
                className={`rounded-lg px-2 py-2.5 text-center transition ${
                  date === selectedDate
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="block text-xs font-medium">
                  {readableDate(date, { weekday: "short" })}
                </span>
                <span className="mt-1 block text-sm font-semibold">
                  {readableDate(date, { day: "numeric", month: "short" })}
                </span>
              </button>
            ))}
          </div>
          <button
            aria-label="Next day"
            onClick={() => navigateWindow(1)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(event) => {
            setLoading(true);
            setStatus(event.target.value);
          }}
          aria-label="Filter appointments by status"
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-blue-400"
        >
          {STATUSES.map(([value, label]) => (
            <option value={value} key={value || "all"}>
              {label}
            </option>
          ))}
        </select>
        <span className="text-sm text-slate-500">
          {loading
            ? "Loading…"
            : `${appointments.length} ${
                appointments.length === 1 ? "appointment" : "appointments"
              }`}
        </span>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
        >
          {error}
        </div>
      ) : loading && !appointments.length ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Loading appointments…
        </div>
      ) : appointments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-medium text-slate-700">No appointments found</p>
          <p className="mt-1 text-sm text-slate-500">
            Try another date or adjust your search and filters.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const staffNames = [
              ...new Set(
                (appointment.appointment_services || [])
                  .map((item) => item.staff?.name)
                  .filter(Boolean)
              ),
            ];
            return (
              <article
                key={appointment.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                  <div className="min-w-40">
                    <h2 className="font-semibold text-slate-900">
                      {appointment.customers?.name || "Unknown customer"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      {appointment.customers?.phone || "No phone number"}
                    </p>
                  </div>
                  <div className="text-sm text-slate-600">
                    {new Date(appointment.start_time).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: TIME_ZONE,
                      }
                    )}{" "}
                    –{" "}
                    {new Date(appointment.end_time).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                        timeZone: TIME_ZONE,
                      }
                    )}
                  </div>
                  <div className="text-sm text-slate-600">
                    {staffNames.join(", ") || "Unassigned"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAppointment(appointment)}
                    aria-label={`Manage status for ${appointment.customers?.name || "appointment"}: ${statusLabel(appointment.status)}`}
                    className={`inline-flex h-10 min-w-[120px] items-center justify-center rounded-lg border px-4 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                      statusClasses[appointment.status] || "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {statusLabel(appointment.status)}
                  </button>
                  <div className="font-semibold text-slate-900">
                    ₹
                    {Number(appointment.total_amount || 0).toLocaleString(
                      "en-IN"
                    )}
                  </div>
                  <Link
                    href={`/admin/appointments/${appointment.id}`}
                    className="w-fit rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    View Details
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {selectedAppointment && <AppointmentStatusManager
        key={selectedAppointment.id}
        appointment={selectedAppointment}
        presentation="modal"
        onUpdated={refreshSelectedAppointment}
        onClose={() => setSelectedAppointment(null)}
      />}
    </div>
  );
}
