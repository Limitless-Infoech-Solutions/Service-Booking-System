
"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, CalendarDays, ArrowRight, HelpCircle } from "lucide-react";

export default function BookingSuccessPage() {
  const booking = {
    reference: "BK-28491",
    service: "Hair Styling",
    description: "Professional hair styling session",
    image:
      "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80",
    date: "Saturday, 14 September",
    time: "4:00 PM – 5:00 PM",
    customer: "Ayesha",
    amount: "₹1,499",
  };

  return (
    <main className="min-h-screen bg-[#f5f7fa] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-4xl">
        {/* Success Header */}
        <section className="text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1e9be0]/10">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1e9be0] text-white">
              <Check size={25} strokeWidth={2.5} />
            </div>
          </div>

          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-[#0b0e14] sm:text-4xl">
            Booking confirmed
          </h1>

          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500 sm:text-base">
            Your appointment has been successfully booked. We look forward to
            seeing you.
          </p>

          <p className="mt-5 text-sm text-gray-500">
            Booking reference{" "}
            <span className="font-semibold text-[#0b0e14]">
              #{booking.reference}
            </span>
          </p>
        </section>

        {/* Booking Summary */}
        <section className="mt-10 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
            <h2 className="text-lg font-semibold text-[#0b0e14]">
              Appointment details
            </h2>
          </div>

          <div className="p-5 sm:p-7">
            {/* Service */}
            <div className="flex flex-col gap-5 sm:flex-row">
              <div className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-28 sm:w-36">
                <Image
                  src={booking.image}
                  alt={booking.service}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 144px"
                />
              </div>

              <div className="flex flex-1 flex-col justify-center">
                <p className="text-xs font-medium uppercase tracking-wider text-[#1e9be0]">
                  Service
                </p>

                <h3 className="mt-1 text-xl font-semibold text-[#0b0e14]">
                  {booking.service}
                </h3>

                <p className="mt-1 text-sm text-gray-500">
                  {booking.description}
                </p>
              </div>
            </div>

            {/* Details */}
            <div className="mt-7 grid grid-cols-1 gap-5 border-t border-gray-100 pt-7 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Date
                </p>
                <p className="mt-1.5 text-sm font-medium text-[#0b0e14]">
                  {booking.date}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Time
                </p>
                <p className="mt-1.5 text-sm font-medium text-[#0b0e14]">
                  {booking.time}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Customer
                </p>
                <p className="mt-1.5 text-sm font-medium text-[#0b0e14]">
                  {booking.customer}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
                  Amount paid
                </p>
                <p className="mt-1.5 text-sm font-semibold text-[#0b0e14]">
                  {booking.amount}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Actions */}
        <section className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-6 text-sm font-semibold text-[#0b0e14] transition hover:border-gray-300 hover:bg-gray-50"
          >
            <CalendarDays size={18} />
            Add to calendar
          </button>

          <Link
            href="/book"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-[#0b0e14] px-6 text-sm font-semibold text-white transition hover:bg-[#1e9be0]"
          >
            Book another appointment
            <ArrowRight size={17} />
          </Link>
        </section>

        {/* Help */}
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-gray-500">
          <HelpCircle size={16} />
          <span>
            Need help with your booking?{" "}
            <button
              type="button"
              className="font-medium text-[#0b0e14] underline underline-offset-2 hover:text-[#1e9be0]"
            >
              Contact us
            </button>
          </span>
        </div>
      </div>
    </main>
  );
}

