import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";



// ============================================================
// MAIN HOLD ROUTE
// ============================================================

export async function POST(request) {
    try {
      // ==========================================================
      // PART 1 — READ & VALIDATE REQUEST
      // ==========================================================
  
      const body = await request.json();
  
      const { date, startTime, serviceIds } = body;
  
      if (!date || !startTime || !serviceIds) {
        return NextResponse.json(
          {
            error: "date, startTime and serviceIds are required",
          },
          { status: 400 }
        );
      }
  
      if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
        return NextResponse.json(
          {
            error: "At least one service is required",
          },
          { status: 400 }
        );
      }
  
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return NextResponse.json(
          {
            error: "Invalid date format. Expected YYYY-MM-DD",
          },
          { status: 400 }
        );
      }
  
      if (!/^\d{2}:\d{2}$/.test(startTime)) {
        return NextResponse.json(
          {
            error: "Invalid startTime format. Expected HH:MM",
          },
          { status: 400 }
        );
      }
    }  

   
  
