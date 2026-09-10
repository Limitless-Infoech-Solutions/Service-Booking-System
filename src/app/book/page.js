import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import BookingOptionCard from "@/components/bookings/BookingOptionCard";
import { bookingOptions } from "@/components/bookings/bookingOptions";

export default function BookingPage() {
  return (
    <main className="min-h-screen bg-[#fbfaf8] px-5 py-6 sm:px-8 lg:h-screen lg:overflow-hidden lg:px-10">
      <div className="mx-auto flex h-full max-w-6xl flex-col">
        {/* Back Button */}
        <div className="shrink-0">
          <Link
            href="/"
            aria-label="Go back"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-slate-800 transition-all duration-300 hover:bg-slate-900 hover:text-white sm:h-11 sm:w-11"
          >
            <ArrowLeft size={19} strokeWidth={1.7} />
          </Link>
        </div>

        {/* Heading */}
        <section className="mx-auto shrink-0 text-center">
          <p className="mb-2 mt-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#6862b5] sm:mt-9 sm:text-xs">
            Book an appointment
          </p>

          <h1 className="text-4xl font-medium tracking-[-0.03em] text-slate-900 sm:text-5xl lg:text-[52px]">
            Select an option
          </h1>

          <p className="mt-3 text-sm text-slate-500 sm:text-base">
            How would you like to book?
          </p>
        </section>

        {/* Booking Options */}
        <section className="mx-auto mt-8 grid w-full max-w-4xl gap-5 pb-6 md:grid-cols-2 lg:mt-10 lg:gap-6 lg:pb-0">
          {bookingOptions.map((option) => (
            <BookingOptionCard key={option.id} {...option} />
          ))}
        </section>
      </div>
    </main>
  );
}