"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AppointmentDetailsPage({ params }) {
  const [appointmentId, setAppointmentId] = useState(null);
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadAppointment() {
      try {
        const { appointment_id } = await params;

        setAppointmentId(appointment_id);

        const response = await fetch(
          `/api/admin/appointments/${appointment_id}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load appointment");
        }

        setAppointment(data.appointment);
      } catch (error) {
        console.error(error);
        setError("Failed to load appointment.");
      } finally {
        setLoading(false);
      }
    }

    loadAppointment();
  }, [params]);

  function formatDate(date) {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    });
  }

  function formatTime(date) {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  }

  function getInitials(name) {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }

  function getStatusStyle(status) {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "done")
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    if (s === "cancelled" || s === "canceled")
      return "bg-rose-50 text-rose-700 ring-1 ring-rose-200";
    if (s === "arrived")
      return "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200";
    if (s === "in_service")
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (s === "in_progress" || s === "in-progress" || s === "ongoing")
      return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    if (s === "no_show" || s === "no-show")
      return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
    // default: scheduled appointment
    return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  }

  function getStatusDot(status) {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "done") return "bg-emerald-500";
    if (s === "cancelled" || s === "canceled") return "bg-rose-500";
    if (s === "arrived") return "bg-indigo-500";
    if (s === "in_service") return "bg-blue-500";
    if (s === "in_progress" || s === "in-progress" || s === "ongoing")
      return "bg-blue-500";
    if (s === "no_show" || s === "no-show") return "bg-slate-400";
    return "bg-amber-500";
  }

  function formatStatusLabel(status) {
    if (!status) return "—";
    return status
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Icons
  const Icon = {
    Back: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
    ),
    Calendar: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /></svg>
    ),
    Clock: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
    ),
    User: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
    ),
    Phone: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
    ),
    Mail: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-10 5L2 7" /></svg>
    ),
    Rupee: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12" /><path d="M6 8h12" /><path d="m6 13 8.5 8" /><path d="M6 13h3a5 5 0 0 0 0-10" /></svg>
    ),
    Timer: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 2h4" /><path d="M12 14 8 10" /><path d="M12 22a8 8 0 0 0 8-8c0-4.4-3.6-8-8-8s-8 3.6-8 8a8 8 0 0 0 2.3 5.7" /></svg>
    ),
    Badge: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76z" /><path d="m9 12 2 2 4-4" /></svg>
    ),
    Sparkles: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" /></svg>
    ),
    Hash: (p) => (
      <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="9" y2="9" /><line x1="4" x2="20" y1="15" y2="15" /><line x1="10" x2="8" y1="3" y2="21" /><line x1="16" x2="14" y1="3" y2="21" /></svg>
    ),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl p-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-40 rounded bg-slate-200" />
            <div className="h-24 rounded-xl bg-slate-200" />
            <div className="grid gap-6 md:grid-cols-3">
              <div className="h-32 rounded-xl bg-slate-200" />
              <div className="h-32 rounded-xl bg-slate-200" />
              <div className="h-32 rounded-xl bg-slate-200" />
            </div>
            <div className="h-64 rounded-xl bg-slate-200" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-8">
        <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-rose-100">
            <svg className="h-6 w-6 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" x2="12" y1="8" y2="12" />
              <line x1="12" x2="12.01" y1="16" y2="16" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-slate-900">
            Something went wrong
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {error || "Appointment not found."}
          </p>
          <Link
            href="/admin/appointments"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            <Icon.Back className="h-4 w-4" />
            Back to appointments
          </Link>
        </div>
      </div>
    );
  }

  const customerName = appointment.customers?.name || "Unknown customer";
  const initials = getInitials(customerName);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-6xl p-6 sm:p-8">
        {/* Breadcrumb */}
        <nav className="mb-6">
          <Link
            href="/admin/appointments"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-slate-900"
          >
            <Icon.Back className="h-4 w-4 transition group-hover:-translate-x-0.5" />
            Back to appointments
          </Link>
        </nav>

        {/* Header */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="relative bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 px-6 py-8 text-white sm:px-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_50%)]" />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
                  <Icon.Calendar className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-300">
                    Appointment
                  </p>
                  <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    {customerName}
                  </h1>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                    <Icon.Hash className="h-3.5 w-3.5" />
                    ID: {appointmentId}
                  </p>
                </div>
              </div>

              <div className="flex flex-col items-start gap-3 sm:items-end">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold ${getStatusStyle(
                    appointment.status
                  )}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${getStatusDot(
                      appointment.status
                    )}`}
                  />
                  {formatStatusLabel(appointment.status)}
                </span>
                <div className="flex items-center gap-1.5 text-sm text-slate-300">
                  <Icon.Calendar className="h-4 w-4" />
                  {formatDate(appointment.start_time)}
                </div>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid divide-y divide-slate-200 border-t border-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <div className="flex items-center gap-3 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <Icon.Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Starts</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatTime(appointment.start_time)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <Icon.Timer className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Ends</p>
                <p className="text-sm font-semibold text-slate-900">
                  {formatTime(appointment.end_time)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                <Icon.Rupee className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Total</p>
                <p className="text-sm font-semibold text-slate-900">
                  ₹{appointment.total_amount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Customer & Appointment details */}
        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          {/* Customer */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                <Icon.User className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Customer Details
              </h2>
            </div>

            <div className="flex items-center gap-4 rounded-xl bg-slate-50 p-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-lg font-semibold text-white shadow-sm">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-slate-900">
                  {customerName}
                </p>
                <p className="truncate text-sm text-slate-500">
                  {appointment.customers?.email || "No email on file"}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <Icon.Phone className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">Phone</p>
                  <p className="truncate text-sm font-medium text-slate-900">
                    {appointment.customers?.phone || "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5 transition hover:bg-slate-50">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                  <Icon.Mail className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-500">Email</p>
                  <p className="truncate text-sm font-medium text-slate-900">
                    {appointment.customers?.email || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Appointment Schedule */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                <Icon.Calendar className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Schedule
              </h2>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                  <Icon.Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-slate-500">Date</p>
                  <p className="text-sm font-medium text-slate-900">
                    {formatDate(appointment.start_time)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-emerald-50 text-emerald-600">
                    <Icon.Clock className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">Start</p>
                    <p className="truncate text-sm font-medium text-slate-900">
                      {formatTime(appointment.start_time)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-rose-50 text-rose-600">
                    <Icon.Timer className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-500">End</p>
                    <p className="truncate text-sm font-medium text-slate-900">
                      {formatTime(appointment.end_time)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-linear-to-r from-amber-50 to-orange-50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-amber-600 ring-1 ring-amber-200">
                    <Icon.Rupee className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-amber-700">
                      Total Amount
                    </p>
                    <p className="text-xs text-amber-600/80">
                      {appointment.appointment_services?.length || 0} service
                      {(appointment.appointment_services?.length || 0) !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>
                </div>
                <p className="text-xl font-bold text-amber-700">
                  ₹{appointment.total_amount}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Services */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
                <Icon.Sparkles className="h-4 w-4" />
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Services
              </h2>
              <span className="ml-2 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {appointment.appointment_services?.length || 0}
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">
              ₹{appointment.total_amount} total
            </p>
          </div>

          <div className="divide-y divide-slate-100 p-2">
            {(!appointment.appointment_services ||
              appointment.appointment_services.length === 0) && (
              <div className="px-4 py-12 text-center">
                <p className="text-sm text-slate-500">
                  No services attached to this appointment.
                </p>
              </div>
            )}

            {appointment.appointment_services?.map((item, idx) => (
              <div
                key={item.id}
                className="group rounded-xl p-4 transition hover:bg-slate-50 sm:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-violet-500 to-purple-600 text-sm font-semibold text-white shadow-sm">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-slate-900">
                        {item.services?.name || "Service"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {item.services?.description || "No description"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                    <p className="text-lg font-bold text-slate-900">
                      ₹{item.price}
                    </p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                      <Icon.Timer className="h-3 w-3" />
                      {item.duration_minutes} min
                    </span>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                      <Icon.Badge className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">
                        Staff
                      </p>
                      <p className="truncate text-sm font-medium text-slate-900">
                        {item.staff?.name || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      <Icon.User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">
                        Role
                      </p>
                      <p className="truncate text-sm font-medium text-slate-700">
                        {item.staff?.role
                          ? item.staff.role
                              .replace(/_/g, " ")
                              .replace(/\b\w/g, (c) => c.toUpperCase())
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-50 text-sky-600">
                      <Icon.Clock className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-slate-500">
                        Service Time
                      </p>
                      <p className="truncate text-sm font-medium text-slate-900">
                        {formatTime(item.start_time)} –{" "}
                        {formatTime(item.end_time)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          All times shown in Asia/Kolkata (IST)
        </p>
      </div>
    </div>
  );
}
