"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, LoaderCircle, Scissors, X } from "lucide-react";

export default function StaffServicesModal({ staff, returnTo, onClose, onSaved }) {
  const router = useRouter();
  const [services, setServices] = useState([]);
  const [serviceIds, setServiceIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const endpoint = `/api/admin/staff/${encodeURIComponent(staff.id)}/services`;

  useEffect(() => {
    let cancelled = false;
    async function loadAssignments() {
      try {
        setLoading(true);
        const response = await fetch(endpoint, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to load services.");
        if (!cancelled) {
          setServices(result.services || []);
          setServiceIds(result.service_ids || []);
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Failed to load services.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadAssignments();
    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  function toggleService(serviceId) {
    setServiceIds((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
  }

  async function persistAssignments() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(endpoint, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service_ids: serviceIds }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save assignments.");
      setServiceIds(result.service_ids || []);
      onSaved?.(result.staff);
      return true;
    } catch (saveError) {
      setError(saveError.message || "Failed to save assignments.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function createNewService() {
    if (!(await persistAssignments())) return;
    onClose();
    const query = new URLSearchParams({
      staff_id: staff.id,
      return_to: returnTo || "/admin/staff",
    });
    router.push(`/admin/services/AddServices?${query.toString()}`);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="presentation">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-services-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between border-b border-gray-100 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2 text-[#1e9be0]">
              <Scissors size={18} />
              <span className="text-xs font-semibold uppercase tracking-wide">Staff services</span>
            </div>
            <h2 id="staff-services-title" className="mt-2 text-xl font-semibold text-[#0b0e14]">
              Manage services for {staff.name}
            </h2>
            <p className="mt-1 text-sm text-gray-500">Assignments update completion status through the database.</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close" className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50">
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-12 text-sm text-gray-500">
              <LoaderCircle size={20} className="animate-spin" /> Loading business services...
            </div>
          ) : error && !services.length ? (
            <div role="alert" className="flex gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <AlertCircle size={18} className="shrink-0" /> {error}
            </div>
          ) : services.length ? (
            <div className="space-y-2">
              {services.map((service) => {
                const checked = serviceIds.includes(service.id);
                return (
                  <label key={service.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition ${checked ? "border-[#1e9be0] bg-blue-50/60" : "border-gray-200 hover:border-gray-300"}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggleService(service.id)} className="h-4 w-4 accent-[#1e9be0]" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-[#0b0e14]">{service.name}</span>
                      <span className="mt-1 block text-xs text-gray-500">
                        {service.duration_minutes} min · {service.status === "completed" ? "Completed" : "Incomplete"} · {service.is_active ? "Active" : "Inactive"}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-gray-700">₹{Number(service.price || 0).toLocaleString("en-IN")}</span>
                  </label>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 py-12 text-center">
              <Scissors size={25} className="mx-auto text-gray-400" />
              <p className="mt-3 text-sm font-medium text-gray-700">No services found for this business.</p>
            </div>
          )}
          {error && services.length > 0 && (
            <div role="alert" className="mt-4 flex gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={18} className="shrink-0" /> {error}
            </div>
          )}
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-gray-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <button type="button" onClick={createNewService} disabled={loading || saving} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Scissors size={16} /> Create New Service
          </button>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button type="button" onClick={onClose} disabled={saving} className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50">Cancel</button>
            <button type="button" onClick={async () => { if (await persistAssignments()) onClose(); }} disabled={loading || saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b0e14] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e9be0] disabled:opacity-50">
              {saving && <LoaderCircle size={16} className="animate-spin" />}
              {saving ? "Saving..." : "Save Assignments"}
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}
