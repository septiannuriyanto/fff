import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type RpcPayload = {
  stock?: unknown[];
  usage?: unknown[];
  ritasi?: unknown[];
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...init.headers,
    },
    ...init,
  });

const formatDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value: string | null) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

serve(async (req) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, { status: 405 });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 },
    );
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const url = new URL(req.url);

    const monthParam = url.searchParams.get("month");
    const startParam = url.searchParams.get("start_date");
    const endParam = url.searchParams.get("end_date");

    let startDate: string;
    let endDate: string;

    if (startParam || endParam) {
      const startParsed = parseDateInput(startParam);
      const endParsed = parseDateInput(endParam);

      if (!startParsed || !endParsed) {
        return jsonResponse(
          { error: "Invalid start_date or end_date. Use YYYY-MM-DD." },
          { status: 400 },
        );
      }

      startDate = formatDate(startParsed);
      endDate = formatDate(endParsed);
    } else {
      const baseDate = monthParam ? parseDateInput(`${monthParam}-01`) : new Date();
      if (!baseDate) {
        return jsonResponse(
          { error: "Invalid month. Use YYYY-MM or provide start_date/end_date." },
          { status: 400 },
        );
      }

      const year = baseDate.getFullYear();
      const month = baseDate.getMonth();
      const isCurrentMonth =
        year === new Date().getFullYear() && month === new Date().getMonth();
      const lastDay = isCurrentMonth ? new Date() : new Date(year, month + 1, 0);

      startDate = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      endDate = formatDate(lastDay);
    }

    const { data, error } = await supabase.rpc("get_first_stock_milestone_raw_monthly", {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error) {
      return jsonResponse({ error: error.message }, { status: 500 });
    }

    const payload = (data ?? { stock: [], usage: [], ritasi: [] }) as RpcPayload;

    return jsonResponse({
      rpc: "get_first_stock_milestone_raw_monthly",
      start_date: startDate,
      end_date: endDate,
      data: payload,
    });
  } catch (error) {
    console.error("fetch-mtd-fuel-data error:", error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 },
    );
  }
});
