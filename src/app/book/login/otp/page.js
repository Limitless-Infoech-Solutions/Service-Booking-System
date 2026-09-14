
"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";

function maskPhone(fullNumber) {
  const digits = fullNumber.replace(/\D/g, "");

  if (digits.length < 4) return fullNumber;

  const countryCode = fullNumber.match(/^\+\d+/)?.[0] || "";

  const allLocal = digits.slice(
    countryCode.replace("+", "").length
  );

  if (allLocal.length <= 4) return fullNumber;

  const masked =
    allLocal.slice(0, 2) +
    "XXXXXX" +
    allLocal.slice(-2);

  return `${countryCode} ${masked}`;
}

function OtpVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const phone = searchParams.get("phone") || "+91";

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    let timer;

    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCanResend(true);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    setError("");

    const newOtp = [...otp];

    // Handle paste
    if (value.length > 1) {
      const digits = value
        .replace(/\D/g, "")
        .slice(0, 6)
        .split("");

      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });

      setOtp(newOtp);

      const nextIndex = Math.min(
        index + digits.length,
        5
      );

      inputRefs.current[nextIndex]?.focus();

      return;
    }

    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace") {
      if (!otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();

        const newOtp = [...otp];
        newOtp[index - 1] = "";

        setOtp(newOtp);
      } else {
        const newOtp = [...otp];
        newOtp[index] = "";

        setOtp(newOtp);
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleVerify = () => {
    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    // Preserve all existing search params (services, date, time, etc.)
    const currentParams = searchParams.toString();
    const params = new URLSearchParams(currentParams);
    
    // Ensure phone and OTP are in the params
    params.set('phone', phone);
    params.set('otp', code);

    // TEMPORARY FRONTEND ROUTING:
    // Since there is no backend yet to check the database, we default to the 
    // 'new' customer page. Later, your backend API will determine whether to 
    // route to /book/login/existing or /book/login/new based on the phone number.
    router.push(`/book/login/new?${params.toString()}`);
  };
  const handleResend = () => {
    if (!canResend) return;

    setCountdown(30);
    setCanResend(false);

    setOtp(["", "", "", "", "", ""]);

    inputRefs.current[0]?.focus();
  };

  const maskedPhone = maskPhone(phone);

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          ease: "easeOut",
        }}
        className="w-full max-w-md"
      >
        <div className="mb-4">
          <Link
            href="/book/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-slate-900 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-4 h-4"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.963a.75.75 0 11-1.04 1.074l-5.5-5.25a.75.75 0 010-1.074l5.5-5.25a.75.75 0 111.04 1.074L5.612 9.25H16.25A.75.75 0 0117 10z"
                clipRule="evenodd"
              />
            </svg>

            Back
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10">
          <p className="text-xs font-medium tracking-wide uppercase text-[#5751a8] mb-3">
            Verification
          </p>

          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
            Verify your number
          </h1>

          <p className="text-sm text-gray-500 mb-1">
            We&apos;ve sent a verification code to
          </p>

          <p className="text-sm font-medium text-slate-900 mb-8">
            {maskedPhone}
          </p>

          <div className="flex justify-between gap-2 sm:gap-3 mb-2">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  inputRefs.current[index] = el;
                }}
                type="tel"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={1}
                value={digit}
                onChange={(e) =>
                  handleChange(
                    index,
                    e.target.value
                  )
                }
                onKeyDown={(e) =>
                  handleKeyDown(index, e)
                }
                onPaste={(e) => {
                  e.preventDefault();

                  const pasted = e.clipboardData
                    .getData("text")
                    .replace(/\D/g, "")
                    .slice(0, 6);

                  if (pasted) {
                    handleChange(index, pasted);
                  }
                }}
                aria-label={`Digit ${index + 1} of 6`}
                className="w-full aspect-square max-w-[56px] text-center text-xl font-semibold text-slate-900 bg-white border border-gray-200 rounded-xl focus:border-[#5751a8] focus:ring-2 focus:ring-[#5751a8]/10 outline-none transition"
              />
            ))}
          </div>

          {error && (
            <p
              className="mt-2 text-sm text-red-600"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="mt-6 text-center text-sm">
            <span className="text-gray-500">
              Didn&apos;t receive the code?{" "}
            </span>

            {canResend ? (
              <button
                onClick={handleResend}
                className="font-medium text-[#5751a8] hover:text-[#4a4599] transition-colors"
              >
                Resend code
              </button>
            ) : (
              <span className="text-gray-400">
                Resend in {countdown}s
              </span>
            )}
          </div>

          <button
            onClick={handleVerify}
            className="mt-8 w-full rounded-xl bg-[#5751a8] hover:bg-[#4a4599] active:bg-[#3f3a88] text-white font-medium py-3 transition-colors"
          >
            Verify & Continue
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function OtpVerificationPage() {
  return (
    <Suspense fallback={null}>
      <OtpVerificationContent />
    </Suspense>
  );
}

