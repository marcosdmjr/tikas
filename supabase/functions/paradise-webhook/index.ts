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

    const webhook = await req.json();
    
    console.log("Webhook Paradise recebido:", webhook);

    if (webhook.webhook_type === "transaction" && webhook.transaction_id) {
      const transactionId = webhook.transaction_id.toString();
      const status = webhook.status;

      const updateData: any = {
        status: status,
        updated_at: new Date().toISOString(),
      };

      if (status === "approved") {
        updateData.paid_at = webhook.timestamp || new Date().toISOString();
      }

      const { error } = await supabase
        .from("transactions")
        .update(updateData)
        .eq("transaction_id", transactionId);

      if (error) {
        console.error("Erro ao atualizar transação:", error);
        throw error;
      }

      console.log(`Transação ${transactionId} atualizada para status: ${status}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro no webhook:", error);
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
