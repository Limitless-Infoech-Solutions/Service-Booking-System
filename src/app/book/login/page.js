
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

export default function PhoneLoginPage() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState('+91');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    const cleaned = phone.replace(/\D/g, '');

    if (!cleaned) {
      setError('Please enter your phone number.');
      return;
    }

    if (cleaned.length < 10 || cleaned.length > 12) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    

    const params = new URLSearchParams({ phone: `${countryCode}${cleaned}` });
    if (email.trim()) {
        params.set('email', email.trim());
      }
    
      router.push(`/book/login/otp?${params.toString()}`);
    };
    
  

  const handlePhoneChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setPhone(value);
    if (error) setError('');
  };

  return (
    <div className="min-h-screen bg-[#fafaf8] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-8 sm:p-10">
          <p className="text-xs font-medium tracking-wide uppercase text-[#5751a8] mb-3">
            Welcome
          </p>
          <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900 mb-2">
            Let&apos;s get you booked
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Enter your phone number to continue.
          </p>

          <form onSubmit={handleSubmit} noValidate>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Phone number
            </label>
            <div className="flex items-stretch rounded-xl border border-gray-200 focus-within:border-[#5751a8] focus-within:ring-2 focus-within:ring-[#5751a8]/10 transition">
              <span className="flex items-center justify-center px-4 border-r border-gray-200 bg-gray-50/50 text-sm font-medium text-slate-700 rounded-l-xl select-none">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={12}
                className="flex-1 px-4 py-3 bg-transparent text-slate-900 placeholder-gray-400 outline-none rounded-r-xl"
              />
            </div>
            

           <div>
            
           </div>
            {error && (
              <p className="mt-2 text-sm text-red-600" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-[#5751a8] hover:bg-[#4a4599] active:bg-[#3f3a88] text-white font-medium py-3 transition-colors"
            >
              Continue
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-gray-400">
            We&apos;ll use your phone number to find your booking details.
          </p>
        </div>
      </motion.div>
    </div>
  );
}