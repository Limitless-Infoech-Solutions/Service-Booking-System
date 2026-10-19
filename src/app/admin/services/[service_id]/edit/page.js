"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function EditServicePage() {
  const { service_id } = useParams();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    duration_minutes: "",
    buffer_minutes: "",
    category: "Others",
    badge: "",
    image: "",
    is_active: true,
  });

  useEffect(() => {
    async function fetchService() {
      try {
        const response = await fetch(
          "/api/admin/services"
        );

        const data = await response.json();

        const service = data.services.find(
          (service) => service.id === service_id
        );

        if (!service) {
          alert("Service not found");
          router.push("/admin/services");
          return;
        }

        setForm({
          name: service.name || "",
          description: service.description || "",
          price: service.price ?? "",
          duration_minutes: service.duration_minutes ?? "",
          buffer_minutes: service.buffer_minutes ?? "",
          category: service.category || "Others",
          badge: service.badge || "",
          image: service.image || "",
          is_active: service.is_active,
        });
      } catch (error) {
        console.error("Fetch service error:", error);
        alert("Failed to load service");
      } finally {
        setLoading(false);
      }
    }

    if (service_id) {
      fetchService();
    }
  }, [service_id, router]);

  function handleChange(event) {
    const { name, value, type, checked } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setSaving(true);

    try {
      const response = await fetch("/api/admin/services", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: service_id,
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
        alert(data.error || "Failed to update service");
        return;
      }

      alert("Service updated successfully");

      router.push("/admin/services");
    } catch (error) {
      console.error("Update service error:", error);
      alert("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading service...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">
        Edit Service
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-xl">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Service name"
          className="w-full border p-3 rounded"
          required
        />

        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          placeholder="Description"
          className="w-full border p-3 rounded"
        />

        <input
          name="price"
          type="number"
          value={form.price}
          onChange={handleChange}
          placeholder="Price"
          className="w-full border p-3 rounded"
          required
        />

        <input
          name="duration_minutes"
          type="number"
          value={form.duration_minutes}
          onChange={handleChange}
          placeholder="Duration (minutes)"
          className="w-full border p-3 rounded"
          required
        />

        <input
          name="buffer_minutes"
          type="number"
          value={form.buffer_minutes}
          onChange={handleChange}
          placeholder="Buffer (minutes)"
          className="w-full border p-3 rounded"
        />

        <input
          name="category"
          value={form.category}
          onChange={handleChange}
          placeholder="Category"
          className="w-full border p-3 rounded"
        />

        <input
          name="badge"
          value={form.badge}
          onChange={handleChange}
          placeholder="Badge"
          className="w-full border p-3 rounded"
        />

        <input
          name="image"
          value={form.image}
          onChange={handleChange}
          placeholder="Image URL"
          className="w-full border p-3 rounded"
        />

        <label className="flex items-center gap-2">
          <input
            name="is_active"
            type="checkbox"
            checked={form.is_active}
            onChange={handleChange}
          />
          Active
        </label>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/services")}
            className="border px-4 py-2 rounded"
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={saving}
            className="bg-black text-white px-4 py-2 rounded"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}
