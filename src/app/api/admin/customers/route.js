import { NextResponse } from "next/server";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedBusinessId = searchParams.get("business_id");
    const context = await authorizeBusinessAdmin(request, requestedBusinessId || undefined);
    if (context.error) {
      return adminJson(context, { error: context.error }, { status: context.status });
    }

    const { data: customers, error } = await context.supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        created_at,
        updated_at
      `)
      .eq("business_id", context.businessId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch customers error:", error);

      return NextResponse.json(
        { error: "Failed to fetch customers" },
        { status: 500 }
      );
    }

    return adminJson(context, {
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
