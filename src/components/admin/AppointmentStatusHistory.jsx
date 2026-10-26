"use client";

import { useEffect, useState } from "react";

const LABELS = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  in_service: "In Service",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

function label(status) {
  return status ? LABELS[status] || status.replaceAll("_", " ") : "Unknown status";
}

function formatTime(value) {
  if (!value) return "Time unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
}

export default function AppointmentStatusHistory({ appointmentId, refreshKey = 0 }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function loadHistory() {
      setLoading(true);
      setError("");
      try {
        if (!appointmentId) throw new Error("Appointment ID is unavailable.");
        const response = await fetch(
          `/api/admin/appointments/${encodeURIComponent(appointmentId)}/history`,
          { signal: controller.signal, cache: "no-store" }
        );
        const result = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(result?.error || `Could not load status history (HTTP ${response.status}).`);
        }
        if (!Array.isArray(result?.history)) {
          throw new Error("The status history response was invalid.");
        }
        setEntries(result.history);
      } catch (loadError) {
        if (loadError.name !== "AbortError") setError(loadError.message || "Failed to load status history.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    if (appointmentId) loadHistory();
    return () => controller.abort();
  }, [appointmentId, refreshKey]);

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm" aria-labelledby="status-history-title">
      <h2 id="status-history-title" className="text-base font-semibold text-slate-900">Status history</h2>
      {loading ? (
        <p className="mt-4 text-sm text-slate-500" role="status">Loading status history…</p>
      ) : error ? (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">{error}</p>
      ) : entries.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No status history is available for this appointment.</p>
      ) : (
        <ol className="mt-4 divide-y divide-slate-100">
          {entries.map((entry, index) => {
            const time = entry.transitioned_at || entry.created_at || entry.changed_at;
            const actor = entry.business_admin_id;
            const skipped = Array.isArray(entry.skipped_stages) ? entry.skipped_stages : [];
            return (
              <li key={entry.id || `${entry.previous_status}-${entry.new_status}-${time || index}`} className="py-4 first:pt-0 last:pb-0">
                <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-start">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-800">
                    {entry.previous_status ? (
                      <>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{label(entry.previous_status)}</span>
                        <span aria-hidden="true" className="text-slate-400">→</span>
                        <span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">{label(entry.new_status)}</span>
                      </>
                    ) : entry.new_status ? (
                      <><span className="text-slate-500">Initial status</span><span className="rounded-md bg-blue-50 px-2 py-1 text-blue-800">{label(entry.new_status)}</span></>
                    ) : "Status change"}
                  </div>
                  <time dateTime={time || undefined} className="text-xs text-slate-500">{formatTime(time)}</time>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{actor ? `Admin ID: ${actor}` : "No admin recorded"}</span>
                  {skipped.length > 0 && <span>Skipped: {skipped.map(label).join(", ")}</span>}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
