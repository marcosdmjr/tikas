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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const publicKey = Deno.env.get("AUREOPAY_PUBLIC_KEY");
    const secretKey = Deno.env.get("AUREOPAY_SECRET_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!publicKey || !secretKey) {
      throw new Error("Chaves da Aureo Pay não configuradas");
    }

    if (!supabaseUrl || !supabaseKey) {
      throw new Error("Supabase não configurado");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const body: CreatePixRequest = await req.json();

    const auth = "Basic " + btoa(publicKey + ":" + secretKey);

    const payload = {
      amount: 2167,
      paymentMethod: "pix",
      currency: "BRL",
      installments: 1,
      postbackUrl: `${supabaseUrl}/functions/v1/aureopay-webhook`,
      externalRef: `pix-${Date.now()}`,
      items: [
        {
          title: "Taxa de Confirmação de Identidade",
          quantity: 1,
          tangible: false,
          unitPrice: 2167,
          externalRef: "taxa-confirmacao",
        },
      ],
      customer: {
        name: body.customerName,
        email: body.customerEmail,
        phone: body.customerPhone,
        document: {
          type: "cpf",
          number: body.customerDocument.replace(/\D/g, ""),
        },
      },
      pix: {
        expirationDate: new Date(Date.now() + 30 * 60 * 1000).toISOString().split("T")[0],
      },
    };

    const response = await fetch("https://api.aureolink.com.br/v1/transactions", {
      method: "POST",
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Erro da Aureo Pay: ${error}`);
    }

    const data = await response.json();

    const { error: dbError } = await supabase.from("transactions").insert({
      transaction_id: data.id.toString(),
      customer_name: body.customerName,
      customer_email: body.customerEmail,
      customer_phone: body.customerPhone,
      customer_document: body.customerDocument,
      pix_key: body.pixKey,
      pix_key_type: body.pixKeyType,
      amount: 21.67,
      status: data.status,
      qrcode: data.pix?.qrcode,
      expiration_date: data.pix?.expirationDate,
    });

    if (dbError) {
      console.error("Erro ao salvar transação no banco:", dbError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: data.id,
        qrcode: data.pix?.qrcode,
        amount: 21.67,
        expirationDate: data.pix?.expirationDate,
        status: data.status,
        secureUrl: data.secureUrl,
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