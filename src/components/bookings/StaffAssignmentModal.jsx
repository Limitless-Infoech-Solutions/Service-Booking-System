"use client";

import { useMemo, useState } from "react";

export default function StaffAssignmentModal({
  services,
  staffAvailability,
  automaticAssignments,
  onCancel,
  onConfirm,
  isSaving,
}) {
  const [mode, setMode] = useState("automatic");
  const [perService, setPerService] = useState({});
  const [error, setError] = useState("");

  const staffById = useMemo(
    () => new Map(staffAvailability.map((staff) => [staff.staff_id, staff])),
    [staffAvailability]
  );

  const assignments =
    mode === "automatic"
      ? automaticAssignments
      : services.map((service) => ({
          service_id: service.id,
          staff_id: perService[service.id] || "",
        }));

  const submit = () => {
    if (!assignments?.length || assignments.some((item) => !item.staff_id)) {
      setError("Choose an eligible staff member for every service.");
      return;
    }
    onConfirm(mode, mode === "manual" ? assignments : undefined);
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/60 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-title"
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
      >
        <h2
          id="assignment-title"
          className="text-xl font-semibold text-slate-900"
        >
          Assign staff
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Choose how staff will be assigned. The server rechecks the complete
          schedule when reserving the hold.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {["automatic", "manual"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setMode(option);
                setError("");
              }}
              className={`rounded-xl border p-4 text-left ${
                mode === option
                  ? "border-slate-900 bg-slate-50"
                  : "border-slate-200"
              }`}
            >
              <span className="font-semibold capitalize text-slate-900">
                {option} assignment
              </span>
              <span className="mt-1 block text-sm text-slate-500">
                {option === "automatic"
                  ? "Use the existing automatic allocator."
                  : "Assign each service separately to qualified staff."}
              </span>
            </button>
          ))}
        </div>

        {mode === "automatic" ? (
          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <h3 className="font-medium text-slate-900">Proposed assignments</h3>
            <div className="mt-3 space-y-2">
              {services.map((service) => {
                const assignment = automaticAssignments.find(
                  (item) => item.service_id === service.id
                );
                const staff = staffById.get(assignment?.staff_id);
                return (
                  <p key={service.id} className="text-sm text-slate-700">
                    {service.name}:{" "}
                    <b>{staff?.name || "Staff assignment unavailable"}</b>
                  </p>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {services.map((service) => {
              const qualified = staffAvailability.filter((staff) =>
                staff.assignable_service_ids?.includes(service.id)
              );
              return (
                <label
                  key={service.id}
                  className="block rounded-xl border border-slate-200 p-4 text-sm font-medium text-slate-700"
                >
                  {service.name}
                  <select
                    className="mt-2 h-11 w-full rounded-lg border border-slate-300 px-3"
                    value={perService[service.id] || ""}
                    onChange={(event) =>
                      setPerService((current) => ({
                        ...current,
                        [service.id]: event.target.value,
                      }))
                    }
                  >
                    <option value="">Select qualified staff</option>
                    {qualified.map((staff) => (
                      <option key={staff.staff_id} value={staff.staff_id}>
                        {staff.name} ·{" "}
                        {staff.free_intervals
                          .map((interval) => interval.label)
                          .join(", ") || "No free intervals"}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-xs font-normal text-slate-500">
                    Free intervals:{" "}
                    {qualified
                      .map(
                        (staff) =>
                          `${staff.name}: ${
                            staff.free_intervals
                              .map((interval) => interval.label)
                              .join(", ") || "none"
                          }`
                      )
                      .join(" · ") || "No qualified staff"}
                  </span>
                </label>
              );
            })}
          </div>
        )}

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={isSaving}
            className="rounded-lg bg-slate-900 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {isSaving ? "Reserving…" : "Review assignment and reserve"}
          </button>
        </div>
      </section>
    </div>
  );
}