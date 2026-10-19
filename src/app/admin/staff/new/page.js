"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  UserRound,
  BriefcaseBusiness,
  Search,
  Check,
  LoaderCircle,
  Scissors,
  AlertCircle,
} from "lucide-react";

// 1. Extract your main component logic into an inner component
function NewStaffForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialServiceId = searchParams.get("service_id");

  const [name, setName] = useState("");
  const [role, setRole] = useState("");

  const [services, setServices] = useState([]);
  const [selectedServiceIds, setSelectedServiceIds] = useState([]);

  const [search, setSearch] = useState("");
  const [loadingServices, setLoadingServices] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoadingServices(true);
        setError("");

        const response = await fetch(
          "/api/admin/services"
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to fetch services");
        }

        const allServices = result.services || [];
        setServices(allServices);

        if (initialServiceId) {
          const originatingService = allServices.find(
            (service) => service.id === initialServiceId
          );

          if (originatingService) {
            setSelectedServiceIds([originatingService.id]);
          } else {
            setError(
              "The originating service could not be found. You can still select services below."
            );
          }
        }
      } catch (err) {
        console.error("Fetch services error:", err);
        setError(err.message || "Could not load services.");
      } finally {
        setLoadingServices(false);
      }
    }

    fetchServices();
  }, [initialServiceId]);

  function toggleService(serviceId) {
    setSelectedServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  const filteredServices = services.filter((service) =>
    service.name.toLowerCase().includes(search.toLowerCase())
  );

  const activeServices = filteredServices.filter(
    (service) => service.is_active
  );

  const inactiveServices = filteredServices.filter(
    (service) => !service.is_active
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!name.trim() || !role.trim()) {
      setError("Please enter the staff member's name and role.");
      return;
    }

    if (initialServiceId && selectedServiceIds.length === 0) {
      setError(
        "Please select at least one service when creating staff from the Services page."
      );
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/admin/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          service_ids: selectedServiceIds,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create staff member.");
      }

      if (initialServiceId) {
        router.push("/admin/services");
      } else {
        router.push("/admin/staff");
      }

      router.refresh();
    } catch (err) {
      console.error("Create staff error:", err);
      setError(err.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-4 py-6 text-[#0b0e14] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <button
          type="button"
          onClick={() =>
            router.push(
              initialServiceId ? "/admin/services" : "/admin/staff"
            )
          }
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-600 transition hover:text-[#1e9be0]"
        >
          <ArrowLeft size={17} />
          Back to {initialServiceId ? "Services" : "Staff"}
        </button>

        <div className="mb-8">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-[#1e9be0]">
            <UserRound size={23} />
          </div>

          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Add New Staff
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            Add a team member and choose the services they can perform.
            Service assignment is optional when creating staff directly
            from the Staff page.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Staff Details */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                <BriefcaseBusiness size={19} />
              </div>

              <div>
                <h2 className="font-semibold">Staff Details</h2>
                <p className="text-sm text-gray-500">
                  Enter the basic information.
                </p>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="staff-name"
                  className="mb-2 block text-sm font-medium"
                >
                  Full Name <span className="text-red-500">*</span>
                </label>

                <input
                  id="staff-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Enter staff name"
                  required
                  maxLength={100}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#1e9be0] focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label
                  htmlFor="staff-role"
                  className="mb-2 block text-sm font-medium"
                >
                  Role <span className="text-red-500">*</span>
                </label>

                <input
                  id="staff-role"
                  type="text"
                  value={role}
                  onChange={(event) => setRole(event.target.value)}
                  placeholder="e.g. Hair Stylist"
                  required
                  maxLength={100}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:border-[#1e9be0] focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>
          </section>

          {/* Service Assignment */}
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1e9be0]">
                  <Scissors size={19} />
                </div>

                <div>
                  <h2 className="font-semibold">Assign Services</h2>
                  <p className="text-sm text-gray-500">
                    Select all services this staff member can perform.
                  </p>
                </div>
              </div>

              <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-[#1e9be0]">
                {selectedServiceIds.length} selected
              </span>
            </div>

            {initialServiceId && (
              <div className="mb-5 flex gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <Check size={18} className="mt-0.5 shrink-0" />
                <p>
                  The service you were working on has been selected
                  automatically. You can select additional services below.
                </p>
              </div>
            )}

            {/* Search */}
            <div className="relative mb-5">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
              />

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search services..."
                className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#1e9be0] focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {loadingServices ? (
              <div className="flex items-center justify-center gap-3 py-12 text-sm text-gray-500">
                <LoaderCircle size={20} className="animate-spin" />
                Loading services...
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center">
                <Scissors
                  size={28}
                  className="mx-auto mb-3 text-gray-400"
                />
                <p className="font-medium">No services found</p>
                <p className="mt-1 text-sm text-gray-500">
                  You can create the staff member without service assignments.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Active Services */}
                {activeServices.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Active Services
                      </h3>
                      <span className="text-xs text-gray-400">
                        {activeServices.length} services
                      </span>
                    </div>

                    <div className="space-y-2">
                      {activeServices.map((service) => {
                        const checked = selectedServiceIds.includes(
                          service.id
                        );

                        return (
                          <label
                            key={service.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                              checked
                                ? "border-[#1e9be0] bg-blue-50/60"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(service.id)}
                              className="h-4 w-4 accent-[#1e9be0]"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {service.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {service.category || "Others"} ·{" "}
                                {service.duration_minutes} min
                              </p>
                            </div>

                            <span className="shrink-0 text-sm font-semibold">
                              ₹{Number(service.price).toLocaleString("en-IN")}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Inactive Services */}
                {inactiveServices.length > 0 && (
                  <div>
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        Inactive Services
                      </h3>
                      <span className="text-xs text-gray-400">
                        {inactiveServices.length} services
                      </span>
                    </div>

                    <div className="space-y-2">
                      {inactiveServices.map((service) => {
                        const checked = selectedServiceIds.includes(
                          service.id
                        );

                        return (
                          <label
                            key={service.id}
                            className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${
                              checked
                                ? "border-[#1e9be0] bg-blue-50/60"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(service.id)}
                              className="h-4 w-4 accent-[#1e9be0]"
                            />

                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">
                                {service.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {service.category || "Others"} ·{" "}
                                {service.duration_minutes} min
                              </p>
                            </div>

                            <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-500">
                              Inactive
                            </span>
                          </label>
                        );
                      })}
                    </div>

                    <p className="mt-3 text-xs leading-5 text-gray-500">
                      Inactive services can be assigned for administrative
                      purposes, but they should remain unavailable for
                      customer bookings until activated.
                    </p>
                  </div>
                )}

                {filteredServices.length === 0 && (
                  <p className="py-8 text-center text-sm text-gray-500">
                    No services match &quot;{search}&quot;.
                  </p>
                )}
              </div>
            )}
          </section>

          {/* Error */}
          {error && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              <AlertCircle size={19} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() =>
                router.push(
                  initialServiceId ? "/admin/services" : "/admin/staff"
                )
              }
              disabled={submitting}
              className="rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold transition hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || loadingServices}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b0e14] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1e9be0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting && (
                <LoaderCircle size={17} className="animate-spin" />
              )}
              {submitting ? "Creating Staff..." : "Create Staff"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// 2. Wrap the form inside a Suspense boundary for the default page export
export default function NewStaffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-[#f5f7fa]">
          <LoaderCircle size={28} className="animate-spin text-[#1e9be0]" />
        </div>
      }
    >
      <NewStaffForm />
    </Suspense>
  );
}
