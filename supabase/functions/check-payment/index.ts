import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase não configurado");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body = await req.json();
    const transactionId = body.transactionId;

    if (!transactionId) {
      throw new Error("Transaction ID não fornecido");
    }

    const { data, error } = await supabase
      .from("transactions")
      .select("status, paid_at")
      .eq("transaction_id", transactionId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return new Response(
      JSON.stringify({
        success: true,
        status: data?.status || "waiting_payment",
        paidAt: data?.paid_at,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao verificar pagamento:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});