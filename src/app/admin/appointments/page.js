"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const BUSINESS_ID = "5ce7f078-0115-4598-a534-4166eae92bbc";

// Development date.
// Later we will replace this with today's date.
const APPOINTMENT_DATE = "2026-10-14";

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchAppointments() {
      try {
        const response = await fetch(
          `/api/admin/appointments?business_id=${BUSINESS_ID}&date=${APPOINTMENT_DATE}`
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load appointments");
        }

        setAppointments(data.appointments);
      } catch (error) {
        console.error(error);
        setError("Failed to load appointments.");
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, []);

  function formatTime(date) {
    return new Date(date).toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Asia/Kolkata",
    });
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading appointments...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-900">
          Appointments
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Appointments for October 14, 2026
        </p>
      </div>

      <div className="space-y-4">
        {appointments.map((appointment) => (
          <div
            key={appointment.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-6">
              <div>
                <h2 className="font-medium text-slate-900">
                  {appointment.customers?.name || "Unknown customer"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {appointment.customers?.phone}
                </p>
              </div>

              <div className="text-sm text-slate-600">
                {formatTime(appointment.start_time)} -{" "}
                {formatTime(appointment.end_time)}
              </div>

              <div>
                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                  {appointment.status}
                </span>
              </div>

              <div className="font-medium text-slate-900">
                ₹{appointment.total_amount}
              </div>

              <Link
                href={`/admin/appointments/${appointment.id}`}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                View Details
              </Link>
            </div>

         
          </div>
        ))}
      </div>
    </div>
  );
}