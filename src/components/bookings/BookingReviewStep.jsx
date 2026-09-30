"use client";

import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import { useState } from "react";
export default function BookingReviewStep({
  customer,
  selectedServices,
  selectedDate,
  selectedTime,
  holdId,
  onContinue,
}) {
  const total = selectedServices.reduce(
    (sum, service) => sum + Number(service.price || 0) * (service.qty || 1),
    0
  );

  const totalDuration = selectedServices.reduce(
    (sum, service) => sum + Number(service.duration || 0) * (service.qty || 1),
    0
  );

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  };
  const [isConfirming, setIsConfirming] = useState(false);
const [appointmentId, setAppointmentId] = useState(null);
const [error, setError] = useState("");

const handleConfirmBooking = async () => {
  try {
    setIsConfirming(true);
    setError("");

    const response = await fetch("/api/appointments/confirm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        hold_id: holdId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to confirm booking");
    }

    setAppointmentId(data.appointment_id);
  } catch (error) {
    console.error("Confirm booking error:", error);
    setError(error.message || "Something went wrong");
  } finally {
    setIsConfirming(false);
  }
};

  const formattedDate = selectedDate
    ? new Date(selectedDate).toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const firstName = customer?.name?.trim()?.split(" ")[0] || "there";

  return (
    <div className="w-full">
      <div className="mx-auto max-w-3xl">
        {/* Heading */}
        <div>
          <p className="text-sm font-medium text-slate-400">
            Appointment review
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {customer?.isExistingCustomer
              ? `Welcome back, ${firstName}!`
              : `Welcome, ${firstName}!`}
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">
            Review your appointment details before continuing to payment.
          </p>
        </div>

        {/* Appointment details */}
        <div className="mt-8 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
          {/* Services */}
          <div className="border-b border-black/5 px-5 py-5 sm:px-7">
            <h2 className="text-lg font-semibold text-slate-900">
              Your services
            </h2>

            <div className="mt-5 space-y-4">
              {selectedServices.map((service) => (
                <div
                  key={service.id}
                  className="flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-slate-900">
                      {service.name}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {service.duration} min
                      {service.qty > 1 ? ` × ${service.qty}` : ""}
                    </p>
                  </div>

                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    ₹{Number(service.price || 0) * (service.qty || 1)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Date and time */}
          <div className="grid grid-cols-1 gap-5 border-b border-black/5 px-5 py-5 sm:grid-cols-2 sm:px-7">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
                <CalendarDays size={18} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Date
                </p>

                <p className="mt-1 text-sm font-medium text-slate-900">
                  {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 text-slate-700">
                <Clock3 size={18} strokeWidth={1.8} />
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  Time
                </p>

                <p className="mt-1 text-sm font-medium text-slate-900">
                  {selectedTime || "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Duration + Total */}
          <div className="px-5 py-5 sm:px-7">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Duration</span>

              <span className="text-sm font-medium text-slate-900">
                {formatDuration(totalDuration)}
              </span>
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
              <span className="text-base font-semibold text-slate-900">
                Total
              </span>

              <span className="text-xl font-semibold text-slate-900">
                ₹{total}
              </span>
            </div>
          </div>
        </div>

    {/* Confirm Appointment */}
<button
  type="button"
  onClick={onContinue}
  className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#f6c945] hover:text-slate-900"
>
  Confirm Appointment
  <ArrowRight size={17} />
</button>
      </div>
    </div>
  );
}