'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { UserPlus, ArrowRight } from 'lucide-react';

function NewCustomerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleContinue = () => {
    setError('');
    
    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }

    // Preserve existing params and append new customer details
    const params = new URLSearchParams(searchParams.toString());
    params.set('customerName', name.trim());
    
    if (email.trim()) {
      params.set('customerEmail', email.trim());
    }
    
    router.push(`/book/payment?${params.toString()}`);
  };

  const isButtonDisabled = !name.trim();

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10">
          <div className="mx-auto w-16 h-16 bg-[#5751a8]/10 rounded-full flex items-center justify-center mb-6">
            <UserPlus className="w-8 h-8 text-[#5751a8]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2 text-center">
            Welcome! Let&apos;s get you set up.
          </h1>
          <p className="text-sm text-gray-500 mb-8 text-center">
            We couldn&apos;t find an account with this phone number. Just add a few details to continue.
          </p>

          {phone && (
            <div className="bg-gray-50 rounded-xl py-3 px-4 mb-6 border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Phone Number</p>
                <p className="text-sm font-medium text-slate-900">{phone}</p>
              </div>
              <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-md">Verified</span>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                placeholder="John Doe"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError('');
                }}
                className="w-full px-4 py-3 bg-white text-slate-900 placeholder-gray-400 outline-none rounded-xl border border-gray-200 focus:border-[#5751a8] focus:ring-2 focus:ring-[#5751a8]/10 transition"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                Email address <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-white text-slate-900 placeholder-gray-400 outline-none rounded-xl border border-gray-200 focus:border-[#5751a8] focus:ring-2 focus:ring-[#5751a8]/10 transition"
              />
            </div>
          </div>

          {error && (
            <p className="mt-3 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <button
            onClick={handleContinue}
            disabled={isButtonDisabled}
            className="mt-8 w-full rounded-xl bg-[#5751a8] hover:bg-[#4a4599] active:bg-[#3f3a88] text-white font-medium py-3 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to payment
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function NewCustomerPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#5751a8]"></div>
      </div>
    }>
      <NewCustomerContent />
    </Suspense>
  );
}