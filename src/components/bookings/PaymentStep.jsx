"use client";

import { CreditCard, Lock, ShieldCheck, Smartphone, Store } from "lucide-react";

const PAYMENT_METHODS = [
  { id: "card", label: "Credit / Debit card", icon: CreditCard },
  { id: "upi", label: "UPI", icon: Smartphone },
  { id: "cash", label: "Pay at salon", icon: Store },
];

export default function PaymentStep({
  total,
  contact,
  onContactChange,
  paymentMethod,
  onPaymentMethodChange,
  cardDetails,
  onCardDetailsChange,
  upiId,
  onUpiIdChange,
  agreedToTerms,
  onAgreedToTermsChange,
}) {
  return (
    <>
      {/* Heading */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6862b5] sm:text-xs">
          Book an appointment
        </p>

        <h1 className="mt-2 text-4xl font-medium tracking-[-0.04em] text-slate-900 sm:text-5xl">
          Payment
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          Add your details and choose how you&apos;d like to pay.
        </p>
      </div>

      <div className="mt-8 space-y-6">
        {/* Contact details */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Your details
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-500">
                Full name
              </span>
              <input
                type="text"
                value={contact.name}
                onChange={(event) =>
                  onContactChange({ ...contact, name: event.target.value })
                }
                placeholder="Priya Sharma"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="block">
              <span className="text-xs font-medium text-slate-500">
                Phone number
              </span>
              <input
                type="tel"
                value={contact.phone}
                onChange={(event) =>
                  onContactChange({ ...contact, phone: event.target.value })
                }
                placeholder="98765 43210"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>

            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-slate-500">
                Email
              </span>
              <input
                type="email"
                value={contact.email}
                onChange={(event) =>
                  onContactChange({ ...contact, email: event.target.value })
                }
                placeholder="priya@email.com"
                className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
              />
            </label>
          </div>
        </div>

        {/* Payment method */}
        <div className="rounded-2xl border border-black/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="text-sm font-semibold text-slate-900">
            Payment method
          </h2>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {PAYMENT_METHODS.map((method) => {
              const Icon = method.icon;
              const active = paymentMethod === method.id;

              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => onPaymentMethodChange(method.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-center transition ${
                    active
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-black/10 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  <Icon size={20} strokeWidth={1.8} />
                  <span className="text-xs font-medium">{method.label}</span>
                </button>
              );
            })}
          </div>

          {/* Card fields */}
          {paymentMethod === "card" && (
            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-xs font-medium text-slate-500">
                  Card number
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardDetails.number}
                  onChange={(event) =>
                    onCardDetailsChange({
                      ...cardDetails,
                      number: event.target.value,
                    })
                  }
                  placeholder="1234 5678 9012 3456"
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-500">
                  Expiry (MM/YY)
                </span>
                <input
                  type="text"
                  value={cardDetails.expiry}
                  onChange={(event) =>
                    onCardDetailsChange({
                      ...cardDetails,
                      expiry: event.target.value,
                    })
                  }
                  placeholder="12/28"
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-slate-500">
                  CVV
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cardDetails.cvv}
                  onChange={(event) =>
                    onCardDetailsChange({
                      ...cardDetails,
                      cvv: event.target.value,
                    })
                  }
                  placeholder="123"
                  className="mt-1.5 h-11 w-full rounded-xl border border-black/10 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>
          )}

          {/* UPI field */}
          {paymentMethod === "upi" && (
            <div className="mt-5">
              <label className="block">
                <span className="text-xs font-medium text-slate-500">
                  UPI ID
                </span>
                <input
                  type="text"
                  value={upiId}
                  onChange={(event) => onUpiIdChange(event.target.value)}
                  placeholder="yourname@upi"
                  className="mt-1.5 h-11 w-full max-w-sm rounded-xl border border-black/10 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400"
                />
              </label>
            </div>
          )}

          {/* Pay at salon note */}
          {paymentMethod === "cash" && (
            <p className="mt-5 rounded-xl bg-[#f8f7f4] px-4 py-3 text-xs leading-5 text-slate-500">
              No payment needed now — settle the bill directly at the salon
              after your appointment.
            </p>
          )}

          <div className="mt-5 flex items-center gap-1.5 text-xs text-slate-400">
            <Lock size={12} />
            Your payment details are encrypted and secure.
          </div>
        </div>

        {/* Terms */}
        <label className="flex items-start gap-3 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(event) => onAgreedToTermsChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/20 text-slate-900 focus:ring-slate-400"
          />
          <span>
            I agree to the cancellation policy and terms of service, and
            confirm the details above are correct.
          </span>
        </label>

        {/* Security reassurance, mirrors the trust row in the summary */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck size={14} />
          You&apos;ll pay ₹{total} — nothing is charged until you confirm.
        </div>
      </div>
    </>
  );
}