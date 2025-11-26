// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

console.log("Redeem Voucher Function");

// Define an interface for the expected request body for type safety
interface RequestBody {
  deviceId?: string;
  appVersion?: string;
  osName?: string;
  osVersion?: string;
  theme?: string;
  voucherCode?: string;
}

// Centralized logging function to ensure consistent and valid payloads
const logRedemption = async (supabase: SupabaseClient, body: RequestBody, result: 'success' | 'error', error: string | null = null, creditBalance: number | null = null) => {
  const logPayload = {
    event_type: 'voucher_redemption',
    device_id: body.deviceId,
    app_version: body.appVersion,
    os_name: body.osName,
    os_version: body.osVersion,
    theme: body.theme,
    result: result,
    error: error,
    credit_balance: creditBalance,
  };

  try {
    const { error: logError } = await supabase.from('mobile_app_logs').insert(logPayload);
    if (logError) {
      console.error('CRITICAL: Failed to log voucher redemption event.', logError);
    } else {
      console.log(`Voucher redemption event logged: ${result}`);
    }
  } catch (e) {
    console.error('CRITICAL: Exception thrown during logging attempt.', e);
  }
};


Deno.serve(async (req: Request) => {
  const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
  let body: RequestBody = {};

  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-supabase-auth' }});
    }
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    }

    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    }

    const { voucherCode, deviceId } = body;
    let redeemingUserId = null;
    let redeemedByValue = null;
    let isAnonymous = false;

    const authHeader = req.headers.get('Authorization');
    if (deviceId) {
      isAnonymous = true;
      redeemedByValue = deviceId;
    } else if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        await logRedemption(supabase, body, 'error', 'Invalid token');
        return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
      }
      redeemingUserId = user.id;
      redeemedByValue = user.email;
    } else {
      await logRedemption(supabase, body, 'error', 'Authentication required');
      return new Response(JSON.stringify({ error: 'Authentication required' }), { status: 401, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    }

    if (!voucherCode) {
      await logRedemption(supabase, body, 'error', 'Valid voucher code is required.');
      return new Response(JSON.stringify({ error: 'Valid voucher code is required.' }), { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    }

    const { data: voucherData, error: voucherError } = await supabase.from('vouchers').update({ status: 'redeemed', redeemedat: new Date().toISOString(), redeemedby: redeemedByValue }).eq('code', voucherCode.toUpperCase()).eq('status', 'active').select('*').single();

    if (voucherError) {
      const isNotFound = voucherError.code === 'PGRST116';
      const errorMessage = isNotFound ? 'Voucher not found or already redeemed.' : `DB error redeeming: ${voucherError.message}`;
      const status = isNotFound ? 404 : 500;
      await logRedemption(supabase, body, 'error', errorMessage);
      return new Response(JSON.stringify({ error: errorMessage }), { status, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
    }

    if (voucherData.expiresAt && new Date(voucherData.expiresAt) < new Date()) {
      await supabase.from('vouchers').update({ status: 'active', redeemedat: null, redeemedby: null }).eq('code', voucherCode.toUpperCase());
      await logRedemption(supabase, body, 'error', 'Voucher has expired.');
      return new Response(JSON.stringify({ error: 'Voucher has expired.' }), { status: 410, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
    }

    const creditAmount = voucherData.credits;
    let finalCreditBalance: number | null = null;

    if (!isAnonymous) {
      const { data: userData, error: fetchError } = await supabase.from('users').select('creditbalance, credithistory').eq('id', redeemingUserId).single();
      if (fetchError) {
        await logRedemption(supabase, body, 'error', `Failed to fetch user: ${fetchError.message}`);
        return new Response(JSON.stringify({ error: 'Failed to fetch current credits.' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
      }

      const currentCredits = userData?.creditbalance || 0;
      const currentHistory = userData?.credithistory || [];
      finalCreditBalance = currentCredits + creditAmount;
      const newHistory = [...currentHistory, { date: new Date().toISOString(), description: `Voucher redemption: ${creditAmount} credits`, amount: creditAmount, type: 'credit' }];

      const { error: updateError } = await supabase.from('users').update({ creditbalance: finalCreditBalance, credithistory: newHistory }).eq('id', redeemingUserId);
      if (updateError) {
        await logRedemption(supabase, body, 'error', `Failed to update credits: ${updateError.message}`, currentCredits);
        return new Response(JSON.stringify({ error: 'Failed to add credits to account.' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }});
      }
    }

    await logRedemption(supabase, body, 'success', null, finalCreditBalance);

    return new Response(JSON.stringify({ success: true, creditsRedeemed: creditAmount }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (e) {
    const error = e instanceof Error ? e : new Error(String(e));
    await logRedemption(supabase, body, 'error', `Internal Server Error: ${error.message}`);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
  }
});