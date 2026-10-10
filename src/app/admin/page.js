"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Users,
  Clock3,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ArrowUpRight,
  Phone,
  IndianRupee,
  CalendarCheck,
  AlertCircle,
} from "lucide-react";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

const TIME_ZONE = "Asia/Kolkata";

// Returns today's date in India as YYYY-MM-DD.
function getTodayInIndia() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
}

// Adds calendar days without relying on the browser's local timezone.
function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00Z`);

  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

// Formats appointment timestamps in India time.
function formatTime(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(`${dateString}T12:00:00Z`);

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatCurrency(amount) {
  const value = Number(amount);

  if (!Number.isFinite(value)) return "—";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function getStatusStyle(status) {
  const normalizedStatus = String(status || "").toLowerCase();

  if (
    normalizedStatus === "confirmed" ||
    normalizedStatus === "completed"
  ) {
    return "bg-green-50 text-green-700";
  }

  if (
    normalizedStatus === "pending" ||
    normalizedStatus === "pending_confirmation"
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    normalizedStatus === "cancelled" ||
    normalizedStatus === "canceled"
  ) {
    return "bg-red-50 text-red-700";
  }

  return "bg-slate-100 text-slate-600";
}

function getCustomerName(appointment) {
  return appointment.customers?.name || "Unknown customer";
}

function getCustomerPhone(appointment) {
  return appointment.customers?.phone || "";
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  iconClass,
  loading,
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-3 text-3xl font-semibold tracking-tight text-[#0b0e14]">
            {loading ? (
              <span className="inline-block h-9 w-16 animate-pulse rounded bg-slate-100" />
            ) : (
              value
            )}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">{description}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [todayAppointments, setTodayAppointments] = useState([]);
  const [selectedAppointments, setSelectedAppointments] = useState([]);
  const [upcomingAppointments, setUpcomingAppointments] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Initialize dates in the business timezone.
  useEffect(() => {
    const currentDate = getTodayInIndia();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(currentDate);
    setSelectedDate(currentDate);
  }, []);

  const fetchAppointments = useCallback(
    async (date) => {
      const response = await fetch(
        `/api/admin/appointments?business_id=${BUSINESS_ID}&date=${date}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load appointments.");
      }

      return data.appointments || [];
    },
    []
  );

  const loadDashboard = useCallback(
    async (date, isRefresh = false) => {
      if (!date) return;

      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        // Fetch the selected day's schedule and today's appointments.
        const datesToFetch = new Set([date, getTodayInIndia()]);

        // Also fetch the next seven days for the upcoming appointments card.
        const currentIndiaDate = getTodayInIndia();

        for (let day = 1; day <= 7; day += 1) {
          datesToFetch.add(addDays(currentIndiaDate, day));
        }

        const dates = Array.from(datesToFetch);

        const results = await Promise.all(
          dates.map(async (requestedDate) => ({
            date: requestedDate,
            appointments: await fetchAppointments(requestedDate),
          }))
        );

        const appointmentsByDate = Object.fromEntries(
          results.map((result) => [
            result.date,
            result.appointments,
          ])
        );

        setTodayAppointments(
          appointmentsByDate[currentIndiaDate] || []
        );

        setSelectedAppointments(
          appointmentsByDate[date] || []
        );

        const futureAppointments = [];

        for (let day = 1; day <= 7; day += 1) {
          const futureDate = addDays(currentIndiaDate, day);

          const appointments =
            appointmentsByDate[futureDate] || [];

          futureAppointments.push(...appointments);
        }

        setUpcomingAppointments(
          futureAppointments.sort(
            (a, b) =>
              new Date(a.start_time) - new Date(b.start_time)
          )
        );
      } catch (err) {
        console.error("Dashboard loading error:", err);
        setError(
          err.message || "Unable to load dashboard information."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [fetchAppointments]
  );

  useEffect(() => {
    if (!selectedDate) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard(selectedDate);
  }, [selectedDate, loadDashboard]);

  // Unique customers with appointments on the selected day.
  const selectedDayCustomerCount = new Set(
    selectedAppointments
      .map((appointment) => appointment.customer_id)
      .filter(Boolean)
  ).size;

  // Unique customers with appointments today.
  const todayCustomerCount = new Set(
    todayAppointments
      .map((appointment) => appointment.customer_id)
      .filter(Boolean)
  ).size;

  // Only future appointments that have not been cancelled.
  const activeUpcomingAppointments = upcomingAppointments.filter(
    (appointment) => {
      const status = String(appointment.status || "").toLowerCase();

      return status !== "cancelled" && status !== "canceled";
    }
  );

  function changeDate(days) {
    setSelectedDate((currentDate) => {
      if (!currentDate) return getTodayInIndia();

      return addDays(currentDate, days);
    });
  }

  async function handleRefresh() {
    if (!selectedDate) return;

    await loadDashboard(selectedDate, true);
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-6 text-[#0b0e14] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-[#1e9be0]">
              BUSINESS OVERVIEW
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor your appointments and daily activity.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={loading || refreshing || !selectedDate}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>

            <Link
              href="/admin/appointments"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b0e14] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
            >
              All appointments
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle size={19} className="mt-0.5 shrink-0" />

            <div className="flex-1">
              <p className="font-semibold">
                Unable to load dashboard data
              </p>

              <p className="mt-1">{error}</p>
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Date selection */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={20}
                  className="text-[#1e9be0]"
                />

                <h2 className="font-semibold">Daily schedule</h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {selectedDate
                  ? formatDate(selectedDate)
                  : "Preparing your schedule..."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => changeDate(-1)}
                disabled={!selectedDate}
                aria-label="Previous day"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronLeft size={19} />
              </button>

              <input
                type="date"
                value={selectedDate}
                onChange={(event) =>
                  setSelectedDate(event.target.value)
                }
                aria-label="Select appointment date"
                className="h-10 min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none transition focus:border-[#1e9be0] focus:ring-2 focus:ring-[#1e9be0]/10"
              />

              <button
                type="button"
                onClick={() => changeDate(1)}
                disabled={!selectedDate}
                aria-label="Next day"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
              >
                <ChevronRight size={19} />
              </button>

              <button
                type="button"
                onClick={() => setSelectedDate(getTodayInIndia())}
                disabled={!selectedDate || selectedDate === today}
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Today
              </button>
            </div>
          </div>
        </section>

        {/* Dashboard cards */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Today's Appointments"
            value={todayAppointments.length}
            description="Appointments starting today"
            icon={CalendarCheck}
            iconClass="bg-blue-50 text-blue-600"
            loading={loading}
          />

          <StatCard
            title="Today's Customers"
            value={todayCustomerCount}
            description="Unique customers with appointments today"
            icon={Users}
            iconClass="bg-violet-50 text-violet-600"
            loading={loading}
          />

          <StatCard
            title="Selected-Day Appointments"
            value={selectedAppointments.length}
            description="Appointments on the selected date"
            icon={CalendarDays}
            iconClass="bg-cyan-50 text-cyan-700"
            loading={loading}
          />

          <StatCard
            title="Upcoming Appointments"
            value={activeUpcomingAppointments.length}
            description="Next seven days, excluding cancellations"
            icon={CalendarClock}
            iconClass="bg-amber-50 text-amber-600"
            loading={loading}
          />
        </section>

        {/* Main content */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          {/* Selected date schedule */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
              <div>
                <h2 className="font-semibold">Appointments schedule</h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedDate
                    ? formatDate(selectedDate)
                    : "Loading date..."}
                </p>
              </div>

              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {loading ? "Loading..." : `${selectedAppointments.length} total`}
              </span>
            </div>

            {loading ? (
              <div className="space-y-4 p-5">
                {[1, 2, 3, 4].map((item) => (
                  <div
                    key={item}
                    className="h-24 animate-pulse rounded-xl bg-slate-50"
                  />
                ))}
              </div>
            ) : selectedAppointments.length === 0 ? (
              <div className="px-5 py-16 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-400">
                  <CalendarDays size={25} />
                </div>

                <h3 className="mt-4 font-semibold text-slate-800">
                  No appointments for this date
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  Choose another date to view its appointments.
                </p>

                {selectedDate !== today && today && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(today)}
                    className="mt-4 rounded-lg bg-[#0b0e14] px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                  >
                    Return to today
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {selectedAppointments.map((appointment) => (
                  <Link
                    key={appointment.id}
                    href={`/admin/appointments/${appointment.id}`}
                    className="group block px-5 py-5 transition hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      {/* Appointment time */}
                      <div className="flex shrink-0 items-start gap-3 sm:w-28 sm:flex-col sm:gap-1">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#1e9be0]">
                          <Clock3 size={15} />

                          {formatTime(appointment.start_time)}
                        </div>

                        <p className="pl-5 text-xs text-slate-400 sm:pl-0">
                          to {formatTime(appointment.end_time)}
                        </p>
                      </div>

                      {/* Customer and appointment details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-900 transition group-hover:text-[#1e9be0]">
                            {getCustomerName(appointment)}
                          </h3>

                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStatusStyle(
                              appointment.status
                            )}`}
                          >
                            {String(
                              appointment.status || "unknown"
                            ).replaceAll("_", " ")}
                          </span>
                        </div>

                        {getCustomerPhone(appointment) && (
                          <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                            <Phone size={14} />

                            {getCustomerPhone(appointment)}
                          </p>
                        )}

                        <p className="mt-2 text-xs text-slate-400">
                          Appointment #{appointment.id.slice(0, 8)}
                        </p>
                      </div>

                      {/* Amount */}
                      <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-800 sm:justify-end">
                        <IndianRupee size={15} />

                        {formatCurrency(appointment.total_amount)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="border-t border-slate-100 px-5 py-4">
              <Link
                href="/admin/appointments"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#1e9be0] transition hover:text-blue-700"
              >
                Manage all appointments

                <ArrowUpRight size={16} />
              </Link>
            </div>
          </section>

          {/* Right sidebar */}
          <aside className="space-y-6">
            {/* Selected date summary */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <Users size={18} />
                </div>

                <div>
                  <h2 className="font-semibold">Daily summary</h2>

                  <p className="text-xs text-slate-500">
                    Selected date
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Appointments
                  </span>

                  <span className="font-semibold">
                    {loading ? "—" : selectedAppointments.length}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Unique customers
                  </span>

                  <span className="font-semibold">
                    {loading ? "—" : selectedDayCustomerCount}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1 text-sm text-slate-500">
                    <IndianRupee size={14} />
                    Scheduled value
                  </span>

                  <span className="font-semibold">
                    {loading
                      ? "—"
                      : formatCurrency(
                          selectedAppointments.reduce(
                            (sum, appointment) => {
                              const status = String(
                                appointment.status || ""
                              ).toLowerCase();

                              if (
                                status === "cancelled" ||
                                status === "canceled"
                              ) {
                                return sum;
                              }

                              const amount = Number(
                                appointment.total_amount
                              );

                              return (
                                sum +
                                (Number.isFinite(amount) ? amount : 0)
                              );
                            },
                            0
                          )
                        )}
                  </span>
                </div>
              </div>

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-400">
                Scheduled value excludes cancelled appointments. It is
                not necessarily the amount collected.
              </p>
            </section>

            {/* Upcoming appointments */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold">Coming up</h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Next seven days
                  </p>
                </div>

                <CalendarClock
                  size={19}
                  className="text-[#1e9be0]"
                />
              </div>

              {loading ? (
                <div className="space-y-3 p-5">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-16 animate-pulse rounded-lg bg-slate-50"
                    />
                  ))}
                </div>
              ) : activeUpcomingAppointments.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <CalendarDays
                    size={24}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Nothing upcoming
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    No appointments found in the next seven days.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeUpcomingAppointments
                    .slice(0, 5)
                    .map((appointment) => (
                      <Link
                        key={appointment.id}
                        href={`/admin/appointments/${appointment.id}`}
                        className="block px-5 py-4 transition hover:bg-slate-50"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-800">
                              {getCustomerName(appointment)}
                            </p>

                            <p className="mt-1 text-xs text-slate-500">
                              {new Intl.DateTimeFormat("en-IN", {
                                timeZone: TIME_ZONE,
                                day: "numeric",
                                month: "short",
                              }).format(
                                new Date(appointment.start_time)
                              )}
                              {" · "}
                              {formatTime(appointment.start_time)}
                            </p>
                          </div>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium capitalize ${getStatusStyle(
                              appointment.status
                            )}`}
                          >
                            {String(
                              appointment.status || "unknown"
                            ).replaceAll("_", " ")}
                          </span>
                        </div>
                      </Link>
                    ))}
                </div>
              )}

              <div className="border-t border-slate-100 px-5 py-3">
                <Link
                  href="/admin/appointments"
                  className="text-sm font-semibold text-[#1e9be0] hover:text-blue-700"
                >
                  View all appointments →
                </Link>
              </div>
            </section>
          </aside>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Appointment dates and times are displayed in India Standard Time
          (IST).
        </p>
      </div>
    </main>
  );
}