"use client";

import Link from "next/link";
import { ArrowLeft, Check, CalendarDays, ArrowRight } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import { BUSINESS_ID } from "@/lib/business";

import ServiceSelectionStep from "@/components/bookings/ServiceSelectionStep";
import DateTimeStep from "@/components/bookings/DateTimeStep";
import PaymentStep from "@/components/bookings/PaymentStep";
import BookingSummary from "@/components/bookings/BookingSummary";
import CustomerAuthModal from "@/components/bookings/CustomerAuthModal";
import BookingReviewStep from "@/components/bookings/BookingReviewStep";

// ==================================================
// BOOKING FLOW CONFIGURATION
// ==================================================

const TOTAL_STEPS = 5;

const STEP_COPY = {
  1: { label: "Step 1 of 5" },
  2: { label: "Step 2 of 5" },
  3: { label: "Step 3 of 5" },
  4: { label: "Step 4 of 5" },
  5: { label: "Booking confirmed" },
};

// ==================================================
// APPOINTMENT PAGE
// ==================================================

export default function AppointmentPage() {
  // ==================================================
  // SERVICES
  // ==================================================

  const [services, setServices] = useState([]);

  useEffect(() => {
    async function fetchServices() {
      try {
        const response = await fetch(
          `/api/services?business_id=${BUSINESS_ID}`
        );

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

  // ==================================================
  // CURRENT STEP
  // ==================================================

  const [step, setStep] = useState(1);

  // ==================================================
  // STEP 1 — SERVICE SELECTION
  // ==================================================

  const [selectedServices, setSelectedServices] = useState([]);

  const [activeCategory, setActiveCategory] = useState("All");

  const [searchQuery, setSearchQuery] = useState("");

  // ==================================================
  // STEP 2 — DATE / TIME / BOOKING HOLD
  // ==================================================

  const [selectedDate, setSelectedDate] = useState(null);

  const [selectedTime, setSelectedTime] = useState(null);

  const [isHolding, setIsHolding] = useState(false);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [holdExpiresAt, setHoldExpiresAt] = useState(null);

  // ==================================================
  // CUSTOMER AUTHENTICATION
  // ==================================================

  const [authenticatedCustomer, setAuthenticatedCustomer] = useState(null);

  const [contact, setContact] = useState({
    name: "",
    phone: "",
    email: "",
  });

  // ==================================================
  // PAYMENT STATE
  //
  // Payment is not implemented yet.
  // These states remain because PaymentStep will be
  // used when payment is added later.
  // ==================================================

  const [paymentMethod, setPaymentMethod] = useState("card");

  const [cardDetails, setCardDetails] = useState({
    number: "",
    expiry: "",
    cvv: "",
  });

  const [upiId, setUpiId] = useState("");

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // ==================================================
  // APPOINTMENT CONFIRMATION STATE
  //
  // After the booking hold is confirmed:
  //
  // hold
  //   ↓
  // appointment
  //   ↓
  // appointment_id
  //   ↓
  // fetch appointment
  //   ↓
  // Step 5
  // ==================================================

  const [appointmentId, setAppointmentId] = useState(null);

  const [appointment, setAppointment] = useState(null);

  const [isLoadingAppointment, setIsLoadingAppointment] = useState(false);

  // ==================================================
  // SERVICE FILTERING
  // ==================================================

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

  // ==================================================
  // SERVICE SELECTION
  // ==================================================

  const handleSelectService = (service) => {
    setSelectedServices((current) => {
      const alreadySelected = current.some((item) => item.id === service.id);

      if (alreadySelected) {
        return current.filter((item) => item.id !== service.id);
      }

      return [
        ...current,
        {
          ...service,
          qty: 1,
        },
      ];
    });
  };

  // ==================================================
  // REMOVE SERVICE
  // ==================================================

  const handleRemoveService = (serviceId) => {
    setSelectedServices((current) =>
      current.filter((service) => service.id !== serviceId)
    );
  };

  // ==================================================
  // DATE SELECTION
  // ==================================================

  const handleSelectDate = (date) => {
    setSelectedDate(date);

    // Changing the date invalidates the previously
    // selected time.
    setSelectedTime(null);
  };

  // ==================================================
  // BACK BUTTON
  // ==================================================

  const handleBack = () => {
    if (step === 1) {
      return;
    }

    setStep((current) => current - 1);
  };

  // ==================================================
  // CONTINUE BUTTON
  //
  // STEP 1
  //   ↓
  // STEP 2
  //
  // STEP 2
  //   ↓
  // CREATE BOOKING HOLD
  //   ↓
  // CUSTOMER AUTHENTICATION
  // ==================================================

  const handleContinue = async () => {
    // --------------------------------------------------
    // STEP 1 → STEP 2
    // --------------------------------------------------

    if (step === 1) {
      setStep(2);
      return;
    }

    // --------------------------------------------------
    // STEP 2 → CREATE BOOKING HOLD
    // --------------------------------------------------

    if (step === 2) {
      // Prevent duplicate hold requests.
      if (isHolding) {
        return;
      }

      // Required booking information.
      if (!selectedDate || !selectedTime || !selectedServices.length) {
        return;
      }

      setIsHolding(true);

      try {
        // Convert JavaScript Date into YYYY-MM-DD.
        const year = selectedDate.getFullYear();

        const month = String(selectedDate.getMonth() + 1).padStart(2, "0");

        const day = String(selectedDate.getDate()).padStart(2, "0");

        const dateString = `${year}-${month}-${day}`;

        // --------------------------------------------------
        // CREATE BOOKING HOLD
        // --------------------------------------------------

        const response = await fetch("/api/bookings/hold", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify({
            business_id: BUSINESS_ID,

            service_ids: selectedServices.map((service) => service.id),

            date: dateString,

            time: selectedTime,
          }),
        });

        const data = await response.json();

        console.log("Booking hold response:", data);

        // --------------------------------------------------
        // HANDLE HOLD FAILURE
        // --------------------------------------------------

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

        // --------------------------------------------------
        // SAVE HOLD IN SESSION STORAGE
        //
        // This hold is temporary and expires after the
        // backend-defined TTL.
        // --------------------------------------------------

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

        // Start frontend countdown using
        // the backend expiration time.
        setHoldExpiresAt(data.expiresAt);

        // --------------------------------------------------
        // OPEN CUSTOMER AUTHENTICATION
        // --------------------------------------------------

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

  // ==================================================
  // CAN CONTINUE
  // ==================================================

  const canContinue = step === 2 ? Boolean(selectedDate && selectedTime) : true;

  // ==================================================
  // BOOKING SUMMARY BUTTON LABEL
  // ==================================================

  const continueLabel =
    step === 1 ? "Continue" : step === 2 ? "Confirm date & time" : "";

  // ==================================================
  // CUSTOMER AUTHENTICATION COMPLETE
  //
  // The customer is attached to the existing booking
  // hold using the hold ID stored in sessionStorage.
  // ==================================================

  const handleAuthComplete = async (customer) => {
    try {
      // --------------------------------------------------
      // READ EXISTING HOLD
      // --------------------------------------------------

      const bookingHold = sessionStorage.getItem("bookingHold");

      if (!bookingHold) {
        alert(
          "Your appointment hold could not be found. Please select the time again."
        );

        setIsAuthModalOpen(false);

        return;
      }

      const hold = JSON.parse(bookingHold);

      // --------------------------------------------------
      // ATTACH CUSTOMER TO HOLD
      // --------------------------------------------------

      const response = await fetch("/api/customers/authenticate", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          business_id: BUSINESS_ID,

          holdId: hold.holdId,

          phone: customer.phone,

          name: customer.name,

          email: customer.email,
        }),
      });

      const data = await response.json();

      // --------------------------------------------------
      // HANDLE AUTH FAILURE
      // --------------------------------------------------

      if (!response.ok || !data.success) {
        alert(
          data.message ||
            "Unable to attach your details to this booking. Please try again."
        );

        return;
      }

      // --------------------------------------------------
      // STORE AUTHENTICATED CUSTOMER
      // --------------------------------------------------

      setAuthenticatedCustomer({
        ...data.customer,

        isExistingCustomer: customer.isExistingCustomer || false,
      });

      // Keep customer details available
      // for later confirmation/payment.
      setContact({
        name: data.customer.name || "",

        phone: data.customer.phone || "",

        email: data.customer.email || "",
      });

      console.log("Authenticated customer:", data.customer);

      console.log("Updated booking hold:", data.hold);

      // Close authentication modal.
      setIsAuthModalOpen(false);

      // Customer authentication → Review.
      setStep(3);
    } catch (error) {
      console.error("Customer authentication completion error:", error);

      alert(
        "Something went wrong while completing your booking. Please try again."
      );
    }
  };

  // ==================================================
  // FETCH APPOINTMENT
  //
  // Step 5 does not rely on temporary frontend data.
  // It fetches the actual appointment from the database.
  // ==================================================

  useEffect(() => {
    // Only fetch when:
    // 1. We are on Step 5
    // 2. We have an appointment ID
    if (step !== 5 || !appointmentId) {
      return;
    }

    const fetchAppointment = async () => {
      try {
        setIsLoadingAppointment(true);

        const response = await fetch(`/api/appointments/${appointmentId}`);

        const data = await response.json();
        console.log("appointment response", data);

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Failed to fetch appointment");
        }

        // Store database appointment.
        setAppointment(data.appointment);
      } catch (error) {
        console.error("Fetch appointment error:", error);
      } finally {
        setIsLoadingAppointment(false);
      }
    };

    fetchAppointment();
  }, [step, appointmentId]);

  // ==================================================
  // CONFIRM BOOKING
  //
  // Existing flow:
  //
  // booking hold
  //      ↓
  // confirm API
  //      ↓
  // PostgreSQL function
  //      ↓
  // appointment created
  //      ↓
  // appointment_services created
  //      ↓
  // hold marked converted
  //      ↓
  // appointment_id returned
  //      ↓
  // Step 5
  // ==================================================

  const handleConfirmBooking = async () => {
    try {
      // --------------------------------------------------
      // READ BOOKING HOLD
      // --------------------------------------------------

      const bookingHold = sessionStorage.getItem("bookingHold");

      if (!bookingHold) {
        alert(
          "Your booking hold could not be found. Please select the time again."
        );

        return;
      }

      const hold = JSON.parse(bookingHold);

      if (!hold.holdId) {
        alert("Your booking hold is invalid. Please select the time again.");

        return;
      }

      // --------------------------------------------------
      // CONVERT HOLD → APPOINTMENT
      // --------------------------------------------------

      const response = await fetch("/api/appointments/confirm", {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          hold_id: hold.holdId,
        }),
      });

      const data = await response.json();

      // --------------------------------------------------
      // HANDLE CONFIRMATION FAILURE
      // --------------------------------------------------

      if (!response.ok || !data.success) {
        alert(
          data.error || "Unable to confirm your appointment. Please try again."
        );

        return;
      }

      // --------------------------------------------------
      // APPOINTMENT CREATED
      // --------------------------------------------------

      console.log("Appointment confirmed:", data.appointment_id);

      // Store the newly-created appointment ID.
      setAppointmentId(data.appointment_id);

      // Move directly to confirmation.
      //
      // Payment is intentionally skipped for now.
      setStep(5);
    } catch (error) {
      console.error("Confirm booking error:", error);

      alert(
        "Something went wrong while confirming your appointment. Please try again."
      );
    }
  };

  // ==================================================
  // RENDER
  // ==================================================

  return (
    <div className="min-h-screen bg-[#fbfaf8]">
      <main className="px-4 py-6 pb-24 sm:px-6 sm:pb-24 lg:px-8 lg:pb-6">
        <div className="mx-auto w-full max-w-[1600px]">
          {/* ==================================================
              HEADER
              ================================================== */}

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

          {/* ==================================================
              MAIN LAYOUT
              ================================================== */}

          <div
            className={
              step === 5
                ? "mt-6"
                : "mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-7 xl:grid-cols-[minmax(0,1fr)_350px]"
            }
          >
            {/* ==================================================
                LEFT SIDE
                ================================================== */}

            <section className="min-w-0">
              {/* ==================================================
                  STEP 1 — SERVICES
                  ================================================== */}

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

              {/* ==================================================
                  STEP 2 — DATE & TIME
                  ================================================== */}

              {step === 2 && (
                <DateTimeStep
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onSelectDate={handleSelectDate}
                  onSelectTime={setSelectedTime}
                  serviceIds={selectedServices.map((service) => service.id)}
                />
              )}

              {/* ==================================================
                  STEP 3 — REVIEW
                  ================================================== */}

              {step === 3 && (
                <BookingReviewStep
                  customer={authenticatedCustomer}
                  selectedServices={selectedServices}
                  selectedDate={selectedDate}
                  selectedTime={selectedTime}
                  onContinue={handleConfirmBooking}
                />
              )}

              {/* ==================================================
                  STEP 4 — PAYMENT
                  
                  Payment is intentionally skipped for now.
                  
                  The current flow is:
                  
                  Step 3
                    ↓
                  Confirm Booking
                    ↓
                  Step 5
                  
                  This component remains here so payment
                  can be implemented later without changing
                  the overall page structure.
                  ================================================== */}

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
                    // Payment will be implemented later.
                  }}
                />
              )}

              {/* ==================================================
                  STEP 5 — BOOKING CONFIRMATION
                  ================================================== */}

              {step === 5 && (
                <div className="w-full">
                  <div className="mx-auto max-w-3xl">
                    {/* --------------------------------------------------
                        LOADING STATE
                        -------------------------------------------------- */}

                    {isLoadingAppointment ? (
                      <div className="flex min-h-100 items-center justify-center">
                        <p className="text-sm text-slate-500">
                          Loading your booking details...
                        </p>
                      </div>
                    ) : !appointment ? (
                      /* --------------------------------------------------
                         APPOINTMENT LOAD ERROR
                         -------------------------------------------------- */

                      <div className="flex min-h-100 flex-col items-center justify-center text-center">
                        <h1 className="text-2xl font-semibold text-slate-900">
                          Unable to load booking
                        </h1>

                        <p className="mt-2 text-sm text-slate-500">
                          Your appointment may have been confirmed, but we could
                          not load its details.
                        </p>
                      </div>
                    ) : (
                      /* --------------------------------------------------
                         SUCCESS CONTENT
                         -------------------------------------------------- */

                      <>
                        {/* ==================================================
                            SUCCESS HEADER
                            ================================================== */}

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
                            Your appointment has been successfully booked. We
                            look forward to seeing you.
                          </p>

                          {/* BOOKING REFERENCE */}

                          <p className="mt-5 text-sm text-slate-400">
                            Booking reference{" "}
                            <span className="font-semibold text-slate-900">
                              #{appointment.id?.slice(0, 8).toUpperCase()}
                            </span>
                          </p>
                        </div>

                        {/* ==================================================
                            BOOKING DETAILS
                            ================================================== */}

                        <div className="mt-10 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
                          {/* CARD HEADER */}

                          <div className="border-b border-black/5 px-5 py-5 sm:px-7">
                            <h2 className="text-lg font-semibold text-slate-900">
                              Appointment details
                            </h2>
                          </div>

                          <div className="p-5 sm:p-7">
                            {/* ==================================================
                                SELECTED SERVICES
                                ================================================== */}

                            <div className="space-y-4">
                              {appointment.appointment_services?.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-4 rounded-xl bg-[#fbfaf8] p-3"
                                >
                                  {/* SERVICE IMAGE */}

                                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
  {item?.services?.image ? (
    <Image
      src={item.services.image}
      alt={item.services?.name || "Service"}
      width={80}
      height={80}
      className="h-full w-full object-cover"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
      No image
    </div>
  )}
</div>

                                  {/* SERVICE INFORMATION */}

                                  <div className="min-w-0 flex-1">
                                    <h3 className="font-semibold text-slate-900">
                                      {item.services?.name || "Service"}
                                    </h3>

                                    <p className="mt-1 text-sm text-slate-500">
                                      Duration: {item.duration_minutes} minutes
                                    </p>
                                  </div>

                                  {/* SERVICE PRICE */}

                                  <p className="text-sm font-semibold text-slate-900">
                                    ₹
                                    {Number(item.price || 0).toLocaleString(
                                      "en-IN"
                                    )}
                                  </p>
                                </div>
                              ))}
                            </div>

                            {/* ==================================================
                                APPOINTMENT INFORMATION
                                ================================================== */}

                            <div className="mt-7 grid grid-cols-1 gap-5 border-t border-black/5 pt-7 sm:grid-cols-2">
                              {/* DATE */}

                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                  Date
                                </p>

                                <p className="mt-1.5 text-sm font-medium text-slate-900">
                                  {appointment.start_time
                                    ? new Date(
                                        appointment.start_time
                                      ).toLocaleDateString("en-IN", {
                                        weekday: "long",

                                        day: "numeric",

                                        month: "long",

                                        year: "numeric",
                                      })
                                    : "—"}
                                </p>
                              </div>

                              {/* TIME */}

                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                  Time
                                </p>

                                <p className="mt-1.5 text-sm font-medium text-slate-900">
                                  {appointment.start_time
                                    ? new Date(
                                        appointment.start_time
                                      ).toLocaleTimeString("en-IN", {
                                        hour: "numeric",

                                        minute: "2-digit",
                                      })
                                    : "—"}
                                </p>
                              </div>

                              {/* CUSTOMER */}

                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                  Customer
                                </p>

                                <p className="mt-1.5 text-sm font-medium text-slate-900">
                                  {appointment.customers?.name || "—"}
                                </p>
                              </div>

                              {/* TOTAL */}

                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                                  Total amount
                                </p>

                                <p className="mt-1.5 text-sm font-semibold text-slate-900">
                                  ₹
                                  {Number(
                                    appointment.total_amount || 0
                                  ).toLocaleString("en-IN")}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* ==================================================
                            ACTION BUTTONS
                            ================================================== */}

                        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                          {/* ADD TO CALENDAR */}

                          <button
                            type="button"
                            className="flex h-12 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-6 text-sm font-semibold text-slate-900 transition-all duration-200 hover:bg-slate-50"
                          >
                            <CalendarDays size={18} />
                            Add to calendar
                          </button>

                          {/* BOOK ANOTHER */}

                          <Link
                            href="/book"
                            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#f6c945] hover:text-slate-900"
                          >
                            Book another appointment
                            <ArrowRight size={17} />
                          </Link>
                        </div>

                        {/* ==================================================
                            HELP
                            ================================================== */}

                        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                          <span>Need help with your booking?</span>

                          <button
                            type="button"
                            className="font-medium text-slate-900 underline underline-offset-2 transition-colors hover:text-[#d19f00]"
                          >
                            Contact us
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* ==================================================
                RIGHT SIDE — BOOKING SUMMARY
                ================================================== */}

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

        {/* ==================================================
            CUSTOMER AUTHENTICATION MODAL
            ================================================== */}

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
