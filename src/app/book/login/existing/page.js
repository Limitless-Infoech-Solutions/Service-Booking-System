'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, ArrowRight } from 'lucide-react';

function ExistingCustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const handleContinue = () => {
    // Preserve all existing search params (services, date, time, phone, etc.)
    const currentParams = searchParams.toString();
    router.push(`/book/payment?${currentParams}`);
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10 text-center">
          <div className="mx-auto w-16 h-16 bg-[#5751a8]/10 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8 text-[#5751a8]" />
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-3">
            Welcome back!
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            We found your account. You&apos;re all set to continue with your booking.
          </p>

          {phone && (
            <div className="bg-gray-50 rounded-xl py-3 px-4 mb-8 border border-gray-100">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Verified Number</p>
              <p className="text-sm font-medium text-slate-900">{phone}</p>
            </div>
          )}

          <button
            onClick={handleContinue}
            className="w-full rounded-xl bg-[#5751a8] hover:bg-[#4a4599] active:bg-[#3f3a88] text-white font-medium py-3 transition-colors flex items-center justify-center gap-2"
          >
            Continue to payment
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function ExistingCustomerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5751a8]"></div>
      </div>
    }>
      <ExistingCustomerContent />
    </Suspense>
  );
}