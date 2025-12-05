import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CreatePixRequest {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerDocument: string;
  pixKey: string;
  pixKeyType: string;
  amount?: number;
  itemTitle?: string;
  transactionType?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const paradiseApiKey = Deno.env.get("PARADISE_API_KEY");
    const paradiseProductHash = Deno.env.get("PARADISE_PRODUCT_HASH");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!paradiseApiKey) {
      throw new Error("Paradise API Key não configurada");
    }

    if (!paradiseProductHash) {
      throw new Error("Paradise Product Hash não configurado");
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase não configurado");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: CreatePixRequest = await req.json();

    const amountInCents = body.amount || 2167;
    const amountInReais = amountInCents / 100;
    const itemTitle = body.itemTitle || "Taxa de Confirmação de Identidade";
    const transactionType = body.transactionType || "initial";

    if (amountInCents <= 0) {
      throw new Error("Valor inválido");
    }

    const reference = `pix-${Date.now()}-${transactionType}`;

    const payload = {
      amount: amountInCents,
      description: itemTitle,
      reference: reference,
      productHash: paradiseProductHash,
      postback_url: `${supabaseUrl}/functions/v1/paradise-webhook`,
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone.replace(/\D/g, ""),
        document: body.customerDocument.replace(/\D/g, ""),
      },
    };

    const response = await fetch("https://multi.paradisepags.com/api/v1/transaction.php", {
      method: "POST",
      headers: {
        "X-API-Key": paradiseApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro da Paradise: ${error}`);
    }

    const data = await response.json();

    if (data.status !== "success") {
      throw new Error(data.message || "Erro ao criar transação");
    }

    const expiresAt = data.expires_at ? new Date(data.expires_at) : null;

    const { error: dbError } = await supabase.from("transactions").insert({
      transaction_id: data.transaction_id.toString(),
      customer_name: body.customerName,
      customer_email: body.customerEmail,
      customer_phone: body.customerPhone,
      customer_document: body.customerDocument,
      pix_key: body.pixKey,
      pix_key_type: body.pixKeyType,
      amount: amountInReais,
      status: "pending",
      qrcode: data.qr_code,
      expiration_date: expiresAt ? expiresAt.toISOString().split("T")[0] : null,
      transaction_type: transactionType,
    });

    if (dbError) {
      console.error("Erro ao salvar transação no banco:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: data.transaction_id,
        qrcode: data.qr_code,
        amount: amountInReais,
        expirationDate: expiresAt ? expiresAt.toISOString() : null,
        status: "pending",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Erro ao criar PIX:", error);
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
