import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Clock,
  Users,
  Megaphone,
} from "lucide-react";

export default function GroupBookingPage() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center px-5 py-16 bg-white relative overflow-hidden">

      {/* Background decorations */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-purple-100/70 blur-3xl" />
      <div className="absolute -bottom-40 -right-32 w-96 h-96 rounded-full bg-purple-100/70 blur-3xl" />

      <div className="relative z-10 max-w-3xl w-full text-center">

        {/* Illustration / Icon */}
        <div className="flex justify-center mb-10">
          <div className="relative w-40 h-40 rounded-full bg-purple-50 flex items-center justify-center">

            <div className="w-24 h-24 rounded-3xl bg-purple-600 flex items-center justify-center shadow-xl shadow-purple-200">
              <Users size={48} className="text-white" />
            </div>

            <div className="absolute -top-2 -right-2 w-12 h-12 bg-white rounded-2xl shadow-md flex items-center justify-center">
              <CalendarDays size={25} className="text-purple-600" />
            </div>

            <div className="absolute -bottom-2 -left-2 w-12 h-12 bg-white rounded-full shadow-md flex items-center justify-center">
              <Clock size={24} className="text-purple-600" />
            </div>

          </div>
        </div>

        {/* Coming Soon Badge */}
        <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-purple-100 text-purple-700 font-semibold mb-5">
          <Megaphone size={20} />
          Coming Soon
        </div>

        {/* Heading */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 tracking-tight mb-6">
          Group Booking
        </h1>

        {/* Description */}
        <p className="text-lg sm:text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
          We&apos;re working on making group appointments easier!
          Soon, you&apos;ll be able to book appointments for your
          friends, family, or group together.
        </p>

        {/* Buttons */}
        <div className="flex flex-col items-center gap-4">

          <Link
            href="/book/appointment"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-purple-700 hover:bg-purple-800 text-white font-semibold text-base sm:text-lg transition-all duration-200 shadow-lg shadow-purple-200"
          >
            <CalendarDays size={21} />
            Book an Individual Appointment
            <ArrowRight size={20} />
          </Link>

          <Link
            href="/book"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full border-2 border-purple-700 text-purple-700 hover:bg-purple-50 font-semibold text-base sm:text-lg transition-all duration-200"
          >
            <ArrowLeft size={21} />
            Back to Booking Options
          </Link>

        </div>

      </div>
    </main>
  );
}