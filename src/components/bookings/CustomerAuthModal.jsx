"use client";

import { useEffect, useState } from "react";
import { Clock3, ShieldCheck, ArrowLeft, X } from "lucide-react";

const DEV_OTP = "123456";

export default function CustomerAuthModal({
  expiresAt,
  onClose,
  onComplete,
}) {
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  const [authStep, setAuthStep] = useState("phone");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [nameError, setNameError] = useState("");
  const [existingCustomer, setExistingCustomer] = useState(null);
const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const updateTimer = () => {
      const remaining = Math.max(
        0,
        Math.floor(
          (new Date(expiresAt).getTime() - Date.now()) / 1000
        )
      );

      setRemainingSeconds(remaining);
    };

    updateTimer();

    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;

  const formattedTime = `${String(minutes).padStart(
    2,
    "0"
  )}:${String(seconds).padStart(2, "0")}`;

  // --------------------------------
  // PHONE VALIDATION
  // --------------------------------

  const handlePhoneChange = (event) => {
    const value = event.target.value;

    // Keep digits only.
    const digitsOnly = value.replace(/\D/g, "");

    // If user enters 91XXXXXXXXXX, remove the 91 prefix.
    let indianNumber = digitsOnly;

    if (indianNumber.startsWith("91") && indianNumber.length > 10) {
      indianNumber = indianNumber.slice(2);
    }

    // Maximum 10 digits.
    indianNumber = indianNumber.slice(0, 10);

    setPhone(indianNumber);

    if (phoneError) {
      setPhoneError("");
    }
  };

  const validatePhone = () => {
    if (!phone) {
      setPhoneError("Please enter your mobile number.");
      return false;
    }

    if (phone.length !== 10) {
      setPhoneError("Mobile number must contain 10 digits.");
      return false;
    }

    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError(
        "Please enter a valid Indian mobile number."
      );
      return false;
    }

    return true;
  };

  const handlePhoneSubmit = (event) => {
    event.preventDefault();

    const isValid = validatePhone();

    if (!isValid) return;

    setAuthStep("otp");
  };

  // --------------------------------
  // OTP
  // --------------------------------

  const handleOtpSubmit = async (event) => {
    event.preventDefault();
  
    if (otp.length !== 6) {
      setOtpError("Enter the 6-digit OTP.");
      return;
    }
  
    if (otp !== DEV_OTP) {
      setOtpError("Invalid OTP. For testing, use 123456.");
      return;
    }
  
    setOtpError("");
  
    try {
      const response = await fetch("/api/customers/check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone: `+91${phone}`,
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok || !data.success) {
        setOtpError(
          data.message || "Unable to verify your customer details."
        );
        return;
      }
  
      // Existing customer
      if (data.exists) {
        onComplete({
          id: data.customer.id,
          phone: data.customer.phone,
          name: data.customer.name,
          email: data.customer.email,
          isExistingCustomer: true,
        });
  
        return;
      }
  
      // New customer
      setAuthStep("details");
    } catch (error) {
      console.error("Customer check failed:", error);
  
      setOtpError(
        "Unable to verify your details. Please try again."
      );
    }
  };
  // --------------------------------
  // DETAILS
  // --------------------------------

  const handleDetailsSubmit = (event) => {
    event.preventDefault();

    if (!name.trim()) {
      setNameError("Please enter your name.");
      return;
    }

    setNameError("");

    onComplete({
      phone: `+91${phone}`,
      name: name.trim(),
      email: email.trim() || null,
    });
  };

  const goBackToPhone = () => {
    setAuthStep("phone");
    setOtp("");
    setOtpError("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0e14]/60 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        {/* Top accent */}
        <div className="h-1.5 bg-[#1e9be0]" />

        <div className="p-6 sm:p-8">
          {/* Close */}
          <button
            type="button"
            onClick={onClose}
            className="absolute right-5 top-5 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-[#0b0e14]"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="pr-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1e9be0]/10">
              <ShieldCheck
                size={24}
                className="text-[#1e9be0]"
              />
            </div>

            <h2 className="text-2xl font-semibold tracking-tight text-[#0b0e14]">
              Complete your booking
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-500">
              Verify your mobile number to continue with your
              appointment.
            </p>
          </div>

          {/* Hold timer */}
          <div className="mt-6 flex items-center gap-3 rounded-2xl border border-[#1e9be0]/20 bg-[#1e9be0]/5 px-4 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white">
              <Clock3
                size={18}
                className="text-[#1e9be0]"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500">
                Your appointment is reserved
              </p>

              <p className="mt-0.5 text-sm font-semibold text-[#0b0e14]">
                {remainingSeconds > 0
                  ? `Complete within ${formattedTime}`
                  : "Your hold has expired"}
              </p>
            </div>
          </div>

          {/* PHONE */}
          {authStep === "phone" && remainingSeconds > 0 && (
            <form
              onSubmit={handlePhoneSubmit}
              className="mt-7"
            >
              <label className="mb-2 block text-sm font-medium text-[#0b0e14]">
                Mobile number
              </label>

              <div
                className={`flex overflow-hidden rounded-xl border bg-white transition ${
                  phoneError
                    ? "border-red-400"
                    : "border-gray-300 focus-within:border-[#1e9be0]"
                }`}
              >
                <div className="flex items-center border-r border-gray-200 bg-gray-50 px-4 text-sm font-medium text-gray-600">
                  +91
                </div>

                <input
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="9876543210"
                  maxLength={10}
                  className="min-w-0 flex-1 px-4 py-3 outline-none"
                />
              </div>

              {phoneError && (
                <p className="mt-2 text-sm text-red-500">
                  {phoneError}
                </p>
              )}

              <p className="mt-2 text-xs text-gray-400">
                Enter your 10-digit Indian mobile number.
              </p>

              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-[#0b0e14] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#171b24] cursor-pointer"
              >
                Continue
              </button>
            </form>
          )}

          {/* OTP */}
          {authStep === "otp" && remainingSeconds > 0 && (
            <form
              onSubmit={handleOtpSubmit}
              className="mt-7"
            >
              <button
                type="button"
                onClick={goBackToPhone}
                className="mb-5 flex items-center gap-1.5 text-sm text-gray-500 transition hover:text-[#0b0e14]"
              >
                <ArrowLeft size={15} />
                Change number
              </button>

              <label className="mb-2 block text-sm font-medium text-[#0b0e14]">
                Enter verification code
              </label>

              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(
                    event.target.value
                      .replace(/\D/g, "")
                      .slice(0, 6)
                  );

                  if (otpError) {
                    setOtpError("");
                  }
                }}
                placeholder="123456"
                className={`w-full rounded-xl border px-4 py-3.5 text-center text-lg tracking-[0.5em] outline-none transition ${
                  otpError
                    ? "border-red-400"
                    : "border-gray-300 focus:border-[#1e9be0]"
                }`}
              />

              {otpError && (
                <p className="mt-2 text-center text-sm text-red-500">
                  {otpError}
                </p>
              )}

              <p className="mt-3 text-center text-xs text-gray-400">
                Development OTP: 123456
              </p>

              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-[#0b0e14] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#171b24] cursor-pointer"
              >
                Verify number
              </button>
            </form>
          )}

          {/* DETAILS */}
          {authStep === "details" && remainingSeconds > 0 && (
            <form
              onSubmit={handleDetailsSubmit}
              className="mt-7"
            >
              <div className="mb-5">
                <p className="text-lg font-semibold text-[#0b0e14]">
                  Welcome! 👋
                </p>

                <p className="mt-1 text-sm leading-5 text-gray-500">
                  Just a couple of details and you&apos;re ready to
                  book.
                </p>
              </div>

              <label className="mb-2 block text-sm font-medium text-[#0b0e14]">
                Your name
              </label>

              <input
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);

                  if (nameError) {
                    setNameError("");
                  }
                }}
                placeholder="Enter your name"
                className={`w-full rounded-xl border px-4 py-3.5 outline-none transition ${
                  nameError
                    ? "border-red-400"
                    : "border-gray-300 focus:border-[#1e9be0]"
                }`}
              />

              {nameError && (
                <p className="mt-2 text-sm text-red-500">
                  {nameError}
                </p>
              )}

              <label className="mb-2 mt-5 block text-sm font-medium text-[#0b0e14]">
                Email address
                <span className="ml-1 font-normal text-gray-400">
                  (optional)
                </span>
              </label>

              <input
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-300 px-4 py-3.5 outline-none transition focus:border-[#1e9be0]"
              />

              <button
                type="submit"
                className="mt-5 w-full rounded-xl bg-[#0b0e14] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#171b24] cursor-pointer"
              >
                Continue
              </button>
            </form>
          )}

          {/* EXPIRED */}
          {remainingSeconds <= 0 && (
            <div className="mt-7">
              <p className="mb-4 text-center text-sm text-gray-500">
                Your selected time is no longer reserved. Please
                choose another available time.
              </p>

              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl bg-[#0b0e14] px-4 py-3.5 text-sm font-semibold text-white"
              >
                Choose another time
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}