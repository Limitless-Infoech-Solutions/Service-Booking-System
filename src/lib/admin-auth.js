import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function authorizeBusinessAdmin(request, requestedBusinessId) {
  const { supabase, response } = createSupabaseServerClient(request);

  if (
    requestedBusinessId !== undefined &&
    requestedBusinessId !== null &&
    typeof requestedBusinessId !== "string"
  ) {
    return {
      supabase,
      response,
      error: "business_id must be a string.",
      status: 400,
    };
  }

  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    return {
      supabase,
      response,
      error: "Authentication is required.",
      status: 401,
    };
  }

  let query = supabase
    .from("business_admins")
    .select("business_id, role, is_active")
    .eq("user_id", authData.user.id)
    .eq("is_active", true);

  if (requestedBusinessId) {
    query = query.eq("business_id", requestedBusinessId);
  }

  const { data: memberships, error } = await query.limit(2);

  if (error) {
    console.error("Business membership lookup failed:", error);
    return {
      supabase,
      response,
      error: "Unable to verify business access.",
      status: 500,
    };
  }

  if (!memberships?.length) {
    return {
      supabase,
      response,
      error: "You do not have access to this business.",
      status: 403,
    };
  }

  if (!requestedBusinessId && memberships.length !== 1) {
    return {
      supabase,
      response,
      error: "A business selection is required for this account.",
      status: 409,
    };
  }

  return {
    supabase,
    response,
    businessId: memberships[0].business_id,
    user: authData.user,
  };
}

export function adminJson(context, body, init) {
  const jsonResponse = NextResponse.json(body, init);

  for (const cookie of context?.response?.cookies?.getAll?.() || []) {
    jsonResponse.cookies.set(cookie);
  }

  return jsonResponse;
}
