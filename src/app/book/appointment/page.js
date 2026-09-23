"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Check, CalendarDays, ArrowRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import ServiceSelectionStep from "@/components/bookings/ServiceSelectionStep";
import DateTimeStep from "@/components/bookings/DateTimeStep";
import PaymentStep from "@/components/bookings/PaymentStep";
import BookingSummary from "@/components/bookings/BookingSummary";
import CustomerAuthModal from "@/components/bookings/CustomerAuthModal";
import BookingReviewStep from "@/components/bookings/BookingReviewStep";

const TOTAL_STEPS = 5;

const STEP_COPY = {
  1: { label: "Step 1 of 5" },
  2: { label: "Step 2 of 5" },
  3: { label: "Step 3 of 5" },
  4: { label: "Step 4 of 5" },
  5: { label: "Booking confirmed" },
};

export default function AppointmentPage() {
  const [services, setServices] = useState([]);

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch("/api/services");
        const data = await response.json();

        console.log("SERVICES API STATUS:", response.status);
        console.log("SERVICES API RESPONSE:", data);

        const formattedServices = data.map((service) => ({
          id: service.id,
          name: service.name,
          description: service.description,
          category: service.category,
          duration: service.duration_minutes,
          price: service.price,
          badge: service.badge,
          image: service.image,
        }));

        setServices(formattedServices);
      } catch (error) {
        console.error("Services API error:", error);
      }
    }

    fetchServices();
  }, []);

  const [step, setStep] = useState(1);
  const router = useRouter();

  // --------------------------------------------------
  // STEP 1 — SERVICES
  // --------------------------------------------------

  const [selectedServices, setSelectedServices] = useState([]);
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // --------------------------------------------------
  // STEP 2 — DATE & TIME / HOLD
  // --------------------------------------------------

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [isHolding, setIsHolding] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [holdExpiresAt, setHoldExpiresAt] = useState(null);
  const [authenticatedCustomer, setAuthenticatedCustomer] = useState(null);

  // --------------------------------------------------
  // BOOKING / PAYMENT STATE
  // --------------------------------------------------

  const [contact, setContact] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [paymentMethod, setPaymentMethod] = useState("card");

  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
  });

  const [upiId, setUpiId] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // --------------------------------------------------
  // SERVICE FILTERING
  // --------------------------------------------------

  const categories = useMemo(() => {
    const uniqueCategories = [
      ...new Set(services.map((service) => service.category)),
    ];

    return ["All", ...uniqueCategories];
  }, [services]);

  const filteredServices = useMemo(() => {
    return services.filter((service) => {
      const matchesCategory =
        activeCategory === "All" || service.category === activeCategory;

      const matchesSearch =
        service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        service.description.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [services, activeCategory, searchQuery]);

  // --------------------------------------------------
  // SERVICE SELECTION
  // --------------------------------------------------

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

  // --------------------------------------------------
  // DATE SELECTION
  // --------------------------------------------------

  const handleSelectDate = (date) => {
    setSelectedDate(date);
    setSelectedTime(null);
  };

  // --------------------------------------------------
  // BACK
  // --------------------------------------------------

  const handleBack = () => {
    if (step === 1) return;

    setStep((current) => current - 1);
  };

  // --------------------------------------------------
  // CONTINUE / HOLD
  // --------------------------------------------------

  const handleContinue = async () => {
    // STEP 1 → STEP 2
    if (step === 1) {
      setStep(2);
      return;
    }

    // STEP 2 → CREATE HOLD → CUSTOMER AUTH
    if (step === 2) {
      if (isHolding) return;

      if (!selectedDate || !selectedTime || !selectedServices.length) {
        return;
      }

      setIsHolding(true);

      try {
        const year = selectedDate.getFullYear();

        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");

        const day = String(selectedDate.getDate()).padStart(2, "0");

        const dateString = `${year}-${month}-${day}`;

        const response = await fetch("/api/bookings/hold", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            serviceIds: selectedServices.map((service) => service.id),
            date: dateString,
            startTime: selectedTime,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          if (data.code === "SLOT_UNAVAILABLE") {
            alert(
              "This slot is no longer available. Please choose another time."
            );
          } else {
            alert(
              data.error ||
                data.message ||
                "Unable to reserve this appointment. Please try again."
            );
          }

          return;
        }

        // Store temporary booking hold.
        sessionStorage.setItem(
          "bookingHold",
          JSON.stringify({
            holdId: data.holdId,
            expiresAt: data.expiresAt,
            serviceIds: selectedServices.map((service) => service.id),
            date: dateString,
            startTime: selectedTime,
          })
        );

        // Start frontend countdown from backend expiry.
        setHoldExpiresAt(data.expiresAt);

        // Open customer authentication.
        setIsAuthModalOpen(true);
      } catch (error) {
        console.error("Appointment hold error:", error);

        alert(
          "Something went wrong while reserving your appointment. Please try again."
        );
      } finally {
        setIsHolding(false);
      }

      return;
    }
  };

  // --------------------------------------------------
  // CAN CONTINUE
  // --------------------------------------------------

  const canContinue = step === 2 ? Boolean(selectedDate && selectedTime) : true;

  // --------------------------------------------------
  // BOOKING SUMMARY BUTTON LABEL
  // --------------------------------------------------

  const continueLabel =
    step === 1 ? "Continue" : step === 2 ? "Confirm date & time" : "";

  // --------------------------------------------------
  // CUSTOMER AUTH COMPLETE
  // --------------------------------------------------

  const handleAuthComplete = async (customer) => {
    try {
      const bookingHold = sessionStorage.getItem("bookingHold");

      if (!bookingHold) {
        alert(
          "Your appointment hold could not be found. Please select the time again."
        );

        setIsAuthModalOpen(false);
        return;
      }

      const hold = JSON.parse(bookingHold);

      const response = await fetch("/api/customers/authenticate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          holdId: hold.holdId,
          phone: customer.phone,
          name: customer.name,
          email: customer.email,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Unable to attach your details to this booking. Please try again."
        );

        return;
      }

      // Customer is now attached to the booking hold.
      setAuthenticatedCustomer({
        ...data.customer,
        isExistingCustomer: customer.isExistingCustomer || false,
      });

      // Keep customer information available for
      // later payment / confirmation steps.
      setContact({
        name: data.customer.name || "",
        phone: data.customer.phone || "",
        email: data.customer.email || "",
      });

      console.log("Authenticated customer:", data.customer);

      console.log("Updated booking hold:", data.hold);

      setIsAuthModalOpen(false);

      // Customer authentication → Review
      setStep(3);
    } catch (error) {
      console.error("Customer authentication completion error:", error);

      alert(
        "Something went wrong while completing your booking. Please try again."
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <main className="px-4 py-6 pb-24 sm:px-6 sm:pb-24 lg:px-8 lg:pb-6">
        <div className="mx-auto w-full max-w-[1600px]">
          {/* HEADER */}
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

            {/* STEP PROGRESS */}
            <div className="mt-4 flex gap-1.5">
              {Array.from({
                length: TOTAL_STEPS,
              }).map((_, index) => (
                <span
                  key={index}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    index < step ? "bg-slate-900" : "bg-black/10"
                  }`}
                />
              ))}
            </div>
          </header>

          {/* MAIN LAYOUT */}
          <div
            className={
              step === 5
                ? "mt-6"
                : "mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-7 xl:grid-cols-[minmax(0,1fr)_350px]"
            }
          >
            {/* LEFT SIDE */}
            <section className="min-w-0">
              {/* STEP 1 — SERVICES */}
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

              {/* STEP 2 — DATE & TIME */}
              {step === 2 && (
                <DateTimeStep
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={handleSelectDate}
                  onSelectTime={setSelectedTime}
                  serviceIds={selectedServices.map((service) => service.id)}
                />
              )}

              {/* STEP 3 — REVIEW */}
              {step === 3 && (
                <BookingReviewStep
                  customer={authenticatedCustomer}
                  selectedServices={selectedServices}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onContinue={() => setStep(4)}
                />
              )}

              {/* STEP 4 — PAYMENT */}
              {step === 4 && (
                <PaymentStep
                  total={selectedServices.reduce(
                    (sum, service) =>
                      sum + Number(service.price || 0) * (service.qty || 1),
                    0
                  )}
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
                  onConfirmBooking={() => {
                    router.push("/book/sucess");
                  }}
                />
              )}

              {/* STEP 5 — CONFIRMATION */}
              {step === 5 && (
                <div className="w-full">
                  <div className="mx-auto max-w-3xl">
                    {/* SUCCESS */}
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

                    {/* BOOKING DETAILS */}
                    <div className="mt-10 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                      <div className="border-b border-black/5 px-5 py-5 sm:px-7">
                        <h2 className="text-lg font-semibold text-slate-900">
                          Appointment details
                        </h2>
                      </div>

                      <div className="p-5 sm:p-7">
                        {/* SELECTED SERVICES */}
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
                                  />
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
                                ₹
                                {Number(service.price || 0) *
                                  (service.qty || 1)}
                              </p>
                            </div>
                          ))}
                        </div>

                        {/* APPOINTMENT INFORMATION */}
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
                              ₹
                              {selectedServices.reduce(
                                (sum, service) =>
                                  sum +
                                  Number(service.price || 0) *
                                    (service.qty || 1),
                                0
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* ACTIONS */}
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

                    {/* HELP */}
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
            {(step === 1 || step === 2) && (
              <BookingSummary
                selectedServices={selectedServices}
                onRemove={handleRemoveService}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onContinue={handleContinue}
                canContinue={canContinue && !isHolding}
                continueLabel={
                  isHolding ? "Reserving your spot..." : continueLabel
                }
              />
            )}
          </div>
        </div>

        {/* CUSTOMER AUTH MODAL */}
        {isAuthModalOpen && (
          <CustomerAuthModal
            expiresAt={holdExpiresAt}
            onClose={() => {
              setIsAuthModalOpen(false);
            }}
            onComplete={handleAuthComplete}
          />
        )}
      </main>
    </div>
  );
}
