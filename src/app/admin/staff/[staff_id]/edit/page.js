"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, LoaderCircle, Save } from "lucide-react";

export default function EditStaffPage() {
  const router = useRouter();
  const params = useParams();
  const staffId = params.staff_id;
  const [staff, setStaff] = useState(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadStaff() {
      try {
        const response = await fetch(`/api/admin/staff/${encodeURIComponent(staffId)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to load staff.");
        if (!cancelled) {
          setStaff(result.staff);
          setName(result.staff.name || "");
          setRole(result.staff.role || "");
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError.message || "Failed to load staff.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (staffId) loadStaff();
    return () => { cancelled = true; };
  }, [staffId]);

  async function save(event) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !role.trim()) {
      setError("Name and role are required.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/staff/${encodeURIComponent(staffId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), role: role.trim() }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to save staff.");
      setStaff(result.staff);
      router.push(`/admin/staff/${encodeURIComponent(staffId)}`);
      router.refresh();
    } catch (saveError) {
      setError(saveError.message || "Failed to save staff.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="flex min-h-[60vh] items-center justify-center gap-3 text-sm text-gray-500"><LoaderCircle className="animate-spin text-[#1e9be0]" />Loading staff...</main>;

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 text-[#0b0e14] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => router.push(`/admin/staff/${encodeURIComponent(staffId)}`)} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1e9be0]"><ArrowLeft size={17} />Back to staff profile</button>
        <h1 className="text-2xl font-bold">Edit staff</h1>
        <p className="mt-2 text-sm text-gray-500">Update the staff member’s name and role. Activation and completion status are managed separately.</p>
        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>}
        {staff && <form onSubmit={save} className="mt-6 space-y-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
          <label className="block text-sm font-medium">Name<input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#1e9be0]" /></label>
          <label className="block text-sm font-medium">Role<input value={role} onChange={(event) => setRole(event.target.value)} maxLength={100} required className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 outline-none focus:border-[#1e9be0]" /></label>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => router.push(`/admin/staff/${encodeURIComponent(staffId)}`)} disabled={saving} className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold disabled:opacity-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b0e14] px-5 py-3 text-sm font-semibold text-white hover:bg-[#1e9be0] disabled:opacity-50">{saving ? <LoaderCircle size={17} className="animate-spin" /> : <Save size={17} />}{saving ? "Saving..." : "Save Changes"}</button>
          </div>
        </form>}
      </div>
    </main>
  );
}
