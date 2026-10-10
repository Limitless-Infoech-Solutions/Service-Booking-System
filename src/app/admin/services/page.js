"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

export default function AdminServicesPage() {
  const router = useRouter();

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);

  const [filter, setFilter] = useState("all");

  // Staff assignment modal state
  const [selectedService, setSelectedService] = useState(null);
  const [staff, setStaff] = useState([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");

  async function fetchServices() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/services?business_id=${BUSINESS_ID}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load services");
      }

      setServices(data.services || []);
    } catch (error) {
      console.error("Services fetch error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchServices();
  }, []);

  // Deactivate or reactivate a service
  async function handleActiveStatus(service, isActive) {
    const action = isActive ? "deactivate" : "reactivate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} "${service.name}"?`
    );

    if (!confirmed) return;

    try {
      setUpdatingId(service.id);

      const response = await fetch("/api/admin/services", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: service.id,
          business_id: BUSINESS_ID,
          name: service.name,
          description: service.description,
          price: service.price,
          duration_minutes: service.duration_minutes,
          buffer_minutes: service.buffer_minutes,
          category: service.category,
          badge: service.badge,
          image: service.image,
          is_active: !isActive,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} service`);
      }

      setServices((previous) =>
        previous.map((item) =>
          item.id === service.id
            ? { ...item, ...data.service }
            : item
        )
      );
    } catch (error) {
      console.error("Service status update error:", error);
      window.alert(error.message);
    } finally {
      setUpdatingId(null);
    }
  }

  // Open the staff assignment modal and fetch staff from the backend
  async function openStaffModal(service) {
    setSelectedService(service);
    setStaff([]);
    setSelectedStaffIds(
      (service.staff_services || []).map((assignment) => assignment.staff_id)
    );
    setAssignmentError("");
    setLoadingStaff(true);

    try {
      const response = await fetch(
        `/api/admin/staff?business_id=${BUSINESS_ID}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch staff");
      }

      setStaff(data.staff || []);
    } catch (error) {
      console.error("Staff fetch error:", error);
      setAssignmentError(error.message);
    } finally {
      setLoadingStaff(false);
    }
  }

  function closeStaffModal() {
    if (savingAssignments) return;

    setSelectedService(null);
    setStaff([]);
    setSelectedStaffIds([]);
    setAssignmentError("");
  }

  function toggleStaff(staffId) {
    setSelectedStaffIds((previous) =>
      previous.includes(staffId)
        ? previous.filter((id) => id !== staffId)
        : [...previous, staffId]
    );
  }

  // Save the selected staff assignments
  async function handleSaveAssignments() {
    if (!selectedService) return;

    try {
      setSavingAssignments(true);
      setAssignmentError("");

      const response = await fetch("/api/admin/staff/assign-staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          business_id: BUSINESS_ID,
          service_id: selectedService.id,
          staff_ids: selectedStaffIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save staff assignments");
      }

      // Refresh from the database so status and staff count are current.
      await fetchServices();

      setSelectedService(null);
      setStaff([]);
      setSelectedStaffIds([]);
    } catch (error) {
      console.error("Save staff assignments error:", error);
      setAssignmentError(error.message);
    } finally {
      setSavingAssignments(false);
    }
  }

  const activeCount = services.filter(
    (service) => service.is_active
  ).length;

  const inactiveCount = services.filter(
    (service) => !service.is_active
  ).length;

  const filteredServices = services
    .filter((service) => {
      if (filter === "active") return service.is_active;
      if (filter === "inactive") return !service.is_active;
      return true;
    })
    .sort((a, b) => Number(b.is_active) - Number(a.is_active));

  if (loading) {
    return (
      <main className="p-6">
        <div className="mb-6">
          <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="space-y-4 p-6">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-14 animate-pulse rounded-lg bg-gray-100"
              />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-semibold text-gray-900">
            Services
          </h1>

          <p className="mt-2 text-sm text-red-600">{error}</p>

          <button
            onClick={fetchServices}
            className="mt-4 rounded-lg bg-black px-4 py-2 text-sm text-white"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      {/* Header */}
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Services
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage services, staff assignments, and service status.
          </p>
        </div>

        <button
          onClick={() => router.push("/admin/services/AddServices")}
          className="cursor-pointer rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          + Add Service
        </button>
      </div>

      {/* Counts */}
      <div className="mb-5 flex flex-wrap gap-3">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg border px-4 py-3 text-left ${
            filter === "all"
              ? "border-black bg-gray-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <span className="block text-sm text-gray-500">All Services</span>
          <span className="mt-1 block text-xl font-semibold">
            {services.length}
          </span>
        </button>

        <button
          onClick={() => setFilter("active")}
          className={`rounded-lg border px-4 py-3 text-left ${
            filter === "active"
              ? "border-green-600 bg-green-50"
              : "border-gray-200 bg-white"
          }`}
        >
          <span className="block text-sm text-gray-500">Active</span>
          <span className="mt-1 block text-xl font-semibold">
            {activeCount}
          </span>
        </button>

        <button
          onClick={() => setFilter("inactive")}
          className={`rounded-lg border px-4 py-3 text-left ${
            filter === "inactive"
              ? "border-gray-500 bg-gray-100"
              : "border-gray-200 bg-white"
          }`}
        >
          <span className="block text-sm text-gray-500">Inactive</span>
          <span className="mt-1 block text-xl font-semibold">
            {inactiveCount}
          </span>
        </button>
      </div>

      {/* Services table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-275">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                {[
                  "Service",
                  "Category",
                  "Price",
                  "Duration",
                  "Staff",
                  "Setup Status",
                  "State",
                  "Actions",
                ].map((heading) => (
                  <th
                    key={heading}
                    className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredServices.map((service) => (
                <tr
                  key={service.id}
                  className={`border-b border-gray-100 last:border-0 ${
                    service.is_active
                      ? "hover:bg-gray-50/70"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <td className="px-5 py-5">
                    <div className="min-w-44">
                      <div
                        className={`font-medium ${
                          service.is_active
                            ? "text-gray-900"
                            : "text-gray-500"
                        }`}
                      >
                        {service.name}
                      </div>

                      {service.description && (
                        <div className="mt-1 line-clamp-2 max-w-64 text-sm">
                          {service.description}
                        </div>
                      )}
                    </div>
                  </td>

                  <td className="px-5 py-5 text-sm">
                    {service.category || "Others"}
                  </td>

                  <td className="px-5 py-5 font-medium">
                    ₹{Number(service.price).toLocaleString("en-IN")}
                  </td>

                  <td className="px-5 py-5 text-sm">
                    {service.duration_minutes} min
                  </td>

                  <td className="px-5 py-5">
                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                      {service.staff_count || 0}
                    </span>
                  </td>

                  {/* Setup status comes from the database */}
                  <td className="px-5 py-5">
                    {service.status === "completed" ? (
                      <span className="inline-flex rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                        Incomplete
                      </span>
                    )}
                  </td>

                  {/* Active state is separate from setup status */}
                  <td className="px-5 py-5">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${
                        service.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {service.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          router.push(`/admin/services/${service.id}/edit`)
                        }
                        className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => openStaffModal(service)}
                        className="cursor-pointer whitespace-nowrap rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-50"
                      >
                        {service.staff_count > 0
                          ? "Manage Staff"
                          : "Assign Staff"}
                      </button>

                      <button
                        onClick={() =>
                          handleActiveStatus(service, service.is_active)
                        }
                        disabled={updatingId === service.id}
                        className={`cursor-pointer whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium disabled:opacity-50 ${
                          service.is_active
                            ? "border-red-200 bg-white text-red-600 hover:bg-red-50"
                            : "border-green-200 bg-white text-green-700 hover:bg-green-50"
                        }`}
                      >
                        {updatingId === service.id
                          ? "Updating..."
                          : service.is_active
                            ? "Deactivate"
                            : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center">
                    <h3 className="font-medium text-gray-900">
                      No services found
                    </h3>

                    <p className="mt-1 text-sm text-gray-500">
                      There are no services matching this filter.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff assignment modal */}
      {selectedService && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !savingAssignments
            ) {
              closeStaffModal();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="staff-modal-title"
            className="w-full max-w-lg rounded-2xl bg-white shadow-xl"
          >
            <div className="border-b border-gray-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2
                    id="staff-modal-title"
                    className="text-xl font-semibold text-gray-900"
                  >
                    Manage Staff
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Service: {selectedService.name}
                  </p>
                </div>

                <button
                  onClick={closeStaffModal}
                  disabled={savingAssignments}
                  aria-label="Close modal"
                  className="rounded-lg px-2 py-1 text-xl text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-5">
              <p className="mb-4 text-sm text-gray-600">
                Select the staff members who can perform this service.
              </p>

              {assignmentError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {assignmentError}
                </div>
              )}

              {loadingStaff ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-14 animate-pulse rounded-lg bg-gray-100"
                    />
                  ))}
                </div>
              ) : staff.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
                  <p className="text-sm text-gray-600">
                    No active staff members were found.
                  </p>
                </div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto">
                  {staff.map((member) => (
                    <label
                      key={member.id}
                      className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                        selectedStaffIds.includes(member.id)
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedStaffIds.includes(member.id)}
                        onChange={() => toggleStaff(member.id)}
                        disabled={savingAssignments}
                        className="h-4 w-4 accent-blue-600"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {member.name}
                        </p>

                        {member.role && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {member.role}
                          </p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-5 border-t border-gray-100 pt-4">
                <p className="text-sm text-gray-600">
                  Need another staff member?
                </p>

                <button
                  type="button"
                  disabled={savingAssignments}
                  onClick={() =>
                    router.push(
                      `/admin/staff/new?service_id=${encodeURIComponent(
                        selectedService.id
                      )}`
                    )
                  }
                  className="mt-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  + Create New Staff
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-200 p-5">
              <button
                type="button"
                onClick={closeStaffModal}
                disabled={savingAssignments}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveAssignments}
                disabled={loadingStaff || savingAssignments}
                className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingAssignments ? "Saving..." : "Save Assignments"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}