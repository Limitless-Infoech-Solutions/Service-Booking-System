import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const businessId = searchParams.get("business_id");

    if (!businessId) {
      return NextResponse.json(
        { error: "business_id is required" },
        { status: 400 }
      );
    }

    const { data: customers, error } = await supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        created_at,
        updated_at
      `)
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch customers error:", error);

      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      customers,
      total: customers.length,
    });
  } catch (error) {
    console.error("Customers API error:", error);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}