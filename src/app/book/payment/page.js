"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import PaymentStep from "@/components/bookings/PaymentStep";

function PaymentContent() {
const router = useRouter();
const searchParams = useSearchParams();

// Customer information coming from the login flow
const [contact, setContact] = useState({
name: searchParams.get("name") || "",
phone: searchParams.get("phone") || "",
email: searchParams.get("email") || "",
});

// Payment state
const [paymentMethod, setPaymentMethod] = useState("card");

const [cardDetails, setCardDetails] = useState({
number: "",
expiry: "",
cvv: "",
});

const [upiId, setUpiId] = useState("");

const [agreedToTerms, setAgreedToTerms] = useState(false);

// Temporary total.
// We will connect this to the actual selected services later.
const total = Number(searchParams.get("total")) || 0;

const isContactComplete =
contact.name.trim() &&
contact.phone.trim();

const isPaymentMethodComplete =
paymentMethod === "cash" ||
(paymentMethod === "card" &&
cardDetails.number.trim() &&
cardDetails.expiry.trim() &&
cardDetails.cvv.trim()) ||
(paymentMethod === "upi" && upiId.trim());

const canContinue = Boolean(
isContactComplete &&
isPaymentMethodComplete &&
agreedToTerms
);

const handlePayment = () => {
if (!canContinue) return;

console.log("Submitting payment", {
  contact,
  paymentMethod,
  cardDetails:
    paymentMethod === "card" ? cardDetails : undefined,
  upiId: paymentMethod === "upi" ? upiId : undefined,
  total,

  
});
router.push("/book/sucess");

const params = new URLSearchParams(searchParams.toString());

params.set("name", contact.name);
params.set("phone", contact.phone);

if (contact.email.trim()) {
  params.set("email", contact.email);
} else {
  params.delete("email");
}

router.push(`/book/sucess`);


};

return ( <div className="min-h-screen bg-[#fbfaf8]"> <main className="px-4 py-6 sm:px-6 lg:px-8"> <div className="mx-auto w-full max-w-[1600px]">

      {/* Header */}
      <header>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/10 bg-white text-slate-800 transition-all duration-300 hover:bg-slate-900 hover:text-white"
          >
            <ArrowLeft size={19} strokeWidth={1.7} />
          </button>

          <p className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
            Book Appointment
            <span>•</span>
            <span>Payment</span>
          </p>
        </div>

        {/* Progress */}
        <div className="mt-4 flex gap-1.5">
          <span className="h-1 flex-1 rounded-full bg-slate-900" />
          <span className="h-1 flex-1 rounded-full bg-slate-900" />
          <span className="h-1 flex-1 rounded-full bg-slate-900" />
          <span className="h-1 flex-1 rounded-full bg-black/10" />
        </div>
      </header>

      {/* Payment */}
      <div className="mt-6">
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
      </div>

      {/* Continue / Pay */}
      <div className="mx-auto mt-6 w-full max-w-3xl">
        <button
          type="button"
          onClick={handlePayment}
          disabled={!canContinue}
          className="flex h-12 w-full items-center justify-center rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white transition-all duration-200 hover:bg-[#f6c945] hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Pay ₹2000
        </button>
      </div>
    </div>
  </main>
</div>

);
}

export default function PaymentPage() {
return (
<Suspense
fallback={ <div className="flex min-h-screen items-center justify-center bg-[#fafaf8]"> <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[#5751a8]" /> </div>
}
> <PaymentContent /> </Suspense>
);
}
