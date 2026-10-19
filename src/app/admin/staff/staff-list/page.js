"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  LoaderCircle,
  Pencil,
  RefreshCw,
  Search,
  UserPlus,
  UserRound,
  Users,
} from "lucide-react";
import StaffServicesModal from "@/components/admin/StaffServicesModal";

const PAGE_SIZE = 10;

export default function StaffListPage() {
  const router = useRouter();
  const [staff, setStaff] = useState([]);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [completionFilter, setCompletionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");
        const query = new URLSearchParams({
          page: String(page),
          per_page: String(PAGE_SIZE),
          active: activeFilter,
          status: completionFilter,
        });
        if (search.trim()) query.set("search", search.trim());
        const response = await fetch(`/api/admin/staff?${query.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Failed to load staff.");
        if (cancelled) return;
        const resultPages = result.pagination?.total_pages || 0;
        if ((resultPages > 0 && page > resultPages) || (resultPages === 0 && page > 1)) {
          setPage(Math.max(1, resultPages));
          return;
        }
        setStaff(result.staff || []);
        setPagination(result.pagination || { page, total: 0, total_pages: 0 });
        setActionError("");
      } catch (loadError) {
        if (!cancelled && loadError.name !== "AbortError") {
          setError(loadError.message || "Unable to load staff.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [page, search, activeFilter, completionFilter, refreshKey]);

  async function toggleActivation(member) {
    const nextValue = !member.is_active;
    setUpdatingId(member.id);
    setActionError("");
    try {
      const response = await fetch(`/api/admin/staff/${encodeURIComponent(member.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: nextValue }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not update staff activation.");
      setStaff((current) => current.map((item) => item.id === member.id
        ? { ...item, ...result.staff }
        : item));
      setRefreshKey((current) => current + 1);
    } catch (updateError) {
      setActionError(updateError.message || "Could not update staff activation.");
    } finally {
      setUpdatingId(null);
    }
  }

  const totalPages = pagination.total_pages || 0;

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-8 text-[#0b0e14] sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Users size={24} className="text-[#1e9be0]" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Staff Management</h1>
            <p className="mt-2 text-sm text-gray-500 sm:text-base">Manage staff, assignments, and booking eligibility.</p>
          </div>
          <button type="button" onClick={() => router.push("/admin/staff/new")} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b0e14] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e9be0]">
            <UserPlus size={18} /> Add Staff
          </button>
        </header>

        <section className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-[#1e9be0]" />
              <div><p className="text-sm text-gray-500">Total staff</p><p className="text-2xl font-bold">{loading ? "—" : pagination.total}</p></div>
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <BriefcaseBusiness size={20} className="text-emerald-600" />
              <div><p className="text-sm text-gray-500">Showing</p><p className="text-2xl font-bold">{loading ? "—" : staff.length} <span className="text-sm font-normal text-gray-500">on this page</span></p></div>
            </div>
          </div>
        </section>

        <section className="mb-5 grid gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:grid-cols-[minmax(15rem,1fr)_12rem_13rem_auto]">
          <label className="relative block">
            <span className="sr-only">Search staff</span>
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search by name or role..." className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 text-sm outline-none focus:border-[#1e9be0] focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="text-xs font-medium text-gray-500">
            <span className="sr-only">Filter activation</span>
            <select value={activeFilter} onChange={(event) => { setActiveFilter(event.target.value); setPage(1); }} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#1e9be0]">
              <option value="all">All activation states</option><option value="active">Active</option><option value="inactive">Inactive</option>
            </select>
          </label>
          <label className="text-xs font-medium text-gray-500">
            <span className="sr-only">Filter completion</span>
            <select value={completionFilter} onChange={(event) => { setCompletionFilter(event.target.value); setPage(1); }} className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-sm text-gray-700 outline-none focus:border-[#1e9be0]">
              <option value="all">All completion states</option><option value="completed">Completed</option><option value="incomplete">Incomplete</option>
            </select>
          </label>
          <button type="button" onClick={() => setRefreshKey((current) => current + 1)} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium hover:bg-gray-50 disabled:opacity-50">
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </section>

        {actionError && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
        {error && !loading && <div role="alert" className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><AlertCircle size={18} />{error}<button type="button" onClick={() => setRefreshKey((current) => current + 1)} className="ml-auto underline">Retry</button></div>}

        {loading ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-gray-200 bg-white py-16 text-sm text-gray-500"><LoaderCircle size={23} className="animate-spin text-[#1e9be0]" /> Loading staff...</div>
        ) : !error && staff.length === 0 ? (
          <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
            <UserRound size={27} className="mx-auto text-gray-400" />
            <h2 className="mt-4 font-semibold">{pagination.total ? "No staff match these filters" : "No staff members yet"}</h2>
            <p className="mt-2 text-sm text-gray-500">Adjust your search or add a staff member.</p>
            {!pagination.total && <button type="button" onClick={() => router.push("/admin/staff/new")} className="mt-5 rounded-xl bg-[#0b0e14] px-5 py-3 text-sm font-semibold text-white">Add Staff</button>}
          </div>
        ) : !error && (
          <div className="space-y-3">
            {staff.map((member) => {
              const completed = member.status === "completed";
              return (
                <article key={member.id} className={`flex flex-col gap-5 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition sm:flex-row sm:items-center sm:justify-between ${member.is_active ? "" : "grayscale bg-gray-100 text-gray-500"}`}>
                  <div className="flex min-w-0 items-start gap-4 sm:items-center">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${member.is_active ? "bg-blue-50 text-[#1e9be0]" : "bg-gray-200 text-gray-500"}`}><UserRound size={22} /></div>
                    <div className="min-w-0">
                      <button type="button" onClick={() => router.push(`/admin/staff/${encodeURIComponent(member.id)}`)} className="truncate text-left font-semibold hover:text-[#1e9be0]">{member.name}</button>
                      <p className="mt-1 text-sm text-gray-500">{member.role || "No role specified"}</p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="inline-flex items-center gap-1.5"><BriefcaseBusiness size={14} />{member.assigned_services_count} {member.assigned_services_count === 1 ? "service" : "services"}</span>
                        <span className={`inline-flex items-center gap-1.5 ${completed ? "text-emerald-700" : "text-amber-700"}`}>{completed ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}{completed ? "Completed" : "Incomplete"}</span>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${member.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-200 text-gray-700"}`}>{member.is_active ? "Active" : "Inactive"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 sm:justify-end">
                    <button type="button" onClick={() => router.push(`/admin/staff/${encodeURIComponent(member.id)}/edit`)} className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50"><Pencil size={15} /> Edit</button>
                    <button type="button" onClick={() => setSelectedStaff(member)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium hover:bg-gray-50">Manage Services</button>
                    <button type="button" disabled={updatingId === member.id} onClick={() => toggleActivation(member)} className={`rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${member.is_active ? "border border-gray-200 text-gray-700 hover:bg-gray-50" : "bg-[#0b0e14] text-white hover:bg-[#1e9be0]"}`}>
                      {updatingId === member.id ? "Saving..." : member.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {!loading && !error && pagination.total > 0 && (
          <nav aria-label="Staff pagination" className="mt-5 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagination.total)} of {pagination.total} staff</p>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40"><ChevronLeft size={16} />Previous</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-sm disabled:opacity-40">Next<ChevronRight size={16} /></button>
            </div>
          </nav>
        )}
      </div>

      {selectedStaff && <StaffServicesModal staff={selectedStaff} returnTo="/admin/staff" onClose={() => setSelectedStaff(null)} onSaved={() => setRefreshKey((current) => current + 1)} />}
    </main>
  );
}
