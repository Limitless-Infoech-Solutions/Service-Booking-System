import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(request) {
  try {
    // --------------------------------------------------
    // PART 1 — Parse JSON body safely
    // --------------------------------------------------
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const { holdId, phone, name, email } = body;

    // --------------------------------------------------
    // PART 2 — Validate base required fields
    // --------------------------------------------------
    if (!holdId) {
      return NextResponse.json(
        { success: false, message: "Hold ID is required." },
        { status: 400 }
      );
    }

    if (typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json(
        { success: false, message: "Phone number is required." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // PART 3 — Normalize phone number
    // --------------------------------------------------
    let normalizedPhone = phone.replace(/\D/g, "");

    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = normalizedPhone.slice(1);
    }

    if (normalizedPhone.length === 10 && /^[6-9]/.test(normalizedPhone)) {
      normalizedPhone = `91${normalizedPhone}`;
    }

    if (
      normalizedPhone.length !== 12 ||
      !normalizedPhone.startsWith("91") ||
      !/^[6-9]/.test(normalizedPhone.slice(2))
    ) {
      return NextResponse.json(
        { success: false, message: "Please provide a valid Indian phone number." },
        { status: 400 }
      );
    }

    // --------------------------------------------------
    // PART 4 — Verify booking hold and expiration
    // --------------------------------------------------
    const { data: hold, error: holdError } = await supabase
      .from("booking_holds")
      .select("id, customer_id, expires_at, status")
      .eq("id", holdId)
      .maybeSingle();

    if (holdError) {
      console.error("Hold lookup error:", holdError);
      return NextResponse.json(
        { success: false, message: "Unable to verify booking hold." },
        { status: 500 }
      );
    }

    if (!hold) {
      return NextResponse.json(
        { success: false, message: "Booking hold not found." },
        { status: 404 }
      );
    }

    if (hold.status !== "active") {
      return NextResponse.json(
        { success: false, message: "This booking hold is no longer active." },
        { status: 409 }
      );
    }

    if (new Date(hold.expires_at) <= new Date()) {
      return NextResponse.json(
        {
          success: false,
          message: "Your booking hold has expired. Please select the time again.",
        },
        { status: 409 }
      );
    }

    // --------------------------------------------------
    // PART 5 — Look up existing customer by phone
    // --------------------------------------------------
    const { data: existingCustomer, error: customerLookupError } =
      await supabase
        .from("customers")
        .select("id, name, phone, email")
        .eq("phone", normalizedPhone)
        .maybeSingle();

    if (customerLookupError) {
      console.error("Customer lookup error:", customerLookupError);
      return NextResponse.json(
        { success: false, message: "Unable to check customer." },
        { status: 500 }
      );
    }

    let customer = existingCustomer;

    // --------------------------------------------------
    // PART 6 — Create new customer (if not found)
    // --------------------------------------------------
    if (!customer) {
      // Validate name only for new customer creation
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json(
          {
            success: false,
            message: "Customer name is required for new customers.",
          },
          { status: 400 }
        );
      }

      const { data: newCustomer, error: createCustomerError } =
  await supabase
    .from("customers")
    .upsert(
      {
        phone: normalizedPhone,
        name: name.trim(),
        email:
          typeof email === "string" && email.trim()
            ? email.trim()
            : null,
      },
      {
        onConflict: "phone",
      }
    )
    .select("id, name, phone, email")
    .single();

if (createCustomerError) {
  console.error("Customer creation error:", createCustomerError);

  return NextResponse.json(
    {
      success: false,
      message: "Unable to create customer.",
    },
    { status: 500 }
  );
}

customer = newCustomer;
    }
    // --------------------------------------------------
    // PART 7 — Attach customer to booking hold
    // --------------------------------------------------
    const { data: updatedHold, error: updateHoldError } = await supabase
      .from("booking_holds")
      .update({ customer_id: customer.id })
      .eq("id", holdId)
      .eq("status", "active")
      .select("id, customer_id, expires_at, status")
      .single();

    if (updateHoldError) {
      console.error("Hold customer update error:", updateHoldError);
      return NextResponse.json(
        { success: false, message: "Unable to attach customer to booking hold." },
        { status: 500 }
      );
    }

    // --------------------------------------------------
    // SUCCESS
    // --------------------------------------------------
    return NextResponse.json({
      success: true,
      customer,
      hold: updatedHold,
    });
  } catch (error) {
    console.error("Hold customer API error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}