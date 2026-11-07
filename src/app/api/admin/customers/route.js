import { NextResponse } from "next/server";
import { adminJson, authorizeBusinessAdmin } from "@/lib/admin-auth";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const requestedBusinessId = searchParams.get("business_id");
    const customerId = searchParams.get("customer_id");
    const context = await authorizeBusinessAdmin(request, requestedBusinessId || undefined);
    if (context.error) {
      return adminJson(context, { error: context.error }, { status: context.status });
    }

    if (customerId !== null && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(customerId)) {
      return adminJson(context, { error: "Invalid customer ID." }, { status: 400 });
    }

    let query = context.supabase
      .from("customers")
      .select(`
        id,
        name,
        phone,
        email,
        created_at,
        updated_at${customerId !== null ? ",\n        business_id" : ""}
      `)
      .eq("business_id", context.businessId);

    if (customerId !== null) {
      const { data: customer, error } = await query
        .eq("id", customerId)
        .maybeSingle();

      if (error) {
        console.error("Fetch customer error:", error);

        return NextResponse.json(
          { error: "Failed to fetch customer" },
          { status: 500 }
        );
      }

      if (!customer) {
        return adminJson(context, { error: "Customer not found." }, { status: 404 });
      }

      return adminJson(context, { customer });
    }

    query = query.order("created_at", { ascending: false });
    const { data: customers, error } = await query;

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
