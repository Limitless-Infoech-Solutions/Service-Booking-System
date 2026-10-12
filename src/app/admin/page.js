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
  ArrowUpRight,
  Plus,
  UserPlus,
  CalendarRange,
  Search,
  Phone,
  IndianRupee,
  CalendarCheck,
  AlertCircle,
  UserCheck,
  UserRound,
  Activity,
} from "lucide-react";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

const TIME_ZONE = "Asia/Kolkata";

// Get today's date in India.
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

// Add calendar days without depending on the browser's timezone.
function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00Z`);

  date.setUTCDate(date.getUTCDate() + amount);

  return date.toISOString().slice(0, 10);
}

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

function formatShortDate(dateString) {
  if (!dateString) return "—";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
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

  if (normalizedStatus === "no_show") {
    return "bg-slate-100 text-slate-600";
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
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">
            {title}
          </p>

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

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function SectionHeading({
  title,
  description,
  icon: Icon,
}) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1e9be0]">
        <Icon size={20} />
      </div>

      <div>
        <h2 className="font-semibold text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function AppointmentRow({ appointment, showDate = false }) {
  return (
    <Link
      href={`/admin/appointments/${appointment.id}`}
      className="group block px-5 py-4 transition hover:bg-slate-50"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex shrink-0 items-start gap-3 sm:w-28 sm:flex-col sm:gap-1">
          {showDate && (
            <p className="text-xs font-medium text-slate-500">
              {formatShortDate(appointment.start_time)}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-sm font-semibold text-[#1e9be0]">
            <Clock3 size={15} />

            {formatTime(appointment.start_time)}
          </div>

          <p className="pl-5 text-xs text-slate-400 sm:pl-0">
            to {formatTime(appointment.end_time)}
          </p>
        </div>

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
              {String(appointment.status || "unknown").replaceAll(
                "_",
                " "
              )}
            </span>
          </div>

          {getCustomerPhone(appointment) && (
            <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
              <Phone size={14} />

              {getCustomerPhone(appointment)}
            </p>
          )}

          <p className="mt-1 text-xs text-slate-400">
            Appointment #{appointment.id.slice(0, 8)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 text-sm font-semibold text-slate-800">
          <IndianRupee size={15} />

          {formatCurrency(appointment.total_amount)}
        </div>
      </div>
    </Link>
  );
}

export default function AdminDashboard() {
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");

  const [dashboardData, setDashboardData] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Initialize dates in India Standard Time.
  useEffect(() => {
    const currentDate = getTodayInIndia();

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(currentDate);
    setSelectedDate(currentDate);
  }, []);

  // Fetch the dashboard's actual API response.
  const loadDashboard = useCallback(async (date) => {
    if (!date) return;

    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/dashboard?business_id=${BUSINESS_ID}&date=${date}`,
        {
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Failed to load dashboard."
        );
      }

      setDashboardData(data);
    } catch (err) {
      console.error("Dashboard loading error:", err);

      setError(
        err.message || "Unable to load dashboard information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedDate) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard(selectedDate);
  }, [selectedDate, loadDashboard]);

  // Values returned by the dashboard API.
  const metrics = dashboardData?.metrics || {};

  const selectedAppointments =
    dashboardData?.schedule?.appointments || [];

  const upcomingAppointments =
    dashboardData?.upcoming?.appointments || [];

  const recentAppointments =
    dashboardData?.recentAppointments || [];

  const availableStaff =
    dashboardData?.staff?.availableNow || [];

  const activeStaffCount =
    metrics.activeStaff ??
    dashboardData?.staff?.activeCount ??
    0;

  const availableStaffCount =
    metrics.availableStaffNow ??
    dashboardData?.staff?.availableCount ??
    availableStaff.length;

  // Count unique customers on the selected date.
  const selectedDayCustomerCount = new Set(
    selectedAppointments
      .map((appointment) => appointment.customer_id)
      .filter(Boolean)
  ).size;

  // Scheduled value for the selected date.
  const scheduledValueSelectedDate =
    selectedAppointments.reduce((sum, appointment) => {
      const status = String(
        appointment.status || ""
      ).toLowerCase();

      if (
        status === "cancelled" ||
        status === "canceled"
      ) {
        return sum;
      }

      const amount = Number(appointment.total_amount);

      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);

  const activeUpcomingAppointments =
    upcomingAppointments.filter((appointment) => {
      const status = String(
        appointment.status || ""
      ).toLowerCase();

      return (
        status !== "cancelled" &&
        status !== "canceled"
      );
    });

  function changeDate(days) {
    setSelectedDate((currentDate) => {
      if (!currentDate) return getTodayInIndia();

      return addDays(currentDate, days);
    });
  }

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-6 text-[#0b0e14] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-sm font-medium text-[#1e9be0]">
              BUSINESS MANAGEMENT
            </p>

            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Monitor appointments, customers, staff, and business activity.
            </p>
          </div>

          <Link
            href="/admin/appointments"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b0e14] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            All appointments

            <ArrowUpRight size={16} />
          </Link>
        </header>

        {/* ERROR */}
        {error && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <AlertCircle
              size={19}
              className="mt-0.5 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                Unable to load dashboard data
              </p>

              <p className="mt-1">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => loadDashboard(selectedDate)}
              className="shrink-0 font-semibold underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* QUICK ACTIONS */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="font-semibold">
              Quick actions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Quickly access common tasks.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/admin/appointments/new?type=walk-in"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-[#1e9be0] hover:bg-blue-50/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-[#1e9be0]">
                <UserPlus size={19} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Add Walk-in
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Register an in-person booking
                </span>
              </span>

              <ArrowUpRight
                size={16}
                className="text-slate-400 group-hover:text-[#1e9be0]"
              />
            </Link>

            <Link
              href="/admin/appointments/new"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-[#1e9be0] hover:bg-blue-50/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Plus size={19} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  New Appointment
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Create a new booking
                </span>
              </span>

              <ArrowUpRight
                size={16}
                className="text-slate-400 group-hover:text-[#1e9be0]"
              />
            </Link>

            <Link
              href="/admin/calendar"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-[#1e9be0] hover:bg-blue-50/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                <CalendarRange size={19} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  View Calendar
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Browse the booking calendar
                </span>
              </span>

              <ArrowUpRight
                size={16}
                className="text-slate-400 group-hover:text-[#1e9be0]"
              />
            </Link>

            <Link
              href="/admin/customers"
              className="group flex items-center gap-3 rounded-xl border border-slate-200 p-4 transition hover:border-[#1e9be0] hover:bg-blue-50/50"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Search size={19} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold">
                  Find Customer
                </span>

                <span className="mt-1 block text-xs text-slate-500">
                  Search customer records
                </span>
              </span>

              <ArrowUpRight
                size={16}
                className="text-slate-400 group-hover:text-[#1e9be0]"
              />
            </Link>
          </div>
        </section>

        {/* BUSINESS OVERVIEW */}
        <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#1e9be0]">
              At a glance
            </p>

            <h2 className="mt-1 text-lg font-semibold">
              Business overview
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Today&apos;s key business metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

            {/* Today's appointments */}
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <CalendarCheck size={17} />

                <span className="text-xs font-medium sm:text-sm">
                  Today&apos;s Appointments
                </span>
              </div>

              <p className="mt-3 text-2xl font-semibold">
                {loading
                  ? "—"
                  : metrics.todayAppointments ?? 0}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Appointments scheduled today
              </p>
            </div>

            {/* Pending actions placeholder */}
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <AlertCircle size={17} />

                <span className="text-xs font-medium sm:text-sm">
                  Pending Actions
                </span>
              </div>

              <p className="mt-3 text-2xl font-semibold">
                —
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Action rules not connected yet
              </p>
            </div>

            {/* Scheduled value */}
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <IndianRupee size={17} />

                <span className="text-xs font-medium sm:text-sm">
                  Scheduled Value Today
                </span>
              </div>

              <p className="mt-3 text-xl font-semibold sm:text-2xl">
                {loading
                  ? "—"
                  : formatCurrency(
                      metrics.scheduledValueToday ?? 0
                    )}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Excludes cancelled bookings
              </p>
            </div>

            {/* Available staff */}
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-slate-500">
                <UserCheck size={17} />

                <span className="text-xs font-medium sm:text-sm">
                  Staff Available Now
                </span>
              </div>

              <p className="mt-3 text-2xl font-semibold">
                {loading ? "—" : availableStaffCount}
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Out of {loading ? "—" : activeStaffCount} active staff
              </p>
            </div>
          </div>
        </section>

        {/* DATE SELECTOR */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <CalendarDays
                  size={20}
                  className="text-[#1e9be0]"
                />

                <h2 className="font-semibold">
                  Daily schedule
                </h2>
              </div>

              <p className="mt-1 text-sm text-slate-500">
                {selectedDate
                  ? formatDate(selectedDate)
                  : "Preparing schedule..."}
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

        {/* FOUR KPI CARDS */}
        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Today's Appointments"
            value={metrics.todayAppointments ?? 0}
            description="Appointments starting today"
            icon={CalendarCheck}
            iconClass="bg-blue-50 text-blue-600"
            loading={loading}
          />

          <StatCard
            title="Today's Customers"
            value={metrics.todayCustomers ?? 0}
            description="Unique customers with appointments today"
            icon={Users}
            iconClass="bg-violet-50 text-violet-600"
            loading={loading}
          />

          <StatCard
            title="Selected-Day Appointments"
            value={dashboardData?.schedule?.total ?? selectedAppointments.length}
            description="Appointments on the selected date"
            icon={CalendarDays}
            iconClass="bg-cyan-50 text-cyan-700"
            loading={loading}
          />

          <StatCard
            title="Upcoming Appointments"
            value={metrics.upcomingAppointments ?? activeUpcomingAppointments.length}
            description="Upcoming bookings returned by the dashboard API"
            icon={CalendarClock}
            iconClass="bg-amber-50 text-amber-600"
            loading={loading}
          />
        </section>

        {/* MAIN CONTENT */}
        <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_350px]">

          {/* APPOINTMENT SCHEDULE */}
          <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
              <div>
                <h2 className="font-semibold">
                  Appointments schedule
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedDate
                    ? formatDate(selectedDate)
                    : "Loading date..."}
                </p>
              </div>

              <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {loading
                  ? "Loading..."
                  : `${dashboardData?.schedule?.total ?? selectedAppointments.length} total`}
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
                  <AppointmentRow
                    key={appointment.id}
                    appointment={appointment}
                  />
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

          {/* RIGHT COLUMN */}
          <aside className="space-y-6">

            {/* DAILY SUMMARY */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <SectionHeading
                title="Daily summary"
                description="Selected date"
                icon={Activity}
              />

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-slate-500">
                    Appointments
                  </span>

                  <span className="font-semibold">
                    {loading
                      ? "—"
                      : dashboardData?.schedule?.total ??
                        selectedAppointments.length}
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
                  <span className="text-sm text-slate-500">
                    Scheduled value
                  </span>

                  <span className="font-semibold">
                    {loading
                      ? "—"
                      : formatCurrency(
                          scheduledValueSelectedDate
                        )}
                  </span>
                </div>
              </div>

              <p className="mt-4 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-400">
                Scheduled value excludes cancelled appointments.
                It does not necessarily represent money collected.
              </p>
            </section>

            {/* STAFF AVAILABILITY */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 p-5">
                <div className="flex items-center justify-between gap-3">
                  <SectionHeading
                    title="Available staff"
                    description="Current availability"
                    icon={UserCheck}
                  />

                  <span className="shrink-0 rounded-full bg-green-50 px-3 py-1 text-sm font-semibold text-green-700">
                    {loading ? "—" : availableStaffCount}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                  <span>Active staff</span>

                  <span className="font-semibold text-slate-700">
                    {loading ? "—" : activeStaffCount}
                  </span>
                </div>

                {!loading && activeStaffCount > 0 && (
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-green-500 transition-all"
                      style={{
                        width: `${Math.min(
                          100,
                          (availableStaffCount / activeStaffCount) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {loading ? (
                <div className="space-y-3 p-5">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-12 animate-pulse rounded-lg bg-slate-50"
                    />
                  ))}
                </div>
              ) : availableStaff.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <Users
                    size={24}
                    className="mx-auto text-slate-300"
                  />

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    No available staff
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    No staff members are currently reported as available.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {availableStaff.map((staffMember) => (
                    <div
                      key={staffMember.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[#1e9be0]">
                        <UserRound size={18} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {staffMember.name}
                        </p>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-green-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                          Available
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="border-t border-slate-100 px-5 py-3">
                <Link
                  href="/admin/staff"
                  className="text-sm font-semibold text-[#1e9be0] hover:text-blue-700"
                >
                  Manage staff →
                </Link>
              </div>
            </section>

            {/* UPCOMING APPOINTMENTS */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="font-semibold">
                    Coming up
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Upcoming appointments
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
                    No upcoming appointments were returned.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeUpcomingAppointments
                    .slice(0, 5)
                    .map((appointment) => (
                      <AppointmentRow
                        key={appointment.id}
                        appointment={appointment}
                        showDate
                      />
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

        {/* TOTAL CUSTOMERS */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Users size={21} />
              </div>

              <div>
                <h2 className="font-semibold">
                  Customer overview
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Total customers registered with your business.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-5 sm:justify-end">
              <p className="text-3xl font-semibold">
                {loading
                  ? "—"
                  : metrics.totalCustomers ?? 0}
              </p>

              <Link
                href="/admin/customers"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:bg-slate-50"
              >
                View customers

                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </section>

        {/* RECENT APPOINTMENTS */}
        <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-5">
            <div>
              <h2 className="font-semibold">
                Recent appointments
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Recently returned booking records.
              </p>
            </div>

            <Link
              href="/admin/appointments"
              className="shrink-0 text-sm font-semibold text-[#1e9be0] hover:text-blue-700"
            >
              View all
            </Link>
          </div>

          {loading ? (
            <div className="space-y-4 p-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-20 animate-pulse rounded-xl bg-slate-50"
                />
              ))}
            </div>
          ) : recentAppointments.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CalendarDays
                size={24}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-medium text-slate-700">
                No recent appointments
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentAppointments.map((appointment) => (
                <AppointmentRow
                  key={appointment.id}
                  appointment={appointment}
                  showDate
                />
              ))}
            </div>
          )}
        </section>

        {/* FOOTER */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Appointment dates and times are displayed in India Standard Time (IST).
        </p>
      </div>
    </main>
  );
}