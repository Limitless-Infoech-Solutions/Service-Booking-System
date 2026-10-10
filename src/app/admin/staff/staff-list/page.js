"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
ArrowLeft,
UserRound,
UserPlus,
Search,
RefreshCw,
LoaderCircle,
Users,
BriefcaseBusiness,
CheckCircle2,
Clock3,
AlertCircle,
} from "lucide-react";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

export default function StaffListPage() {
const router = useRouter();

const [staff, setStaff] = useState([]);
const [search, setSearch] = useState("");
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");

async function fetchStaff() {
try {
setLoading(true);
setError("");


  const response = await fetch(
    `/api/admin/staff?business_id=${BUSINESS_ID}`,
    { cache: "no-store" }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Failed to fetch staff.");
  }
  console.log("Staff API response:", result.staff);
  setStaff(result.staff || []);
} catch (err) {
  console.error("Fetch staff error:", err);
  setError(err.message || "Unable to load staff.");
} finally {
  setLoading(false);
}


}

useEffect(() => {
// eslint-disable-next-line react-hooks/set-state-in-effect
fetchStaff();
}, []);

const filteredStaff = staff.filter((member) => {
const query = search.toLowerCase();


return (
  member.name?.toLowerCase().includes(query) ||
  member.role?.toLowerCase().includes(query)
);


});

return ( <div className="min-h-screen bg-[#f5f7fa] px-4 py-8 text-[#0b0e14] sm:px-8"> <div className="mx-auto max-w-7xl">
{/* Header */}
<button
type="button"
onClick={() => router.push("/admin/staff")}
className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-[#1e9be0]"
> <ArrowLeft size={17} />
Back to Staff Management </button>


    <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
      <div>
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
          <Users size={24} className="text-[#1e9be0]" />
        </div>

        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          All Staff
        </h1>

        <p className="mt-2 text-sm text-gray-500 sm:text-base">
          View your team members and their setup status.
        </p>
      </div>

      <button
        type="button"
        onClick={() => router.push("/admin/staff/new")}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0b0e14] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e9be0]"
      >
        <UserPlus size={18} />
        Add Staff
      </button>
    </div>

    {/* Summary */}
    <div className="mb-6 grid gap-4 sm:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-[#1e9be0]">
            <Users size={20} />
          </div>

          <div>
            <p className="text-sm text-gray-500">Staff Loaded</p>
            <p className="text-2xl font-bold">
              {loading ? "—" : staff.length}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <BriefcaseBusiness size={20} />
          </div>

          <div>
            <p className="text-sm text-gray-500">Matching Staff</p>
            <p className="text-2xl font-bold">
              {loading ? "—" : filteredStaff.length}
            </p>
          </div>
        </div>
      </div>
    </div>

    {/* Search and Refresh */}
    <div className="mb-6 flex flex-col gap-3 sm:flex-row">
      <div className="relative flex-1">
        <Search
          size={18}
          className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400"
        />

        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by staff name or role..."
          className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-[#1e9be0] focus:ring-2 focus:ring-blue-100"
        />
      </div>

      <button
        type="button"
        onClick={fetchStaff}
        disabled={loading}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-medium transition hover:bg-gray-50 disabled:opacity-50"
      >
        <RefreshCw
          size={16}
          className={loading ? "animate-spin" : ""}
        />
        Refresh
      </button>
    </div>

    {/* Loading */}
    {loading && (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-200 bg-white py-20">
        <LoaderCircle
          size={30}
          className="animate-spin text-[#1e9be0]"
        />
        <p className="mt-4 text-sm text-gray-500">
          Loading staff members...
        </p>
      </div>
    )}

    {/* Error */}
    {!loading && error && (
      <div
        role="alert"
        className="rounded-2xl border border-red-200 bg-red-50 p-6"
      >
        <div className="flex items-start gap-3 text-red-700">
          <AlertCircle size={20} className="mt-0.5 shrink-0" />

          <div>
            <p className="font-semibold">
              Could not load staff members
            </p>
            <p className="mt-1 text-sm">{error}</p>

            <button
              type="button"
              onClick={fetchStaff}
              className="mt-4 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 shadow-sm hover:bg-red-100"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Empty State */}
    {!loading && !error && staff.length === 0 && (
      <div className="rounded-2xl border border-gray-200 bg-white px-6 py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
          <UserRound size={26} />
        </div>

        <h2 className="mt-5 text-lg font-semibold">
          No staff members found
        </h2>

        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
          Add your first team member to get started. You can assign
          services now or do it later.
        </p>

        <button
          type="button"
          onClick={() => router.push("/admin/staff/new")}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0b0e14] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1e9be0]"
        >
          <UserPlus size={17} />
          Create Staff
        </button>
      </div>
    )}

    {/* No Search Results */}
    {!loading &&
      !error &&
      staff.length > 0 &&
      filteredStaff.length === 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center">
          <Search size={28} className="mx-auto text-gray-400" />

          <h2 className="mt-4 font-semibold">
            No matching staff
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Try a different name or role.
          </p>
        </div>
      )}

    {/* Staff Cards */}
    {!loading && !error && filteredStaff.length > 0 && (
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filteredStaff.map((member) => {
          const isComplete = member.status === "completed";

          return (
            <article
              key={member.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-[#1e9be0]">
                    <UserRound size={23} />
                  </div>

                  <div className="min-w-0">
                    <h2 className="truncate font-semibold">
                      {member.name}
                    </h2>

                    <p className="mt-1 truncate text-sm text-gray-500">
                      {member.role || "No role specified"}
                    </p>
                  </div>
                </div>

                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                    member.is_active
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {member.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <div className="my-5 border-t border-gray-100" />

              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-500">
                  Setup Status
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                    isComplete
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {isComplete ? (
                    <CheckCircle2 size={14} />
                  ) : (
                    <Clock3 size={14} />
                  )}

{isComplete ? (
  "Completed"
) : (
  <>
    Incomplete,  <br />
     Please Assign  <br />Service
   
    to this Staff
  </>
)}
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-4">
  <BriefcaseBusiness size={16} className="shrink-0 text-gray-400" />

  <span className="text-sm text-gray-500">
    {member.assigned_services_count}{" "}
    {member.assigned_services_count === 1 ? "service" : "services"} assigned
  </span>
</div>
            </article>
          );
        })}
      </div>
    )}
  </div>
</div>


);
}
