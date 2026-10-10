
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

export default function ServiceStaffPage() {
  const { service_id } = useParams();
  const router = useRouter();

  const [staff, setStaff] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);
  const [staffType, setStaffType] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStaff() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/staff?business_id=${BUSINESS_ID}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load staff");
        }

        setStaff(data.staff || []);
      } catch (error) {
        console.error("Staff page error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    if (service_id) {
      fetchStaff();
    }
  }, [service_id]);

  function toggleStaff(staffId) {
    setSelectedStaff((previous) => {
      if (previous.includes(staffId)) {
        return previous.filter((id) => id !== staffId);
      }

      return [...previous, staffId];
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm text-gray-500">Loading staff...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-gray-50 p-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/services")}
            className="mb-4 text-sm text-gray-500 transition hover:text-gray-900"
          >
            ← Back to Services
          </button>

          <h1 className="text-2xl font-semibold text-gray-900">
            Assign Staff
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Choose who can perform this service.
          </p>
        </div>

        {/* Staff Type Selection */}
        <div className="mb-6">
          <h2 className="mb-3 text-lg font-semibold text-gray-900">
            How do you want to assign staff?
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">

            {/* Existing Staff */}
            <button
              type="button"
              onClick={() => setStaffType("existing")}
              className={`rounded-xl border p-5 text-left transition ${
                staffType === "existing"
                  ? "border-gray-900 bg-white shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  👥
                </div>

                {staffType === "existing" && (
                  <span className="text-sm font-medium text-gray-900">
                    Selected
                  </span>
                )}
              </div>

              <p className="font-medium text-gray-900">
                Existing Staff
              </p>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Choose from staff members already added to your business.
              </p>
            </button>

            {/* New Staff */}
            <button
              type="button"
              onClick={() => setStaffType("new")}
              className={`rounded-xl border p-5 text-left transition ${
                staffType === "new"
                  ? "border-gray-900 bg-white shadow-sm"
                  : "border-gray-200 bg-white hover:border-gray-400"
              }`}
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100">
                  +
                </div>

                {staffType === "new" && (
                  <span className="text-sm font-medium text-gray-900">
                    Selected
                  </span>
                )}
              </div>

              <p className="font-medium text-gray-900">
                New Staff
              </p>

              <p className="mt-1 text-sm leading-5 text-gray-500">
                Add a new staff member and assign them to this service.
              </p>
            </button>

          </div>
        </div>

        {/* Existing Staff */}
        {staffType === "existing" && (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">

            <div className="border-b border-gray-200 px-5 py-4">
              <h2 className="font-medium text-gray-900">
                Select Staff
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select one or more staff members who can perform this service.
              </p>
            </div>

            {staff.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-gray-500">
                  No active staff members found.
                </p>

                <button
                  type="button"
                  onClick={() => setStaffType("new")}
                  className="mt-4 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Add New Staff
                </button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-gray-100">
                  {staff.map((member) => {
                    const isSelected = selectedStaff.includes(member.id);

                    return (
                      <button
                        key={member.id}
                        type="button"
                        onClick={() => toggleStaff(member.id)}
                        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {member.name}
                          </p>

                          <p className="mt-1 text-sm text-gray-500">
                            {member.role || "Staff member"}
                          </p>
                        </div>

                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border text-xs ${
                            isSelected
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          {isSelected && "✓"}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between border-t border-gray-200 px-5 py-4">
                  <p className="text-sm text-gray-500">
                    {selectedStaff.length}{" "}
                    {selectedStaff.length === 1 ? "staff" : "staff"} selected
                  </p>

                  <button
                    type="button"
                    disabled={selectedStaff.length === 0}
                    className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Continue
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* New Staff */}
        {staffType === "new" && (
  <div className="rounded-xl border border-gray-200 bg-white p-6">
    <div className="mb-6">
      <h2 className="font-medium text-gray-900">
        Add New Staff
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Add a staff member who will perform this service.
      </p>
    </div>

    <div className="space-y-5">
      {/* Staff Name */}
      <div>
        <label
          htmlFor="staff-name"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Staff Name
        </label>

        <input
          id="staff-name"
          type="text"
          placeholder="e.g. Sarah Khan"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900"
        />
      </div>

      {/* Role */}
      <div>
        <label
          htmlFor="staff-role"
          className="mb-2 block text-sm font-medium text-gray-700"
        >
          Role
        </label>

        <input
          id="staff-role"
          type="text"
          placeholder="e.g. Massage Therapist"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none transition focus:border-gray-900"
        />
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          Add Staff & Continue
        </button>
      </div>
    </div>
  </div>
)}

      </div>
    </main>
  );
}
