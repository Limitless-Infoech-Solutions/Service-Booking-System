"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";

function AddServiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get("staff_id");
  const requestedReturnTo = searchParams.get("return_to");
  const returnTo = requestedReturnTo?.startsWith("/admin/staff/")
    ? requestedReturnTo
    : staffId
      ? "/admin/staff"
      : "/admin/services";

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_minutes: "",
    buffer_minutes: "0",
    category: "Others",
    badge: "",
    image: "",
    is_active: true,
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdServiceId, setCreatedServiceId] = useState(null);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (createdServiceId) {
        await assignCreatedService(createdServiceId);
        return;
      }

      const response = await fetch("/api/admin/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: Number(form.price),
          duration_minutes: Number(form.duration_minutes),
          buffer_minutes: Number(form.buffer_minutes),
          category: form.category,
          badge: form.badge,
          image: form.image,
          is_active: form.is_active,
        }),
      });
     



      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create service");
      }

      setCreatedServiceId(data.service?.id || null);
      if (staffId && data.service?.id) {
        await assignCreatedService(data.service.id);
      } else {
        router.push(returnTo);
      }
    } catch (error) {
      console.error("Create service error:", error);
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function assignCreatedService(serviceId) {
    const response = await fetch(
      `/api/admin/staff/${encodeURIComponent(staffId)}/services`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_id: serviceId }),
      }
    );
    const result = await response.json();
    if (!response.ok) {
      throw new Error(
        `Service created, but it could not be assigned to this staff member: ${result.error || "Please retry."}`
      );
    }
    router.push(returnTo);
    router.refresh();
  }

  return (
    <main className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Add Service</h1>
        <p className="mt-1 text-gray-500">
          Create a new service for your business.{staffId ? " It will be assigned to the selected staff member." : ""}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="max-w-2xl space-y-6 rounded-xl border p-6"
      >
        <div>
          <label className="mb-2 block text-sm font-medium">
            Service Name
          </label>

          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="e.g. Hair Spa"
            required
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Description
          </label>

          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            placeholder="Describe the service..."
            rows={4}
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Price
            </label>

            <input
              name="price"
              type="number"
              min="0"
              value={form.price}
              onChange={handleChange}
              placeholder="1200"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Duration (minutes)
            </label>

            <input
              name="duration_minutes"
              type="number"
              min="1"
              value={form.duration_minutes}
              onChange={handleChange}
              placeholder="60"
              required
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Buffer (minutes)
          </label>

          <input
            name="buffer_minutes"
            type="number"
            min="0"
            value={form.buffer_minutes}
            onChange={handleChange}
            className="w-full rounded-lg border px-3 py-2"
          />

          <p className="mt-1 text-xs text-gray-500">
            Extra time required after this service.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Category
          </label>

          <input
            name="category"
            value={form.category}
            onChange={handleChange}
            placeholder="Massage"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Badge
          </label>

          <input
            name="badge"
            value={form.badge}
            onChange={handleChange}
            placeholder="Popular"
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Image URL
          </label>

          <input
            name="image"
            value={form.image}
            onChange={handleChange}
            placeholder="https://..."
            className="w-full rounded-lg border px-3 py-2"
          />
        </div>

        <label className="flex items-center gap-2">
          <input
            name="is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={handleChange}
          />

          <span className="text-sm">
            Service is active
          </span>
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push(returnTo)}
            className="rounded-lg border px-4 py-2"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {saving ? "Creating..." : createdServiceId ? "Retry Assignment" : "Create Service"}
          </button>
        </div>
      </form>
    </main>
  );
}

export default function AddServicePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><LoaderCircle className="animate-spin text-[#1e9be0]" /></div>}>
      <AddServiceForm />
    </Suspense>
  );
}
