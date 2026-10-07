
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const router = useRouter();

  useEffect(() => {
    async function fetchServices() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `/api/admin/services?business_id=${BUSINESS_ID}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "Failed to load services"
          );
        }

        setServices(data.services || []);
      } catch (error) {
        console.error("Services page error:", error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, []);

  async function handleDelete(service) {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${service.name}"?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(service.id);

      const response = await fetch("/api/admin/services", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: service.id,
          business_id: BUSINESS_ID,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.error || "Failed to deactivate service");
        return;
      }

      // Remove the inactive service from the visible list
      setServices((prevServices) =>
        prevServices.filter(
          (item) => item.id !== service.id
        )
      );
    } catch (error) {
      console.error("Delete service error:", error);
      alert("Something went wrong");
    } finally {
      setDeletingId(null);
    }
  }

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

          <p className="mt-2 text-sm text-red-600">
            {error}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="p-6">
      {/* Header */}
      <div className="mb-7 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            Services
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Manage your business services and availability.
          </p>
        </div>

        <button
          onClick={() =>
            router.push("/admin/services/AddServices")
          }
          className="cursor-pointer rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
        >
          + Add Service
        </button>
      </div>

      {/* Service count */}
      <div className="mb-4 text-sm text-gray-500">
        {services.length}{" "}
        {services.length === 1 ? "service" : "services"}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-225">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Service
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Category
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Price
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Duration
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Staff
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Status
                </th>

                <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {services.map((service) => (
                <tr
                  key={service.id}
                  className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70"
                >
                  {/* Service */}
                  <td className="px-5 py-5">
                    <div className="min-w-55">
                      <div className="font-medium text-gray-900">
                        {service.name}
                      </div>

                      {service.description && (
                        <div className="mt-1 line-clamp-2 max-w-75 text-sm text-gray-500">
                          {service.description}
                        </div>
                      )}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-5 py-5">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {service.category}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-5 py-5">
                    <span className="font-medium text-gray-900">
                      ₹{Number(service.price).toLocaleString("en-IN")}
                    </span>
                  </td>
 
                  {/* Duration */}
                  <td className="px-5 py-5 text-sm text-gray-600">
                    {service.duration_minutes} min
                  </td>

                  {/* Staff */}
                  <td className="px-5 py-5">
                    {service.staff_count > 0 ? (
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
                        {service.staff_count}{" "}
                        {service.staff_count === 1
                          ? "staff"
                          : "staff"}
                      </span>
                    ) : (
                      <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                        No staff Assigned
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-5 py-5">
                    {!service.is_active ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                        Inactive
                      </span>
                    ) : service.staff_count === 0 ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                        Not bookable
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        Bookable
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-5 py-5">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() =>
                          router.push(
                            `/admin/services/${service.id}/edit`
                          )
                        }
                        className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-100"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(service)}
                        disabled={deletingId === service.id}
                        className="cursor-pointer rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingId === service.id
                          ? "Deleting..."
                          : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Empty state */}
              {services.length === 0 && (
                <tr>
                  <td
                    colSpan="7"
                    className="px-5 py-16 text-center"
                  >
                    <div className="mx-auto max-w-sm">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl">
                        +
                      </div>

                      <h3 className="mt-4 font-medium text-gray-900">
                        No services yet
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        Add your first service to start accepting
                        bookings.
                      </p>

                      <button
                        onClick={() =>
                          router.push(
                            "/admin/services/AddServices"
                          )
                        }
                        className="mt-4 cursor-pointer rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                      >
                        Add Service
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}

