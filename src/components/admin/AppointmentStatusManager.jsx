"use client";

import { useEffect, useRef, useState } from "react";
import { LockKeyhole } from "lucide-react";
import AppointmentStatusHistory from "@/components/admin/AppointmentStatusHistory";

const FLOW = [
  ["confirmed", "Confirmed"],
  ["arrived", "Arrived"],
  ["in_service", "In Service"],
  ["completed", "Completed"],
];

const LABELS = {
  confirmed: "Confirmed",
  arrived: "Arrived",
  in_service: "In Service",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};
const SERVICE_START_GRACE_MS = 2 * 60 * 1000;

function getBusinessTimestamp(value) {
  if (!value) return NaN;
  const normalized = value.replace?.(" ", "T") || value;
  const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  return new Date(hasTimezone ? normalized : `${normalized}+05:30`).getTime();
}

function isTerminal(status) {
  return ["completed", "cancelled", "no_show"].includes(status);
}

export default function AppointmentStatusManager({
  appointment,
  onUpdated,
  presentation = "inline",
  onClose,
}) {
  const isModal = presentation === "modal";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [now, setNow] = useState(0);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const submitting = useRef(false);
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const returnFocusRef = useRef(null);

  const status = appointment.status;
  useEffect(() => {
    const initialUpdate = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      clearTimeout(initialUpdate);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    if (!isModal) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isModal]);
  useEffect(() => {
    if (!isModal) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === "Escape" && !busy && !confirmation) onClose?.();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isModal, busy, confirmation, onClose]);
  useEffect(() => {
    if (!confirmation) {
      returnFocusRef.current?.focus?.();
      returnFocusRef.current = null;
      return undefined;
    }

    confirmButtonRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) {
        setConfirmation(null);
        return;
      }

      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll("button:not([disabled])") || []
        );
        if (focusable.length < 1) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [confirmation, busy]);

  const startMs = getBusinessTimestamp(appointment.start_time);
  const startTimeValid = Number.isFinite(startMs);
  const noShowEligible = startTimeValid && now > startMs;
  const serviceEligible = startTimeValid && now >= startMs + SERVICE_START_GRACE_MS;
  const serviceAvailableAt = startTimeValid
    ? new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }).format(startMs + SERVICE_START_GRACE_MS)
    : null;
  const terminal = isTerminal(status);
  const nextStatus = {
    confirmed: "arrived",
    arrived: "in_service",
    in_service: "completed",
  }[status];

  async function transitionTo(newStatus) {
    if (submitting.current || !appointment.id) return;
    if (["in_service", "completed"].includes(newStatus) && !serviceEligible) {
      setError(
        startTimeValid
          ? `Service time has not started yet. You can mark the customer as arrived, but the appointment cannot be marked In Service or Completed until the scheduled start time and two-minute grace period have passed${serviceAvailableAt ? ` (available at ${serviceAvailableAt}).` : "."}`
          : "In Service and Completed are unavailable because the scheduled start time could not be loaded."
      );
      return;
    }
    if (newStatus === "no_show" && !noShowEligible) {
      setError("No-show is available only after the scheduled start time.");
      return;
    }
    submitting.current = true;
    setBusy(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch(
        `/api/admin/appointments/${encodeURIComponent(appointment.id)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            expected_status: status,
            new_status: newStatus,
          }),
        }
      );
      const result = await response.json().catch(() => ({}));

      if (response.status === 409) {
        await onUpdated?.();
        setHistoryRefreshKey((key) => key + 1);
        window.dispatchEvent(new Event("appointment-status-updated"));
        setNotice(
          "This appointment status changed. The latest status has been loaded."
        );
        return;
      }
      if (!response.ok) {
        throw new Error(result.error || "Could not update appointment status.");
      }

      await onUpdated?.();
      window.dispatchEvent(new Event("appointment-status-updated"));
      if (isModal) onClose?.();
      else setNotice(`Status updated to ${LABELS[newStatus] || newStatus}.`);
    } catch (requestError) {
      setError(requestError.message || "Could not update appointment status.");
    } finally {
      submitting.current = false;
      setBusy(false);
      setConfirmation(null);
    }
  }

  function requestTransition(newStatus, confirmTitle, confirmMessage) {
    if (busy) return;
    if (confirmTitle) {
      returnFocusRef.current = document.activeElement;
      setConfirmation({
        newStatus,
        title: confirmTitle,
        message: confirmMessage,
      });
    } else {
      transitionTo(newStatus);
    }
  }

  return (
    <>
      <div
        className={
          isModal
            ? "fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/50 p-3 sm:p-6"
            : "contents"
        }
        onMouseDown={
          isModal
            ? (event) => {
                if (event.target === event.currentTarget && !busy) onClose?.();
              }
            : undefined
        }
      >
        <section
          role={isModal ? "dialog" : undefined}
          aria-modal={isModal ? "true" : undefined}
          className={`${
            isModal
              ? "relative z-10 my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto p-4 sm:max-h-[calc(100dvh-3rem)] sm:p-6"
              : "mb-6 p-6"
          } rounded-2xl border border-slate-200 bg-white shadow-2xl`}
          aria-labelledby="appointment-status-title"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2
                id="appointment-status-title"
                className="text-base font-semibold text-slate-900"
              >
                Appointment status
              </h2>
              {isModal && (
                <p className="mt-1 text-sm text-slate-500">
                  {appointment.customers?.name || "Unknown customer"} ·{" "}
                  {appointment.start_time
                    ? new Intl.DateTimeFormat("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: "Asia/Kolkata",
                      }).format(new Date(appointment.start_time))
                    : "Time unavailable"}
                </p>
              )}
              <p className="mt-1 text-sm text-slate-500">
                Current status:{" "}
                <span className="font-medium text-slate-800">
                  {LABELS[status] || "Unknown"}
                </span>
              </p>
            </div>
            {nextStatus && !isModal && (
              <button
                type="button"
                disabled={busy}
                onClick={() => requestTransition(nextStatus)}
                className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {busy
                  ? "Updating…"
                  : status === "confirmed"
                  ? "Mark as Arrived"
                  : status === "arrived"
                  ? "Start Service"
                  : "Mark as Completed"}
              </button>
            )}
          </div>

          <ol
            className={`mt-5 grid gap-2 ${isModal ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-4"}`}
            aria-label="Appointment status progression"
          >
            {FLOW.map(([flowStatus, label], index) => {
              const currentIndex = FLOW.findIndex(([key]) => key === status);
              const active = flowStatus === status;
              const passed = currentIndex >= 0 && index < currentIndex;
              const skipped = status === "cancelled" || status === "no_show";
              const locked = isModal && !active && !passed && flowStatus !== nextStatus;
              return (
                <li
                  key={flowStatus}
                  aria-current={active ? "step" : undefined}
                  className={`w-full rounded-lg border text-sm ${
                    active
                      ? "border-blue-300 bg-blue-50 font-semibold text-blue-800"
                      : passed
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-slate-50 text-slate-400"
                  }`}
                >
                  {isModal && flowStatus === nextStatus ? (
                    <button
                      type="button"
                      disabled={busy || (["in_service", "completed"].includes(flowStatus) && !serviceEligible)}
                      aria-pressed={pendingStatus === flowStatus}
                      onClick={() => setPendingStatus(flowStatus)}
                      className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 text-left transition focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 ${
                        pendingStatus === flowStatus
                          ? "bg-blue-100 font-semibold text-blue-900"
                          : "text-blue-800 hover:bg-blue-100/70"
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-800">
                          {skipped ? "·" : index + 1}
                        </span>
                        <span>{label}</span>
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                        {pendingStatus === flowStatus ? "Selected" : (["in_service", "completed"].includes(flowStatus) && !serviceEligible) ? "Unavailable" : "Next"}
                      </span>
                    </button>
                  ) : (
                    <div className={`flex min-h-12 w-full items-center justify-between gap-3 rounded-lg px-4 py-3 ${locked ? "text-slate-400" : ""}`}>
                      <span className="flex items-center gap-3">
                        <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-blue-100 text-blue-800" : passed ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-500"}`}>
                          {skipped ? "·" : passed ? "✓" : index + 1}
                        </span>
                        <span className={active ? "font-semibold" : ""}>{label}</span>
                      </span>
                      {isModal && (
                        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${active ? "text-blue-700" : passed ? "text-emerald-700" : "text-slate-400"}`}>
                          {locked ? <LockKeyhole size={14} aria-hidden="true" /> : null}
                          {active ? "Current" : passed ? "Completed" : locked ? "Locked" : ""}
                        </span>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {isModal && terminal && (
            <p className="mt-4 rounded-lg bg-slate-100 px-3 py-2 text-sm text-slate-600">
              This appointment is in a terminal status. No further status
              progression is available.
            </p>
          )}
          {isModal && !terminal && (status === "confirmed" || status === "arrived") && !serviceEligible && (
            <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="status">
              {startTimeValid
                ? `Arrived remains available. In Service and Completed are unavailable until the scheduled start time plus the two-minute grace period (${serviceAvailableAt}).`
                : "In Service and Completed are unavailable because the scheduled start time could not be loaded."}
            </p>
          )}
          {isModal && (
            <section
              className="mt-5 rounded-xl border border-blue-100 bg-blue-50/60 p-4"
              aria-label="Selected status action"
            >
              <h3 className="text-sm font-semibold text-slate-900">
                Selected action
              </h3>
              <p className="mt-1 text-sm text-slate-700">
                {pendingStatus
                  ? `Change status to ${LABELS[pendingStatus]}.`
                  : nextStatus
                  ? `Next available status: ${LABELS[nextStatus]}. Select it above to continue.`
                  : "No further status change is available."}
              </p>
              {nextStatus && (
                <p className="mt-1 text-xs text-slate-500">
                  Selecting a status does not submit the change. Confirm below
                  to update this appointment.
                </p>
              )}
            </section>
          )}
          {!terminal && (
            <div className="mt-5 border-t border-slate-100 pt-4">
              <button
                type="button"
                aria-expanded={moreOptionsOpen}
                aria-controls="appointment-status-more-options"
                onClick={() => setMoreOptionsOpen((open) => !open)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                More Options
                <span aria-hidden="true">{moreOptionsOpen ? "−" : "+"}</span>
              </button>
              {moreOptionsOpen && (
                <div
                  id="appointment-status-more-options"
                  className="mt-3 flex flex-wrap gap-2"
                >
                  {status === "confirmed" && (
                    <button
                      type="button"
                      disabled={busy || !serviceEligible}
                      title={!serviceEligible ? `Available at ${serviceAvailableAt || "the scheduled start time plus two minutes"}.` : undefined}
                      onClick={() =>
                        requestTransition(
                          "in_service",
                          "Start service now?",
                          "Are you sure you want to start service now? This will skip the Arrived stage."
                        )
                      }
                      className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-medium text-blue-800 hover:bg-blue-50 disabled:opacity-50"
                    >
                      Start Service
                    </button>
                  )}
                  {(status === "confirmed" || status === "arrived") && (
                    <button
                      type="button"
                      disabled={busy || !serviceEligible}
                      title={!serviceEligible ? `Available at ${serviceAvailableAt || "the scheduled start time plus two minutes"}.` : undefined}
                      onClick={() =>
                        requestTransition(
                          "completed",
                          "Mark appointment as completed?",
                          "Are you sure you want to mark this appointment as completed? This will skip the remaining stages."
                        )
                      }
                      className="rounded-lg border border-emerald-200 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-50"
                    >
                      Mark as Completed
                    </button>
                  )}
                  {status === "confirmed" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        requestTransition(
                          "cancelled",
                          "Cancel appointment?",
                          "Are you sure you want to cancel this confirmed appointment?"
                        )
                      }
                      className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      Cancel Appointment
                    </button>
                  )}
                  {status === "confirmed" && (
                    <button
                      type="button"
                      disabled={busy || !noShowEligible}
                      title={
                        !noShowEligible
                          ? "No-show is available after the scheduled start time."
                          : undefined
                      }
                      onClick={() =>
                        requestTransition(
                          "no_show",
                          "Mark appointment as no-show?",
                          "Are you sure you want to mark this appointment as a no-show?"
                        )
                      }
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark as No-show
                    </button>
                  )}
                </div>
              )}
              {status === "confirmed" && !noShowEligible && (
                <p className="mt-2 text-xs text-slate-500" role="status">
                  {startTimeValid
                    ? "No-show becomes available after the scheduled start time."
                    : "No-show is unavailable because the scheduled start time could not be loaded."}
                </p>
              )}
            </div>
          )}

          {error && (
            <p
              className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700"
              role="alert"
            >
              {error}
            </p>
          )}
          {notice && (
            <p
              className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
              role="status"
            >
              {notice}
            </p>
          )}
          {isModal && (
            <AppointmentStatusHistory
              appointmentId={appointment.id}
              refreshKey={historyRefreshKey}
            />
          )}
          {isModal && (
            <footer className="mt-5 flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Close
              </button>
              {nextStatus && (
                <button
                  type="button"
                  disabled={busy || !pendingStatus}
                  onClick={() => transitionTo(pendingStatus)}
                  className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {busy ? "Updating…" : "Confirm Status Change"}
                </button>
              )}
            </footer>
          )}

          {confirmation && (
            <div
              className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-3 sm:items-center"
              onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy)
                  setConfirmation(null);
              }}
            >
              <section
                ref={dialogRef}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="status-confirm-title"
                aria-describedby="status-confirm-message"
                className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
              >
                <h3
                  id="status-confirm-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  {confirmation.title}
                </h3>
                <p
                  id="status-confirm-message"
                  className="mt-2 text-sm leading-6 text-slate-600"
                >
                  {confirmation.message}
                </p>
                <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmation(null)}
                    className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    ref={confirmButtonRef}
                    type="button"
                    disabled={busy}
                    onClick={() => transitionTo(confirmation.newStatus)}
                    className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
                  >
                    {busy ? "Updating…" : "Confirm"}
                  </button>
                </div>
              </section>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
