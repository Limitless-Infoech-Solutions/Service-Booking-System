"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Minus,
  Plus,
  X,
  Calendar,
  CalendarClock,
  PartyPopper,
  Zap,
  Users,
  ShieldCheck,
  Gift,
  ChevronRight,
} from "lucide-react";

import { DISCOUNT_THRESHOLD, computeBookingTotals } from "@/data/pricing"

export default function BookingSummary({
  selectedServices,
  onRemove,
  onIncrement,
  onDecrement,
  selectedDate,
  selectedTime,
  onContinue,
  canContinue = true,
  continueLabel = "Continue",
}) {
  const { itemCount, totalDuration, subtotal, qualifiesForDiscount, discount, total } =
    computeBookingTotals(selectedServices);

  const servicesToGo = Math.max(0, DISCOUNT_THRESHOLD - itemCount);

  return (
    <aside className="w-full lg:sticky lg:top-5">
      <div className="overflow-hidden rounded-[22px] border border-black/10 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-black/10 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f3efff] text-[#6862b5]">
              <Calendar size={19} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-base font-semibold tracking-tight text-slate-900">
                Your booking
              </h2>
              <p className="text-xs text-slate-400">
                {itemCount} {itemCount === 1 ? "service" : "services"}{" "}
                selected
              </p>
            </div>
          </div>

          {itemCount > 0 && (
            <span className="flex items-center gap-1 whitespace-nowrap rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-medium text-rose-500">
              <PartyPopper size={12} />
              You&apos;re saving time!
            </span>
          )}
        </div>

        {/* Selected Services */}
        <div className="p-4">
          <AnimatePresence mode="popLayout">
            {selectedServices.map((service) => (
              <motion.div
                key={service.id}
                layout
                initial={{ opacity: 0, height: 0, y: 10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="relative mb-3 flex gap-3 rounded-xl bg-[#f8f7f4] p-3">
                  {/* Image */}
                  <div className="relative h-17 w-17 shrink-0 overflow-hidden rounded-lg">
                    <Image
                      src={service.image}
                      alt={service.name}
                      fill
                      sizes="68px"
                      className="object-cover"
                    />
                  </div>

                  {/* Information */}
                  <div className="min-w-0 flex-1 pr-5">
                    <h3 className="truncate text-sm font-semibold text-slate-900">
                      {service.name}
                    </h3>

                    <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                      <span>{service.duration} min</span>
                      <span>•</span>
                      <span className="font-medium text-slate-700">
                        ₹{service.price}
                      </span>
                    </div>

                    {/* Quantity stepper */}
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onDecrement(service.id)}
                        aria-label={`Decrease ${service.name} quantity`}
                        className="flex h-6 w-6 items-center justify-center rounded-full border border-black/10 bg-white text-slate-600 transition hover:bg-slate-100"
                      >
                        <Minus size={12} />
                      </button>

                      <span className="w-4 text-center text-xs font-semibold text-slate-900">
                        {service.qty}
                      </span>

                      <button
                        type="button"
                        onClick={() => onIncrement(service.id)}
                        aria-label={`Increase ${service.name} quantity`}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-[#6862b5] text-white transition hover:bg-[#564f9e]"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => onRemove(service.id)}
                    aria-label={`Remove ${service.name}`}
                    className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-900"
                  >
                    <X size={13} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Empty state */}
          {selectedServices.length === 0 && (
            <div className="rounded-xl border border-dashed border-black/10 px-4 py-8 text-center">
              <p className="text-sm font-medium text-slate-600">
                No services selected
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                Select a service to add it to your booking.
              </p>
            </div>
          )}
        </div>

        {/* Duration */}
        {selectedServices.length > 0 && (
          <div className="mx-4 flex items-center justify-between rounded-xl bg-[#f3efff] px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-[#6862b5]">
              <Clock size={17} strokeWidth={1.8} />
              <span>Total duration</span>
            </div>

            <span className="text-sm font-semibold text-slate-900">
              {Math.floor(totalDuration / 60) > 0 &&
                `${Math.floor(totalDuration / 60)} hr `}
              {totalDuration % 60 > 0 && `${totalDuration % 60} min`}
              {totalDuration === 0 && "0 min"}
            </span>
          </div>
        )}

        {/* Date & time, once picked */}
        {selectedDate && selectedTime && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-xl bg-[#f3efff] px-4 py-3">
            <div className="flex items-center gap-2 text-sm text-[#6862b5]">
              <CalendarClock size={17} strokeWidth={1.8} />
              <span>Date &amp; time</span>
            </div>

            <span className="text-right text-sm font-semibold text-slate-900">
              {selectedDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
              , {selectedTime}
            </span>
          </div>
        )}

        {/* Pricing */}
        <div className="mt-4 border-t border-black/10 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium text-slate-800">₹{subtotal}</span>
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-slate-500">Discount</span>
            <span
              className={`font-medium ${
                discount > 0 ? "text-emerald-600" : "text-slate-400"
              }`}
            >
              {discount > 0 ? `- ₹${discount}` : "₹0"}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-black/10 pt-4">
            <span className="text-base font-semibold text-slate-900">
              Total
            </span>
            <span className="text-xl font-semibold text-slate-900">
              ₹{total}
            </span>
          </div>

          {/* Savings / upsell banner */}
          {qualifiesForDiscount ? (
            <div className="mt-4 rounded-xl bg-emerald-50 px-4 py-3">
              <p className="text-sm font-medium text-emerald-700">
                You&apos;re saving ₹{discount}!
              </p>
              <p className="mt-0.5 text-xs text-emerald-600">
                Keep going, you deserve it!
              </p>
            </div>
          ) : (
            itemCount > 0 && (
              <div className="mt-4 rounded-xl bg-amber-50 px-4 py-3">
                <p className="text-sm font-medium text-amber-700">
                  Add {servicesToGo} more{" "}
                  {servicesToGo === 1 ? "service" : "services"} to unlock 10%
                  off
                </p>
              </div>
            )
          )}

          {/* Continue */}
          <button
            type="button"
            onClick={onContinue}
            disabled={selectedServices.length === 0 || !canContinue}
            className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#f6c945] text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-[#f0bd2c] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {continueLabel}
            <ArrowRight size={17} />
          </button>

          {/* Trust badges */}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-black/10 pt-5 text-center">
            <div className="flex flex-col items-center gap-1.5">
              <Zap size={16} strokeWidth={1.8} className="text-slate-500" />
              <span className="text-[11px] leading-tight text-slate-500">
                Instant
                <br />
                confirmation
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <Users size={16} strokeWidth={1.8} className="text-slate-500" />
              <span className="text-[11px] leading-tight text-slate-500">
                Expert
                <br />
                professionals
              </span>
            </div>

            <div className="flex flex-col items-center gap-1.5">
              <ShieldCheck
                size={16}
                strokeWidth={1.8}
                className="text-slate-500"
              />
              <span className="text-[11px] leading-tight text-slate-500">
                Secure
                <br />
                booking
              </span>
            </div>
          </div>
        </div>

        {/* Promo strip */}
        <button
          type="button"
          className="flex w-full items-center gap-3 border-t border-black/10 bg-[#f3efff] px-5 py-4 text-left transition hover:bg-[#ece5ff]"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-rose-500">
            <Gift size={15} strokeWidth={1.8} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-slate-800">
              Self care is always a good idea!
            </p>
            <p className="text-[11px] text-slate-500">
              Book 3 or more services &amp; get 10% off
            </p>
          </div>

          <ChevronRight size={16} className="shrink-0 text-slate-400" />
        </button>
      </div>
    </aside>
  );
}