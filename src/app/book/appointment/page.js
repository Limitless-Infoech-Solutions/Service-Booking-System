"use client";

import Link from "next/link";
import { ArrowLeft, Check, CalendarDays, ArrowRight } from "lucide-react";
import { useCallback, useMemo, useRef, useState, useEffect, useSyncExternalStore } from "react";
import Image from "next/image";
import { BUSINESS_ID } from "@/lib/business";

import ServiceSelectionStep from "@/components/bookings/ServiceSelectionStep";
import DateTimeStep from "@/components/bookings/DateTimeStep";
import PaymentStep from "@/components/bookings/PaymentStep";
import BookingSummary from "@/components/bookings/BookingSummary";
import CustomerAuthModal from "@/components/bookings/CustomerAuthModal";
import BookingReviewStep from "@/components/bookings/BookingReviewStep";
import StaffAssignmentModal from "@/components/bookings/StaffAssignmentModal";

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

function formatBookingDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function sameIds(left, right) {
  return Array.isArray(left) && Array.isArray(right) && left.length === right.length &&
    [...left].sort().every((id, index) => id === [...right].sort()[index]);
}

function isCompatibleActiveHold(savedHold, validatedHold, selection, staffAssignments) {
  if (!savedHold || !validatedHold?.valid || !validatedHold.hold) return false;
  if (savedHold.adminMode !== selection.adminMode || savedHold.date !== selection.date ||
      savedHold.startTime !== selection.time || !sameIds(savedHold.serviceIds, selection.serviceIds)) return false;

  const rows = validatedHold.hold.services || [];
  if (!sameIds(rows.map((item) => item.service_id), selection.serviceIds)) return false;
  const rowsByService = new Map(rows.map((item) => [item.service_id, item]));
  let cursor = new Date(`${selection.date}T${selection.time}:00+05:30`).getTime();

  for (const service of selection.services) {
    const row = rowsByService.get(service.id);
    const end = cursor + Number(service.duration) * 60_000;
    if (!row || new Date(row.start_time).getTime() !== cursor || new Date(row.end_time).getTime() !== end) return false;
    cursor = end;
  }

  if (staffAssignments) {
    const requestedStaff = new Map(staffAssignments.map((item) => [item.service_id, item.staff_id]));
    if (rows.some((item) => requestedStaff.get(item.service_id) !== item.staff_id)) return false;
  }
  return true;
}

// ==================================================
// APPOINTMENT PAGE
// ==================================================

export default function AppointmentPage() {
  const isAdminMode = useSyncExternalStore(
    () => () => {},
    () => new URLSearchParams(window.location.search).get("mode") === "admin",
    () => false
  );
  const [assignmentOptions, setAssignmentOptions] = useState({ loading: false, options: [], error: "" });
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [reservedAssignments, setReservedAssignments] = useState([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmationWarning, setConfirmationWarning] = useState("");
  const holdRequestRef = useRef(false);
  const confirmationRequestRef = useRef(false);
  // ==================================================
  // SERVICES
  // ==================================================

  const [services, setServices] = useState([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [serviceLoadError, setServiceLoadError] = useState("");
  useEffect(() => {
    const adminMode = isAdminMode;
    async function fetchServices() {
      try {
        const params = new URLSearchParams();
        if (adminMode) params.set("mode", "admin");
        else params.set("business_id", BUSINESS_ID);
        const response = await fetch(`/api/services?${params.toString()}`);

        const data = await response.json();
        if (!response.ok || !Array.isArray(data)) throw new Error(data.error || "Unable to load services.");
        setServiceLoadError("");

        console.log("SERVICES API STATUS:", response.status);
        console.log("SERVICES API RESPONSE:", data);

        const formattedServices = data.map((service) => ({
          id: service.id,
          name: service.name,
            description: service.description || "",
          category: service.category,
          duration: service.duration_minutes,
          price: service.price,
          badge: service.badge,
          image: service.image,
        }));

        setServices(formattedServices);
      } catch (error) {
        console.error("Services API error:", error);
        setServiceLoadError(error.message || "Unable to load services.");
      }
      finally {
        setIsLoadingServices(false);
      }
    }

    fetchServices();
  }, [isAdminMode]);

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
  const [isDraftRestored, setIsDraftRestored] = useState(false);
  const [activeFlowHoldConflict, setActiveFlowHoldConflict] = useState(false);
  const draftRestoreStartedRef = useRef(null);
  const draftStorageKey = `appointmentDraft:${isAdminMode ? "admin" : "customer"}`;

  useEffect(() => {
    if (isLoadingServices) return;
    const modeKey = isAdminMode ? "admin" : "customer";
    if (draftRestoreStartedRef.current === modeKey) return;
    draftRestoreStartedRef.current = modeKey;

    async function restoreDraft() {
      let draft = null;
      let savedHold = null;
      try {
        draft = JSON.parse(sessionStorage.getItem(`appointmentDraft:${modeKey}`) || "null");
        savedHold = JSON.parse(sessionStorage.getItem("bookingHold") || "null");
      } catch {
        sessionStorage.removeItem(`appointmentDraft:${modeKey}`);
        sessionStorage.removeItem("bookingHold");
      }

      const serviceIds = Array.isArray(draft?.serviceIds) ? draft.serviceIds : [];
      const restoredServices = services.filter((service) => serviceIds.includes(service.id));
      const dateValid = typeof draft?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(draft.date) &&
        !Number.isNaN(new Date(`${draft.date}T00:00:00Z`).getTime()) &&
        new Date(`${draft.date}T00:00:00Z`).toISOString().slice(0, 10) === draft.date;
      const restoredDate = dateValid
        ? new Date(Number(draft.date.slice(0, 4)), Number(draft.date.slice(5, 7)) - 1, Number(draft.date.slice(8, 10)))
        : null;
      const restoredTime = /^\d{2}:\d{2}$/.test(draft?.time || "") ? draft.time : null;

      setSelectedServices(restoredServices);
      setSelectedDate(restoredDate);
      setSelectedTime(restoredTime);
      const canRestoreDateTimeStep = draft?.step === 2 && restoredServices.length > 0 && restoredDate;
      setStep(canRestoreDateTimeStep ? 2 : 1);

      if (savedHold?.holdId && savedHold.adminMode === isAdminMode) {
        try {
          const params = new URLSearchParams({ hold_id: savedHold.holdId });
          if (isAdminMode) params.set("mode", "admin");
          const response = await fetch(`/api/bookings/hold?${params.toString()}`, { cache: "no-store" });
          const validation = await response.json();
          if (!response.ok || !validation.valid) {
            sessionStorage.removeItem("bookingHold");
            if (validation.code === "HOLD_EXPIRED") {
              setSelectedTime(null);
              setSelectedSlot(null);
              setStep(2);
            }
          } else {
            const savedDate = savedHold.date;
            const savedTime = savedHold.startTime;
            const compatible = isCompatibleActiveHold(savedHold, validation, {
              adminMode: isAdminMode,
              date: savedDate,
              time: savedTime,
              serviceIds: restoredServices.map((service) => service.id),
              services: restoredServices,
            });
            if (compatible && savedDate === draft?.date && savedTime === restoredTime) {
              const assignments = validation.hold.services.map((item) => ({ ...item }));
              setSelectedDate(restoredDate);
              setSelectedTime(savedTime);
              setSelectedSlot({ time: savedTime, assignments, held: true });
              setReservedAssignments(assignments.map((item) => ({
                ...item,
                service_name: restoredServices.find((service) => service.id === item.service_id)?.name,
              })));
              setHoldExpiresAt(validation.hold.expires_at);
              setStep(2);
            } else {
              setActiveFlowHoldConflict(true);
            }
          }
        } catch (error) {
          console.error("Booking hold restoration error:", error);
          sessionStorage.removeItem("bookingHold");
        }
      }

      setIsDraftRestored(true);
    }

    restoreDraft();
  }, [isAdminMode, isLoadingServices, services]);

  useEffect(() => {
    if (!isDraftRestored) return;
    if (step >= 5) {
      sessionStorage.removeItem(draftStorageKey);
      sessionStorage.removeItem("bookingHold");
      return;
    }
    const date = selectedDate ? formatBookingDate(selectedDate) : null;
    sessionStorage.setItem(draftStorageKey, JSON.stringify({
      serviceIds: selectedServices.map((service) => service.id),
      date,
      time: selectedTime,
      step: step === 1 ? 1 : 2,
    }));
  }, [draftStorageKey, isDraftRestored, selectedDate, selectedServices, selectedTime, step]);

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
    if (sessionStorage.getItem("bookingHold")) setActiveFlowHoldConflict(true);
    setSelectedSlot(null);
    setSelectedServices((current) => {
      const alreadySelected = current.some((item) => item.id === service.id);

      if (alreadySelected) {
        return current.filter((item) => item.id !== service.id);
      }

      return [
        ...current,
        {
          ...service,

        },
      ];
    });
  };

  // ==================================================
  // REMOVE SERVICE
  // ==================================================

  const handleRemoveService = (serviceId) => {
    if (sessionStorage.getItem("bookingHold")) setActiveFlowHoldConflict(true);
    setSelectedSlot(null);
    setSelectedServices((current) =>
      current.filter((service) => service.id !== serviceId)
    );
  };

  // ==================================================
  // DATE SELECTION
  // ==================================================

  const handleSelectDate = (date) => {
    if (sessionStorage.getItem("bookingHold")) setActiveFlowHoldConflict(true);
    setSelectedDate(date);

    // Changing the date invalidates the previously
    // selected time.
    setSelectedTime(null);
    setSelectedSlot(null);
  };

  const handleSelectTime = useCallback((time, slot = null) => {
    if (sessionStorage.getItem("bookingHold") && slot?.held !== true) setActiveFlowHoldConflict(true);
    setSelectedTime(time);
    setSelectedSlot(slot);
  }, []);

  const handleAssignmentOptionsChange = useCallback((value) => {
    setAssignmentOptions(value);
  }, []);

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

  const resumeCurrentBookingHold = async (staffAssignments) => {
    let savedHold;
    try {
      savedHold = JSON.parse(sessionStorage.getItem("bookingHold") || "null");
    } catch {
      sessionStorage.removeItem("bookingHold");
      return false;
    }
    if (!savedHold?.holdId || !selectedDate || !selectedTime || !selectedServices.length) return false;

    const dateString = formatBookingDate(selectedDate);
    const serviceIds = selectedServices.map((service) => service.id);
    const params = new URLSearchParams({ hold_id: savedHold.holdId });
    if (isAdminMode) params.set("mode", "admin");

    try {
      const response = await fetch(`/api/bookings/hold?${params.toString()}`, { cache: "no-store" });
      const validation = await response.json();
      if (validation.code === "HOLD_EXPIRED") {
        sessionStorage.removeItem("bookingHold");
        setHoldExpiresAt(null);
        setSelectedTime(null);
        setSelectedSlot(null);
        setStep(2);
        alert("Your booking hold expired. Your services and date are saved; choose an available time again.");
        return true;
      }
      if (response.status === 404) {
        sessionStorage.removeItem("bookingHold");
        return false;
      }
      if (!response.ok || !validation.valid) {
        alert(validation.error || "Unable to validate the current booking hold.");
        return true;
      }

      const compatible = isCompatibleActiveHold(savedHold, validation, {
        adminMode: isAdminMode,
        date: dateString,
        time: selectedTime,
        serviceIds,
        services: selectedServices,
      }, staffAssignments);
      if (!compatible) {
        setActiveFlowHoldConflict(true);
        alert("This booking flow already has an active hold for a different selection. It cannot be replaced until its existing reservation expires.");
        return true;
      }

      setActiveFlowHoldConflict(false);
      setHoldExpiresAt(validation.hold.expires_at);
      const allocations = validation.hold.services.map((item) => ({
        ...item,
        service_name: selectedServices.find((service) => service.id === item.service_id)?.name,
        staff_name: assignmentOptions.options.find((staff) => staff.staff_id === item.staff_id)?.name,
      }));
      setReservedAssignments(allocations);
      setSelectedSlot({ time: selectedTime, assignments: allocations, held: true });
      setIsAssignmentModalOpen(false);
      setIsAuthModalOpen(true);
      return true;
    } catch (error) {
      console.error("Booking hold validation error:", error);
      alert("Unable to validate the current booking hold. Please try again.");
      return true;
    }
  };

  const reserveBookingHold = async ({ adminMode = false, staffAssignments } = {}) => {
    if (holdRequestRef.current || !selectedDate || !selectedTime || !selectedServices.length) return;
    if (await resumeCurrentBookingHold(staffAssignments)) return;
    holdRequestRef.current = true;
    setIsHolding(true);
    try {
      const dateString = formatBookingDate(selectedDate);
      const response = await fetch("/api/bookings/hold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(adminMode ? {} : { business_id: BUSINESS_ID }),
          ...(adminMode ? { admin_mode: true } : {}),
          ...(staffAssignments ? { staff_assignments: staffAssignments } : {}),
          service_ids: selectedServices.map((service) => service.id),
          date: dateString,
          time: selectedTime,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (data.code === "ACTIVE_FLOW_HOLD") setActiveFlowHoldConflict(true);
        alert(data.error || data.message || "Unable to reserve this appointment. Please choose another time or assignment.");
        if (adminMode && data.code === "SLOT_UNAVAILABLE") setIsAssignmentModalOpen(false);
        return;
      }
      const allocationDetails = (data.allocations || []).map((item) => ({
        ...item,
        service_name: selectedServices.find((service) => service.id === item.service_id)?.name,
        staff_name: assignmentOptions.options.find((staff) => staff.staff_id === item.staff_id)?.name,
      }));
      setReservedAssignments(allocationDetails);
      setSelectedSlot({ time: selectedTime, assignments: allocationDetails, held: true });
      setActiveFlowHoldConflict(false);
      sessionStorage.setItem("bookingHold", JSON.stringify({
        holdId: data.holdId,
        expiresAt: data.expiresAt,
        serviceIds: selectedServices.map((service) => service.id),
        date: dateString,
        startTime: selectedTime,
        allocations: allocationDetails,
        adminMode,
      }));
      setHoldExpiresAt(data.expiresAt);
      setIsAssignmentModalOpen(false);
      setIsAuthModalOpen(true);
    } catch (error) {
      console.error("Appointment hold error:", error);
      alert("Something went wrong while reserving your appointment. Please try again.");
    } finally {
      holdRequestRef.current = false;
      setIsHolding(false);
    }
  };

  const handleContinue = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step !== 2 || !selectedDate || !selectedTime || !selectedServices.length || holdRequestRef.current) return;
    if (isAdminMode) {
      if (await resumeCurrentBookingHold()) return;
      if (assignmentOptions.loading) return;
      if (assignmentOptions.error) {
        alert(assignmentOptions.error);
        return;
      }
      if (!assignmentOptions.options.length) {
        alert("No qualified staff availability was returned. Choose another time.");
        return;
      }
      setIsAssignmentModalOpen(true);
      return;
    }
    await reserveBookingHold();
  };

  const handleAdminAssignmentConfirm = (_mode, staffAssignments) => {
    reserveBookingHold({ adminMode: true, staffAssignments });
  };

  // ==================================================
  // CAN CONTINUE
  // ==================================================

  const canContinue = step === 2
    ? Boolean(selectedDate && selectedTime) && !(isAdminMode && assignmentOptions.loading)
    : true;

  // ==================================================
  // BOOKING SUMMARY BUTTON LABEL
  // ==================================================

  const continueLabel =
    step === 1 ? "Continue" : step === 2 ? (isAdminMode && assignmentOptions.loading ? "Checking staff availability…" : "Confirm date & time") : "";

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
          ...(isAdminMode ? { admin_mode: true } : { business_id: BUSINESS_ID }),

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
        if (isAdminMode && data.code === "CONFIRMED_ASSIGNMENT_MISMATCH" && data.appointment_id) {
          setConfirmationWarning(data.error || "The saved appointment differs from the reserved assignment.");
          setAppointmentId(data.appointment_id);
          setStep(5);
          return;
        }
        alert(
          data.message ||
            "Unable to attach your details to this booking. Please try again."
        );
        if (data.code === "HOLD_EXPIRED") {
          sessionStorage.removeItem("bookingHold");
          setIsAuthModalOpen(false);
          setSelectedTime(null);
          setSelectedSlot(null);
          setStep(2);
        }

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

      const response = await fetch(`/api/appointments/${appointmentId}${isAdminMode ? "?mode=admin" : ""}`);

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
  }, [step, appointmentId, isAdminMode]);

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
    if (confirmationRequestRef.current) return;
    confirmationRequestRef.current = true;
    setIsConfirming(true);
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
          ...(isAdminMode ? { admin_mode: true } : {}),
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
        if (["HOLD_EXPIRED", "HOLD_CUSTOMER_MISSING"].includes(data.code)) {
          sessionStorage.removeItem("bookingHold");
          setIsAuthModalOpen(false);
          setSelectedTime(null);
          setSelectedSlot(null);
          setStep(2);
        }

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
    } finally {
      confirmationRequestRef.current = false;
      setIsConfirming(false);
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
                  href={isAdminMode ? "/admin" : "/book"}
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
                {isAdminMode ? "Admin · New Appointment" : "Book Appointment"}
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

          {isAdminMode && serviceLoadError && (
            <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {serviceLoadError} Sign in with an active business-admin account and try again.
            </p>
          )}
          {activeFlowHoldConflict && (
            <p role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              This booking flow still has an active reservation for a different selection. The current database interface does not expose a verified way to release or replace it; it will expire automatically.
            </p>
          )}

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
                  isLoadingServices={isLoadingServices}
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
                  onSelectTime={handleSelectTime}
                  selectedSlot={selectedSlot}
                  preserveSelectedTime={Boolean(selectedSlot?.held)}
                  serviceIds={selectedServices.map((service) => service.id)}
                  adminMode={isAdminMode}
                  onAssignmentOptionsChange={handleAssignmentOptionsChange}
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
                  adminMode={isAdminMode}
                  assignments={reservedAssignments}
                  isConfirming={isConfirming}
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

              {step === 4 && !isAdminMode && (
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
                            {confirmationWarning ? "Appointment created — review required" : "Booking confirmed"}
                          </h1>

                          <p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-slate-500 sm:text-base">
                            {confirmationWarning || "Your appointment has been successfully booked. We look forward to seeing you."}
                          </p>

                          {/* BOOKING REFERENCE */}

                          <p className="mt-5 text-sm text-slate-400">
                            Booking reference{" "}
                            <span className="font-semibold text-slate-900">
                              #{appointment.id?.slice(0, 8).toUpperCase()}
                            </span>
                          </p>
                        </div>

                        {confirmationWarning && <p role="alert" className="mt-5 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">{confirmationWarning} The saved appointment details below are from the database.</p>}

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
                                    {isAdminMode && <p className="mt-1 text-sm text-slate-500">Staff: {item.staff?.name || (reservedAssignments.find((assignment) => assignment.service_id === item.service_id)?.staff_id === item.staff_id ? reservedAssignments.find((assignment) => assignment.service_id === item.service_id)?.staff_name : null) || "Staff assignment unavailable"}</p>}
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
                                        timeZone: "Asia/Kolkata",
                                        weekday: "long",

                                        day: "numeric",

                                        month: "long",

                                        year: "numeric",
                                      })
                                    : "—"}
                                  {isAdminMode && appointment.end_time && ` – ${new Date(appointment.end_time).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" })}`}
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
                                        timeZone: "Asia/Kolkata",
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
                            href={isAdminMode ? "/admin/appointments/new" : "/book"}
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
        {isAssignmentModalOpen && (
          <StaffAssignmentModal
            services={selectedServices}
            staffAvailability={assignmentOptions.options}
            automaticAssignments={selectedSlot?.assignments || []}
            onCancel={() => setIsAssignmentModalOpen(false)}
            onConfirm={handleAdminAssignmentConfirm}
            isSaving={isHolding}
          />
        )}
      </main>
    </div>
  );
}
