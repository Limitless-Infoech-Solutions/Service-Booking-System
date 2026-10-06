"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
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
          throw new Error(data.error || "Failed to load services");
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

  if (loading) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Services</h1>
        <p className="mt-4 text-gray-500">Loading services...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="p-6">
        <h1 className="text-2xl font-semibold">Services</h1>
        <p className="mt-4 text-red-500">{error}</p>
      </main>
    );
  }

  return (
    <main className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Services</h1>
          <p className="mt-1 text-gray-500">
            Manage your business services.
          </p>
        </div>

        <button
  onClick={() => router.push("/admin/services/add")}
  className="rounded-lg bg-black px-4 py-2 text-white"
>
  Add Service
</button>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left">Service</th>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Price</th>
              <th className="px-4 py-3 text-left">Duration</th>
              <th className="px-4 py-3 text-left">Staff</th>
              <th className="px-4 py-3 text-left">Status</th>
            </tr>
          </thead>

          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-b">
                <td className="px-4 py-4">
                  <div className="font-medium">{service.name}</div>

                  {service.description && (
                    <div className="mt-1 text-sm text-gray-500">
                      {service.description}
                    </div>
                  )}
                </td>

                <td className="px-4 py-4">
                  {service.category}
                </td>

                <td className="px-4 py-4">
                  ₹{service.price}
                </td>

                <td className="px-4 py-4">
                  {service.duration_minutes} min
                </td>

                <td className="px-4 py-4">
                  {service.staff_count}
                </td>

                <td className="px-4 py-4">
                  {!service.is_active ? (
                    <span className="text-gray-500">
                      Inactive
                    </span>
                  ) : service.staff_count === 0 ? (
                    <span className="text-orange-600">
                      No staff assigned
                    </span>
                  ) : (
                    <span className="text-green-600">
                      Bookable
                    </span>
                  )}
                </td>
              </tr>
            ))}

            {services.length === 0 && (
              <tr>
                <td
                  colSpan="6"
                  className="px-4 py-8 text-center text-gray-500"
                >
                  No services found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}