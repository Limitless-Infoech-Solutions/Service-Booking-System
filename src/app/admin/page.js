"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  CalendarCheck,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coins,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Scissors,
  Sparkles,
  Users,
  UserCheck,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";

const TIME_ZONE = "Asia/Kolkata";

// --------------------------------------------------
// DATE AND CURRENCY HELPERS
// --------------------------------------------------

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

function addDays(dateString, amount) {
  // 1. Ensure dateString is a valid string of at least 10 characters (YYYY-MM-DD)
  // Otherwise, fallback to today's date in India to prevent Invalid Date errors
  const safeDateString =
    dateString && typeof dateString === "string" && dateString.length >= 10
      ? dateString
      : getTodayInIndia();

  const date = new Date(`${safeDateString}T12:00:00Z`);

  // 2. Ultimate fallback in the extremely rare case the date is still invalid
  if (isNaN(date.getTime())) {
    const fallbackDate = new Date(`${getTodayInIndia()}T12:00:00Z`);
    fallbackDate.setUTCDate(fallbackDate.getUTCDate() + amount);
    return fallbackDate.toISOString().slice(0, 10);
  }

  // 3. Normal execution
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function formatDate(dateString, options = {}) {
  if (!dateString) return "";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    ...options,
  }).format(new Date(`${dateString}T12:00:00+05:30`));
}

function formatTime(dateString) {
  if (!dateString) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(dateString));
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);
}

function getDatePartInIndia(dateString) {
  if (!dateString) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(dateString));
}

function formatDashboardAppointment(appointment) {
  const serviceItems = appointment.appointment_services || [];
  const serviceNames = [...new Set(
    serviceItems.map((item) => item.services?.name).filter(Boolean)
  )];
  const staffNames = [...new Set(
    serviceItems.map((item) => item.staff?.name).filter(Boolean)
  )];

  return {
    ...appointment,
    customer: appointment.customers?.name || "Customer",
    phone: appointment.customers?.phone || "",
    services: serviceNames.join(", ") || "Service booking",
    staff: staffNames.join(", ") || "Unassigned",
    amount: Number(appointment.total_amount || 0),
    date: getDatePartInIndia(appointment.start_time),
    time: formatTime(appointment.start_time),
  };
}

function getStatusClasses(status) {
  const styles = {
    confirmed: "bg-emerald-50 text-emerald-700",
    completed: "bg-emerald-50 text-emerald-700",
    cancelled: "bg-rose-50 text-rose-700",
    no_show: "bg-slate-100 text-slate-600",
  };

  return styles[status] || "bg-blue-50 text-blue-700";
}

// --------------------------------------------------
// REUSABLE COMPONENTS
// --------------------------------------------------

function Card({ children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white shadow-sm ${className}`}
    >
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Icon size={20} />
        </span>

        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          )}
        </div>
      </div>

      {action}
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  iconColor = "blue",
  subtitle,
  loading,
}) {
  const iconColors = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-emerald-100 text-emerald-600",
    purple: "bg-violet-100 text-violet-600",
    orange: "bg-orange-100 text-orange-600",
    cyan: "bg-sky-100 text-sky-600",
  };

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{title}</p>

          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {loading ? (
              <span className="inline-block h-7 w-16 animate-pulse rounded bg-slate-100" />
            ) : (
              value
            )}
          </p>
        </div>

        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
            iconColors[iconColor]
          }`}
        >
          <Icon size={21} />
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-400">{subtitle}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${getStatusClasses(
        status
      )}`}
    >
      {String(status || "scheduled").replaceAll("_", " ")}
    </span>
  );
}

function AppointmentTable({ appointments, loading = false }) {
  if (!appointments.length) {
    return (
      <div className="px-5 py-12 text-center">
        <CalendarDays className="mx-auto text-slate-300" size={28} />
        <p className="mt-3 text-sm font-semibold text-slate-700">
          {loading ? "Loading appointments…" : "No appointments for this date"}
        </p>
        {!loading && <p className="mt-1 text-xs text-slate-400">
          Select another date or create a new appointment.
        </p>}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-180 text-left">
        <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Time</th>
            <th className="px-4 py-3 font-semibold">Customer</th>
            <th className="px-4 py-3 font-semibold">Services</th>
            <th className="px-4 py-3 font-semibold">Staff</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Action</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-100">
          {appointments.map((appointment) => (
            <tr
              key={appointment.id}
              className="transition hover:bg-blue-50/30"
            >
              <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-700">
                {appointment.time || formatTime(appointment.start_time)}
              </td>

              <td className="px-4 py-3">
                <p className="whitespace-nowrap text-xs font-semibold text-slate-800">
                  {appointment.customer ||
                    appointment.customers?.name ||
                    "Customer"}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  {appointment.phone || appointment.customers?.phone || ""}
                </p>
              </td>

              <td className="px-4 py-3 text-xs text-slate-600">
                {appointment.services ||
                  appointment.service_names ||
                  "Service booking"}
              </td>

              <td className="px-4 py-3 text-xs text-slate-600">
                {appointment.staff || appointment.staff_name || "Assigned"}
              </td>

              <td className="px-4 py-3">
                <StatusBadge status={appointment.status} />
              </td>

              <td className="px-4 py-3">
                <Link
                  href={`/admin/appointments/${appointment.id}`}
                  className="rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// --------------------------------------------------
// MAIN DASHBOARD
// --------------------------------------------------

export default function AdminDashboard() {
  const [today, setToday] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [dashboardData, setDashboardData] = useState(null);
  const [calendarAppointments, setCalendarAppointments] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [calendarError, setCalendarError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState("");
  const [viewingWeek, setViewingWeek] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);

  useEffect(() => {
    const currentDate = getTodayInIndia();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToday(currentDate);
    setSelectedDate(currentDate);
    setCalendarMonth(currentDate.slice(0, 7));
  }, []);

  // Fetch real metrics from the dashboard API.
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "/api/admin/dashboard",
        { cache: "no-store" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load dashboard.");
      }

      setDashboardData(data);
    } catch (err) {
      console.error("Dashboard loading error:", err);
      setError(err.message || "Unable to load dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDashboard();
  }, [loadDashboard]);

  const loadCalendar = useCallback(async () => {
    if (!calendarMonth) return;

    try {
      setCalendarLoading(true);
      setCalendarError("");
      const response = await fetch(
        `/api/admin/dashboard/calender?month=${encodeURIComponent(calendarMonth)}`,
        { cache: "no-store" }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load calendar.");
      setCalendarAppointments(data.data?.appointments || []);
    } catch (err) {
      console.error("Dashboard calendar loading error:", err);
      setCalendarError(err.message || "Unable to load calendar appointments.");
      setCalendarAppointments([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [calendarMonth]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCalendar();
  }, [loadCalendar]);

  const metrics = dashboardData?.metrics || {};
  const availableStaff = dashboardData?.data?.availableStaff || [];
  const safeToday = today || getTodayInIndia();
  const realAppointments = dashboardData?.data?.appointments || [];
  const selectedAppointments = calendarAppointments
    .filter((appointment) => getDatePartInIndia(appointment.start_time) === selectedDate)
    .map(formatDashboardAppointment);
  const upcomingAppointments = (dashboardData?.data?.upcomingAppointments || [])
    .map(formatDashboardAppointment);
  const recentAppointments = (dashboardData?.data?.recentAppointments || [])
    .map(formatDashboardAppointment);

  const activeStaffCount = Number(metrics.activeStaff ?? 0);
  const availableStaffCount = Number(
    metrics.availableStaffCount ?? availableStaff.length
  );

  const selectedDayCustomerCount = new Set(
    selectedAppointments
      .map((appointment) => appointment.customer_id || appointment.customer)
      .filter(Boolean)
  ).size;

  const selectedScheduledValue = selectedAppointments.reduce(
    (total, appointment) => {
      if (["cancelled", "no_show"].includes(appointment.status)) {
        return total;
      }

      return total + Number(appointment.total_amount ?? appointment.amount ?? 0);
    },
    0
  );

  function changeDate(days) {
    const nextDate = addDays(selectedDate || safeToday, days);
    setSelectedDate(nextDate);
    setCalendarMonth(nextDate.slice(0, 7));
  }

  function changeMonth(amount) {
    const current = new Date(`${calendarMonth}-15T12:00:00Z`);
    current.setUTCMonth(current.getUTCMonth() + amount);
    setCalendarMonth(current.toISOString().slice(0, 7));
  }

  const monthDate = calendarMonth
    ? new Date(`${calendarMonth}-01T12:00:00Z`)
    : new Date();

  const monthLabel = new Intl.DateTimeFormat("en-IN", {
    timeZone: TIME_ZONE,
    month: "long",
    year: "numeric",
  }).format(monthDate);

  const firstDay = monthDate.getUTCDay();
  const daysInMonth = new Date(
    Date.UTC(monthDate.getUTCFullYear(), monthDate.getUTCMonth() + 1, 0)
  ).getUTCDate();

  const calendarCells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ];

  const datesWithAppointments = new Set(
    calendarAppointments.map((appointment) => getDatePartInIndia(appointment.start_time))
  );

  const quickActions = [
    {
      label: "Walk-in",
      description: "Register a walk-in customer",
      href: "/admin/appointments/new?type=walk-in",
      icon: UserPlus,
      style: "bg-emerald-50 text-emerald-600 border-emerald-100",
    },
    {
      label: "New Appointment",
      description: "Book a new appointment",
      href: "/admin/appointments/new",
      icon: CalendarCheck,
      style: "bg-blue-50 text-blue-600 border-blue-100",
    },
    {
      label: "View Calendar",
      description: "Open the full calendar",
      href: "/admin/calendar",
      icon: CalendarRange,
      style: "bg-rose-50 text-rose-600 border-rose-100",
    },
    {
      label: "Find Customer",
      description: "Search customer details",
      href: "/admin/customers",
      icon: Search,
      style: "bg-sky-50 text-sky-600 border-sky-100",
    },
  ];

  const navItems = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Appointments", href: "/admin/appointments", icon: CalendarDays },
    { label: "Customers", href: "/admin/customers", icon: Users },
    { label: "Staff", href: "/admin/staff", icon: UserRound },
    { label: "Services", href: "/admin/services", icon: Scissors },
    { label: "Calendar", href: "/admin/calendar", icon: Calendar },
    { label: "Reports", href: "/admin/reports", icon: Activity },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  return (
    // Added w-full and overflow-x-hidden to prevent any horizontal spacing/scroll issues
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f4f7fc] text-slate-900">
      {/* Mobile menu backdrop */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/50 lg:hidden"
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-[#101c3a] text-white transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-pink-300">
            <Sparkles size={27} />
          </span>

          <div>
            <p className="text-lg font-bold">GlowStudio</p>
            <p className="text-xs text-slate-400">Beauty & Wellness</p>
          </div>

          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setSidebarOpen(false)}
            className="ml-auto rounded-lg p-2 text-slate-300 hover:bg-white/10 lg:hidden"
          >
            <X size={19} />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {navItems.map(({ label, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                label === "Dashboard"
                  ? "bg-blue-600/50 font-semibold text-white"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="m-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <Sparkles size={20} className="mb-3 text-blue-300" />
          <p className="text-sm font-semibold">Grow Your Business</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">
            Better service. Happier customers. More bookings.
          </p>
          <Link
            href="/admin/reports"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold hover:bg-blue-500"
          >
            Explore reports <ArrowRight size={14} />
          </Link>
        </div>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-sm font-bold">
              AD
            </span>
            <div>
              <p className="text-sm font-semibold">Admin</p>
              <p className="text-xs text-slate-400">Business Owner</p>
            </div>
            <ChevronDown size={16} className="ml-auto text-slate-400" />
          </div>
        </div>
      </aside>

      {/* MAIN AREA - Added w-full to ensure it fills the remaining space perfectly */}
      <main className="min-h-screen w-full lg:pl-4">
        {/* HEADER */}
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
          <div className="flex min-h-20 items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Open navigation"
                onClick={() => setSidebarOpen(true)}
                className="rounded-lg border border-slate-200 p-2 lg:hidden"
              >
                <Menu size={20} />
              </button>

              <div>
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                  Dashboard
                </h1>
                <p className="mt-1 hidden text-sm text-slate-500 sm:block">
                  Here&apos;s what&apos;s happening with your business today.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 sm:flex">
                <CalendarDays size={16} className="text-blue-600" />
                {formatDate(safeToday, {
                  weekday: "short",
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </div>

              <button
                type="button"
                aria-label="Notifications"
                className="relative rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"
              >
                <Bell size={19} />
                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-rose-500" />
              </button>

              <div className="hidden items-center gap-2 sm:flex">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                  AD
                </span>
                <div>
                  <p className="text-xs font-semibold">Admin</p>
                  <p className="text-[10px] text-slate-500">Business Owner</p>
                </div>
                <ChevronDown size={15} className="text-slate-500" />
              </div>
            </div>
          </div>
        </header>

        <div className="space-y-5 p-4 sm:p-6 xl:p-8">
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <AlertCircle size={18} />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={loadDashboard}
                className="font-semibold underline"
              >
                Retry
              </button>
            </div>
          )}

          {/* QUICK ACTIONS */}
          <Card className="p-4 sm:p-5">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="font-bold">Quick Actions</h2>
              <span className="text-xs text-slate-400">
                Get things done, faster.
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              {quickActions.map((action) => {
                const Icon = action.icon;

                return (
                  <Link
                    key={action.label}
                    href={action.href}
                    className={`group flex min-h-28 items-center gap-3 rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${action.style}`}
                  >
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80">
                      <Icon size={21} />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-900">
                        {action.label}
                      </span>
                      <span className="mt-1 block text-xs text-slate-500">
                        {action.description}
                      </span>
                    </span>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-slate-500 transition group-hover:translate-x-1"
                    />
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* BUSINESS OVERVIEW */}
          <Card className="p-4 sm:p-5">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-bold">Business Overview at a Glance</h2>
                <p className="mt-1 text-xs text-slate-500">
                  Today&apos;s business metrics
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                Today ·{" "}
                {formatDate(safeToday, {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <MetricCard
                title="New Customers"
                value={metrics.newCustomersToday ?? 0}
                icon={Users}
                iconColor="green"
                subtitle="Registered today"
                loading={loading}
              />

              <MetricCard
                title="Today's Appointments"
                value={metrics.todayAppointmentsCount ?? 0}
                icon={CalendarCheck}
                iconColor="blue"
                subtitle="Excludes cancelled and no-show"
                loading={loading}
              />

              <MetricCard
                title="Expected Revenue"
                value={formatCurrency(metrics.expectedRevenue ?? 0)}
                icon={Coins}
                iconColor="purple"
                subtitle="Confirmed bookings"
                loading={loading}
              />

              <MetricCard
                title="Total Staff"
                value={activeStaffCount}
                icon={Users}
                iconColor="cyan"
                subtitle="Active staff members"
                loading={loading}
              />

              <MetricCard
                title="Available Staff"
                value={availableStaffCount}
                icon={UserCheck}
                iconColor="green"
                subtitle="No appointments scheduled today"
                loading={loading}
              />
            </div>
          </Card>

          {/* CALENDAR AND DAILY SCHEDULE */}
          <div className="grid items-start gap-5 2xl:grid-cols-[310px_minmax(0,1fr)]">
            {/* CALENDAR */}
            <Card className="p-4 sm:p-5">
              <SectionTitle
                icon={CalendarDays}
                title="Calendar"
                subtitle="Select a date to view the schedule"
              />

              <div className="mt-5 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => changeMonth(-1)}
                  aria-label="Previous month"
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                >
                  <ChevronLeft size={18} />
                </button>

                <p className="text-sm font-semibold">{monthLabel}</p>

                <button
                  type="button"
                  onClick={() => changeMonth(1)}
                  aria-label="Next month"
                  className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                >
                  <ChevronRight size={18} />
                </button>
              </div>

              <div className="mt-4 grid grid-cols-7 text-center">
                {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((day) => (
                  <span
                    key={day}
                    className="py-2 text-[10px] font-semibold text-slate-400"
                  >
                    {day}
                  </span>
                ))}

                {calendarCells.map((day, index) => {
                  if (!day) {
                    return <span key={`blank-${index}`} />;
                  }

                  const dateString = `${calendarMonth}-${String(day).padStart(
                    2,
                    "0"
                  )}`;

                  const isSelected = selectedDate === dateString;
                  const isToday = safeToday === dateString;
                  const hasAppointments = datesWithAppointments.has(dateString);

                  return (
                    <button
                      key={dateString}
                      type="button"
                      onClick={() => setSelectedDate(dateString)}
                      className={`relative mx-auto my-1 flex h-9 w-9 items-center justify-center rounded-full text-xs transition ${
                        isSelected
                          ? "bg-blue-600 font-bold text-white shadow-md"
                          : isToday
                            ? "border border-blue-300 font-bold text-blue-600"
                            : "text-slate-600 hover:bg-blue-50"
                      }`}
                    >
                      {day}
                      {hasAppointments && !isSelected && !calendarLoading && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-emerald-500" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-600" />
                  Selected date
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full border border-blue-500" />
                  Today
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Appointments
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-4">
                <label
                  htmlFor="dashboard-date"
                  className="mb-2 block text-xs font-medium text-slate-500"
                >
                  Choose exact date
                </label>

                <input
                  id="dashboard-date"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => {
                    const nextDate = event.target.value;
                    setSelectedDate(nextDate);
                    if (nextDate) setCalendarMonth(nextDate.slice(0, 7));
                  }}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => setSelectedDate(safeToday)}
                  className="mt-2 w-full rounded-xl border border-slate-200 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Return to today
                </button>
              </div>
            </Card>

            {/* DAILY SCHEDULE */}
            <Card className="min-w-0 overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
                <div>
                  <h2 className="font-bold">Daily Schedule</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(selectedDate, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => setViewingWeek(false)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                      !viewingWeek
                        ? "bg-blue-700 text-white shadow"
                        : "text-slate-500"
                    }`}
                  >
                    Day
                  </button>

                  <button
                    type="button"
                    onClick={() => setViewingWeek(true)}
                    className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                      viewingWeek
                        ? "bg-blue-700 text-white shadow"
                        : "text-slate-500"
                    }`}
                  >
                    Week
                  </button>
                </div>
              </div>

              {viewingWeek && (
                <div className="flex items-center justify-between border-y border-blue-100 bg-blue-50/60 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => changeDate(-7)}
                    className="rounded-lg p-1 hover:bg-white"
                    aria-label="Previous week"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span className="text-xs font-semibold text-blue-700">
                    Week of {formatDate(selectedDate, { day: "numeric", month: "short" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeDate(7)}
                    className="rounded-lg p-1 hover:bg-white"
                    aria-label="Next week"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              )}

              {calendarError && (
                <p role="alert" className="border-y border-rose-100 bg-rose-50 px-5 py-3 text-sm text-rose-700">
                  {calendarError}
                </p>
              )}

              <AppointmentTable
                appointments={viewingWeek
                  ? calendarAppointments
                      .filter((appointment) => {
                        const appointmentDate = getDatePartInIndia(appointment.start_time);
                        const startDate = selectedDate || safeToday;
                        const dayOffset = (new Date(`${appointmentDate}T12:00:00Z`) - new Date(`${startDate}T12:00:00Z`)) / 86400000;
                        return dayOffset >= 0 && dayOffset < 7;
                      })
                      .map(formatDashboardAppointment)
                  : selectedAppointments}
                loading={calendarLoading}
              />

              <div className="border-t border-slate-100 px-5 py-3">
                <Link
                  href="/admin/appointments"
                  className="inline-flex items-center gap-2 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Manage all appointments <ArrowRight size={14} />
                </Link>
              </div>
            </Card>
          </div>

          {/* DAILY SUMMARY AND AVAILABLE STAFF */}
          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-5">
              <SectionTitle
                icon={Activity}
                title="Daily Summary"
                subtitle="Selected date overview"
              />

              <div className="mt-5 space-y-4">
                {[
                  {
                    label: "Appointments",
                    value: selectedAppointments.length,
                  },
                  {
                    label: "Unique customers",
                    value: selectedDayCustomerCount,
                  },
                  {
                    label: "Scheduled value",
                    value: formatCurrency(selectedScheduledValue),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between border-b border-slate-100 pb-3 last:border-0 last:pb-0"
                  >
                    <span className="text-sm text-slate-500">{item.label}</span>
                    <span className="font-bold text-slate-900">
                      {item.value}
                    </span>
                  </div>
                ))}
              </div>

              <p className="mt-5 text-xs leading-5 text-slate-400">
                Scheduled value is based on appointments in the selected date and does not represent money collected.
              </p>
            </Card>

            <Card className="overflow-hidden">
              <div className="p-5">
                <SectionTitle
                  icon={UserCheck}
                  title="Available Staff"
                  subtitle="Staff with no appointments scheduled today"
                  action={
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                      {loading ? "—" : availableStaffCount}
                    </span>
                  }
                />

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all"
                    style={{
                      width: `${
                        activeStaffCount
                          ? Math.min(
                              100,
                              (availableStaffCount / activeStaffCount) * 100
                            )
                          : 0
                      }%`,
                    }}
                  />
                </div>

                <p className="mt-2 text-right text-xs text-slate-400">
                  {availableStaffCount} of {activeStaffCount} active staff
                </p>
              </div>

              {availableStaff.length > 0 ? (
                <div className="divide-y divide-slate-100">
                  {availableStaff.slice(0, 4).map((staffMember) => (
                    <div
                      key={staffMember.id}
                      className="flex items-center gap-3 px-5 py-3"
                    >
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <UserRound size={18} />
                      </span>
                      <div>
                        <p className="text-sm font-semibold">
                          {staffMember.name}
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-600">
                          No appointments today
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 pb-5">
                  {loading ? (
                    <div className="h-16 animate-pulse rounded-lg bg-slate-50" />
                  ) : (
                    <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                      No staff members without appointments today.
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                <Link
                  href="/admin/staff"
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Manage staff →
                </Link>
              </div>
            </Card>
          </div>

          {/* UPCOMING APPOINTMENTS */}
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 p-5">
              <SectionTitle
                icon={CalendarCheck}
                title="Upcoming Appointments"
                subtitle="Next scheduled bookings"
              />

              <Link
                href="/admin/appointments"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-800 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
              >
                View All <ArrowRight size={14} />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-162.5 text-left">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Customer</th>
                    <th className="px-5 py-3">Date & Time</th>
                    <th className="px-5 py-3">Services</th>
                    <th className="px-5 py-3">Staff</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {upcomingAppointments.map((appointment) => (
                    <tr key={appointment.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3">
                        <p className="whitespace-nowrap text-xs font-semibold">
                          {appointment.customer}
                        </p>
                        <p className="mt-1 text-[10px] text-slate-400">
                          {appointment.phone}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-600">
                        {appointment.date === safeToday
                          ? "Today"
                          : appointment.date === addDays(safeToday, 1)
                            ? "Tomorrow"
                            : formatDate(appointment.date, {
                                day: "numeric",
                                month: "short",
                              })}
                        , {appointment.time}
                      </td>

                      <td className="px-5 py-3 text-xs text-slate-600">
                        {appointment.services}
                      </td>

                      <td className="px-5 py-3 text-xs text-slate-600">
                        {appointment.staff}
                      </td>

                      <td className="px-5 py-3">
                        <StatusBadge status={appointment.status} />
                      </td>

                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => setSelectedAppointment(appointment)}
                          className="rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {upcomingAppointments.length === 0 && !loading && (
              <p className="px-5 pb-5 text-sm text-slate-500">No upcoming appointments.</p>
            )}
          </Card>

          {/* CUSTOMER OVERVIEW */}
          <Card className="flex flex-col justify-between gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="flex items-center gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <Users size={23} />
              </span>

              <div>
                <h2 className="font-bold">Customer Overview</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Total customers registered with your business.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 sm:justify-end">
              <p className="text-3xl font-bold">
                {loading ? "—" : metrics.totalCustomers ?? 0}
              </p>

              <Link
                href="/admin/customers"
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                View Customers
              </Link>
            </div>
          </Card>

          {/* RECENT APPOINTMENTS */}
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 p-5">
              <SectionTitle
                icon={Clock3}
                title="Recent Appointments"
                subtitle="Latest booking activity"
              />
              <Link
                href="/admin/appointments"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                View all
              </Link>
            </div>

            <AppointmentTable
              appointments={recentAppointments}
              loading={loading}
            />
          </Card>

          <p className="pb-3 text-center text-xs text-slate-400">
            Appointment times use India Standard Time (IST).
          </p>
        </div>
      </main>

      {/* APPOINTMENT DETAIL MODAL */}
      {selectedAppointment && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedAppointment(null);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">
                  Appointment Details
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {selectedAppointment.customer ||
                    selectedAppointment.customers?.name ||
                    "Customer"}
                </h2>
              </div>

              <button
                type="button"
                aria-label="Close appointment details"
                onClick={() => setSelectedAppointment(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3">
                <CalendarDays className="text-blue-600" size={18} />
                <div>
                  <p className="text-xs text-slate-400">Time</p>
                  <p className="text-sm font-semibold">
                    {selectedAppointment.time ||
                      formatTime(selectedAppointment.start_time)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Scissors className="text-blue-600" size={18} />
                <div>
                  <p className="text-xs text-slate-400">Services</p>
                  <p className="text-sm font-semibold">
                    {selectedAppointment.services ||
                      "Service booking"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <UserRound className="text-blue-600" size={18} />
                <div>
                  <p className="text-xs text-slate-400">Staff</p>
                  <p className="text-sm font-semibold">
                    {selectedAppointment.staff || "Assigned staff"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Coins className="text-blue-600" size={18} />
                <div>
                  <p className="text-xs text-slate-400">Appointment value</p>
                  <p className="text-sm font-semibold">
                    {formatCurrency(
                      selectedAppointment.amount ??
                        selectedAppointment.total_amount
                    )}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">Status</span>
                <StatusBadge status={selectedAppointment.status} />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={() => setSelectedAppointment(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50"
              >
                Close
              </button>

              {selectedAppointment.id && (
                  <Link
                    href={`/admin/appointments/${selectedAppointment.id}`}
                    className="flex-1 rounded-xl bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-blue-800"
                  >
                    Open Appointment
                  </Link>
                )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
