"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, CalendarDays, ArrowRight } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ServiceSelectionStep from "@/components/bookings/ServiceSelectionStep";
import DateTimeStep from "@/components/bookings/DateTimeStep";
import PaymentStep from "@/components/bookings/PaymentStep";
import BookingSummary from "@/components/bookings/BookingSummary";
import { services } from "@/data/serviceData";
import { computeBookingTotals } from "@/data/pricing";

const TOTAL_STEPS = 4;

const STEP_COPY = {
  1: { label: "Step 1 of 4" },
  2: { label: "Step 2 of 4" },
  3: { label: "Step 3 of 4" },
  4: { label: "Booking confirmed" },
};

export default function AppointmentPage() {
  const [step, setStep] = useState(1);
  const router = useRouter();
  // Step 1 — services
  const [selectedServices, setSelectedServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Step 2 — date & time
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);

  // Step 3 — payment
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
  });
  const [upiId, setUpiId] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(services.map((s) => s.category))];
    return ["All", ...uniqueCategories];
  }, []);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesCategory =
        activeCategory === "All" || service.category === activeCategory;

      const matchesSearch =
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  // Adding a service from a card starts it at quantity 1.
  // Clicking a service that's already selected removes it entirely.
  const handleSelectService = (service) => {
    setSelectedServices((current) => {
      const alreadySelected = current.some((item) => item.id === service.id);

      if (alreadySelected) {
        return current.filter((item) => item.id !== service.id);
      }

      return [...current, { ...service, qty: 1 }];
    });
  };

  const handleRemoveService = (serviceId) => {
    setSelectedServices((current) =>
      current.filter((service) => service.id !== serviceId)
    );
  };

  // Selecting a new date clears whichever time was picked for the old one,
  // since availability is date-specific.
  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleBack = () => {
    if (step === 1) return; // nothing to go back to — this is the entry step
    setStep((current) => current - 1);
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
      return;
    }

    if (step === 2) {
      router.push("/book/login");
      return;
    }
    if (step === 3) {
      console.log("Submitting payment", {
        selectedServices,
        selectedDate,
        selectedTime,
        contact,
        paymentMethod,
        cardDetails: paymentMethod === "card" ? cardDetails : undefined,
        upiId: paymentMethod === "upi" ? upiId : undefined,
      });

      setStep(4);
    }
  };

  const { total } = computeBookingTotals(selectedServices);

  const isContactComplete =
    contact.name.trim() && contact.phone.trim() && contact.email.trim();

  const isPaymentMethodComplete =
    paymentMethod === "cash" ||
    (paymentMethod === "card" &&
      cardDetails.number.trim() &&
      cardDetails.expiry.trim() &&
      cardDetails.cvv.trim()) ||
    (paymentMethod === "upi" && upiId.trim());

  const canContinue =
    step === 2
      ? Boolean(selectedDate && selectedTime)
      : step === 3
      ? Boolean(isContactComplete && isPaymentMethodComplete && agreedToTerms)
      : true;

  const continueLabel =
    step === 1
      ? "Continue"
      : step === 2
      ? "Confirm date & time"
      : `Pay ₹${total}`;

  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <main className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-[1600px]">
          {/* Header */}
          <header>
            <div className="flex items-center gap-3">
              {step === 1 ? (
                <Link
                  href="/book"
                  aria-label="Go back"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-slate-800 transition-all duration-300 hover:bg-slate-900 hover:text-white"
                >
                  <ArrowLeft size={19} strokeWidth={1.7} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleBack}
                  aria-label="Go back"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-slate-800 transition-all duration-300 hover:bg-slate-900 hover:text-white"
                >
                  <ArrowLeft size={19} strokeWidth={1.7} />
                </button>
              )}

              <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                Book Appointment
                <span>•</span>
                <span>{STEP_COPY[step].label}</span>
              </p>
            </div>

            {/* Step progress */}
            <div className="mt-4 flex gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index < step ? "bg-slate-900" : "bg-black/10"
                  }`}
                />
              ))}
            </div>
          </header>

          {/* Main layout — the summary column starts here, level with the
              heading, and stays sticky all the way down past the content. */}
          <div
            className={
              step === 4
                ? "mt-6"
                : "mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-7 xl:grid-cols-[minmax(0,1fr)_350px]"
            }
          >
            {/* LEFT SIDE */}
            <section className="min-w-0">
              {step === 1 && (
                <ServiceSelectionStep
                  categories={categories}
                  activeCategory={activeCategory}
                  onCategoryChange={setActiveCategory}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  filteredServices={filteredServices}
                  selectedServices={selectedServices}
                  onSelectService={handleSelectService}
                />
              )}

              {step === 2 && (
                <DateTimeStep
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={handleSelectDate}
                  onSelectTime={setSelectedTime}
                />
              )}

              {step === 3 && (
                <PaymentStep
                  total={total}
                  contact={contact}
                  onContactChange={setContact}
                  paymentMethod={paymentMethod}
                  onPaymentMethodChange={setPaymentMethod}
                  cardDetails={cardDetails}
                  onCardDetailsChange={setCardDetails}
                  upiId={upiId}
                  onUpiIdChange={setUpiId}
                  agreedToTerms={agreedToTerms}
                  onAgreedToTermsChange={setAgreedToTerms}
                />
              )}
              {step === 4 && (
                <div className="w-full">
                  <div className="mx-auto max-w-3xl">
                    {/* Success */}
                    <div className="text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <Check size={24} strokeWidth={2.5} />
                        </div>
                      </div>

                      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                        Booking confirmed
                      </h1>

                      <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
                        Your appointment has been successfully booked. We look
                        forward to seeing you.
                      </p>

                      <p className="mt-5 text-sm text-slate-400">
                        Booking reference{" "}
                        <span className="font-semibold text-slate-900">
                          #BK-28491
                        </span>
                      </p>
                    </div>

                    {/* Booking Details */}
                    <div className="mt-10 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                      <div className="border-b border-black/5 px-5 py-5 sm:px-7">
                        <h2 className="text-lg font-semibold text-slate-900">
                          Appointment details
                        </h2>
                      </div>

                      <div className="p-5 sm:p-7">
                        {/* Selected services */}
                        <div className="space-y-4">
                          {selectedServices.map((service) => (
                            <div
                              key={service.id}
                              className="flex items-center gap-4 rounded-xl bg-[#fbfaf8] p-3"
                            >
                              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                {service.image && (
                                  <Image
                                    src={service.image}
                                    alt={service.name}
                                    width={200}
                                    height={200}
                                    className="h-full w-full object-cover"
                                  ></Image>
                                )}
                              </div>

                              <div className="min-w-0 flex-1">
                                <h3 className="font-semibold text-slate-900">
                                  {service.name}
                                </h3>

                                <p className="mt-1 text-sm text-slate-500">
                                  Quantity: {service.qty}
                                </p>
                              </div>

                              <p className="text-sm font-semibold text-slate-900">
                                ₹{service.price * service.qty}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* Appointment information */}
                        <div className="mt-7 grid grid-cols-1 gap-5 border-t border-black/5 pt-7 sm:grid-cols-2">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Date
                            </p>

                            <p className="mt-1.5 text-sm font-medium text-slate-900">
                              {selectedDate
                                ? new Date(selectedDate).toLocaleDateString(
                                    "en-IN",
                                    {
                                      weekday: "long",
                                      day: "numeric",
                                      month: "long",
                                    }
                                  )
                                : "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Time
                            </p>

                            <p className="mt-1.5 text-sm font-medium text-slate-900">
                              {selectedTime || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Customer
                            </p>

                            <p className="mt-1.5 text-sm font-medium text-slate-900">
                              {contact.name || "—"}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                              Amount paid
                            </p>

                            <p className="mt-1.5 text-sm font-semibold text-slate-900">
                              ₹{total}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <button
                        type="button"
                        className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-6 text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-slate-50"
                      >
                        <CalendarDays size={18} />
                        Add to calendar
                      </button>

                      <Link
                        href="/book"
                        className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#f6c945] hover:text-slate-900"
                      >
                        Book another appointment
                        <ArrowRight size={17} />
                      </Link>
                    </div>

                    {/* Help */}
                    <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                      <span>Need help with your booking?</span>

                      <button
                        type="button"
                        className="font-medium text-slate-900 underline underline-offset-2 transition-colors hover:text-[#d19f00]"
                      >
                        Contact us
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {/* RIGHT SIDE — BOOKING SUMMARY */}
            {step !== 4 && (
              <BookingSummary
                selectedServices={selectedServices}
                onRemove={handleRemoveService}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onContinue={handleContinue}
                canContinue={canContinue}
                continueLabel={continueLabel}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
