"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Search,
  UserRound,
  Phone,
  Mail,
  RefreshCw,
  UserRoundSearch,
  AlertCircle,
} from "lucide-react";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function fetchCustomers() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/customers?business_id=${BUSINESS_ID}`
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to load customers.");
      }

      setCustomers(result.customers || []);
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCustomers();
  }, []);

  const filteredCustomers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      return (
        customer.name?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query)
      );
    });
  }, [customers, search]);

  return (
    <div className="min-h-screen bg-[#f5f7fa] px-4 py-6 text-[#0b0e14] sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-500">
              <Users size={16} />
              <span>Management</span>
              <span>/</span>
              <span className="text-[#1e9be0]">Customers</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Customers
            </h1>

            <p className="mt-2 text-sm text-gray-500 sm:text-base">
              Manage and view your registered customers.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-[#1e9be0]">
              <Users size={22} />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">
                Total Customers
              </p>
              <p className="text-2xl font-bold">
                {loading ? "—" : customers.length}
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search
              size={19}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone or email..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm outline-none transition focus:border-[#1e9be0] focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <button
            onClick={fetchCustomers}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* Error State */}
        {error && !loading && (
          <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertCircle
                size={21}
                className="mt-0.5 shrink-0 text-red-600"
              />

              <div>
                <p className="font-semibold text-red-800">
                  Unable to load customers
                </p>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>

            <button
              onClick={fetchCustomers}
              className="self-start rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 sm:self-auto"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-gray-200 bg-white p-6"
              >
                <div className="h-5 w-36 rounded bg-gray-200" />

                <div className="flex justify-center py-8">
                  <div className="h-24 w-24 rounded-full bg-gray-200" />
                </div>

                <div className="space-y-4">
                  <div className="h-4 w-full rounded bg-gray-200" />
                  <div className="h-4 w-4/5 rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && customers.length === 0 && (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-[#1e9be0]">
              <UserRoundSearch size={30} />
            </div>

            <h2 className="text-xl font-bold">No customers yet</h2>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-gray-500">
              Customers will appear here when their details are registered
              through your booking system.
            </p>
          </div>
        )}

        {/* No Search Results */}
        {!loading &&
          !error &&
          customers.length > 0 &&
          filteredCustomers.length === 0 && (
            <div className="rounded-2xl border border-gray-200 bg-white px-6 py-14 text-center">
              <Search size={30} className="mx-auto mb-4 text-gray-400" />

              <h2 className="text-lg font-bold">No matching customers</h2>

              <p className="mt-2 text-sm text-gray-500">
                Try searching with a different name, phone number or email.
              </p>
            </div>
          )}

        {/* Customer Cards */}
        {!loading && !error && filteredCustomers.length > 0 && (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-600">
                All Customers
              </h2>

              <span className="text-sm text-gray-500">
                {filteredCustomers.length}{" "}
                {filteredCustomers.length === 1 ? "customer" : "customers"}
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredCustomers.map((customer) => (
                <article
                  key={customer.id}
                  className="group overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                      Customer Profile
                    </p>

                    <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
                      Registered
                    </span>
                  </div>

                  {/* Profile Icon */}
                  <div className="px-5 pb-6 pt-7 text-center">
                    <h3
                      className="truncate text-lg font-bold text-[#0b0e14]"
                      title={customer.name}
                    >
                      {customer.name}
                    </h3>

                    <div className="mx-auto mt-6 flex h-24 w-24 items-center justify-center rounded-full border-4 border-blue-50 bg-gradient-to-br from-blue-50 to-sky-100 text-[#1e9be0] transition duration-200 group-hover:scale-105">
                      <UserRound size={43} strokeWidth={1.6} />
                    </div>

                    <p className="mt-3 text-xs text-gray-400">
                      Customer ID: {customer.id.slice(0, 8)}
                    </p>
                  </div>

                  {/* Contact Details */}
                  <div className="space-y-3 border-t border-gray-100 bg-gray-50/70 p-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1e9be0] shadow-sm">
                        <Phone size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Phone Number</p>

                        <p
                          className="mt-0.5 break-words text-sm font-semibold text-gray-800"
                          title={customer.phone}
                        >
                          {customer.phone}
                        </p>
                      </div>
                    </div>

                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-[#1e9be0] shadow-sm">
                        <Mail size={17} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-gray-400">Email Address</p>

                        <p
                          className="mt-0.5 break-all text-sm font-semibold text-gray-800"
                          title={customer.email || "No email provided"}
                        >
                          {customer.email || "No email provided"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Registration Date */}
                  <div className="border-t border-gray-100 px-5 py-3">
                    <p className="text-xs text-gray-400">
                      Registered on{" "}
                      <span className="font-medium text-gray-600">
                        {new Date(customer.created_at).toLocaleDateString(
                          "en-IN",
                          {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            timeZone: "Asia/Kolkata",
                          }
                        )}
                      </span>
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}