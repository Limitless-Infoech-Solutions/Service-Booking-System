import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";



/**
 * Helper to validate and format Indian mobile numbers.
 * Converts input like "91 98765 43210" or "+919876543210" -> "919876543210"
 */
function normalizeIndianPhone(input) {
  if (typeof input !== "string") return null;

  // 1. Remove all non-digit characters
  let digits = input.replace(/\D/g, "");

  // 2. Handle country code prefixing
  if (digits.startsWith("0")) {
    digits = digits.slice(1); // Remove leading 0 (e.g. 09876543210 -> 9876543210)
  }

  // If 10 digits provided, attach '91'
  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    return `91${digits}`;
  }

  // If 12 digits provided and starts with '91' followed by valid starting digit
  if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    return digits;
  }

  return null; // Invalid Indian phone number format
}

export async function POST(request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid JSON payload." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizeIndianPhone(body?.phone);

    if (!normalizedPhone) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid 10-digit Indian phone number.",
        },
        { status: 400 }
      );
    }

    // Query database using the standardized "91XXXXXXXXXX" format
    const { data: customer, error } = await supabase
      .from("customers")
      .select("id, name, phone, email")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (error) {
      console.error("Customer check error:", error);
      return NextResponse.json(
        { success: false, message: "Unable to check customer." },
        { status: 500 }
      );
    }

    if (!customer) {
      return NextResponse.json({
        success: true,
        exists: false,
      });
    }

    return NextResponse.json({
      success: true,
      exists: true,
      customer,
    });
  } catch (error) {
    console.error("Customer check API error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong." },
      { status: 500 }
    );
  }
}