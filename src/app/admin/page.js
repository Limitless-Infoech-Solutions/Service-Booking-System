"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

// Temporary development date.
// Later this will become today's date automatically.
const APPOINTMENT_DATE = "2026-10-14";
export default function AdminDashboard() {
  const [appointmentCount, setAppointmentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointmentCount() {
      try {
        const response = await fetch(
          `/api/admin/appointments?business_id=${BUSINESS_ID}&date=${APPOINTMENT_DATE}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load appointments");
        }

        setAppointmentCount(data.total);
      } catch (error) {
        console.error("Dashboard appointment error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointmentCount();
  }, []);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Dashboard
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Overview of your business
        </p>
      </div>

      <Link href="/admin/appointments" className="block max-w-sm">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <p className="text-sm font-medium text-slate-500">
            Today&apos;s Appointments
          </p>

          <p className="mt-3 text-4xl font-semibold text-slate-900">
            {loading ? "..." : appointmentCount}
          </p>

          <p className="mt-3 text-sm text-slate-500">
            View appointments →
          </p>
        </div>
      </Link>
    </div>
  );
}