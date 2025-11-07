// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
console.log("Redeem Voucher Function");
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey, x-supabase-auth'
      }
    });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({
      error: 'Method not allowed'
    }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  try {
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    let body;
    try {
      body = await req.json();
      console.log('Request body:', body);
    } catch (e) {
      console.error('Error parsing request body:', e);
      return new Response(JSON.stringify({
        error: 'Invalid request body'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    const { voucherCode, deviceId, location } = body;
    let redeemingUserId = null;
    let redeemedByValue = null;
    let isAnonymous = false;
    // Check if this is an anonymous user (has deviceId) or authenticated user
    if (deviceId) {
      // Anonymous user - log redemption without creating user account
      console.log('Anonymous redemption with deviceId:', deviceId);
      redeemedByValue = deviceId;
      isAnonymous = true;
    } else if (authHeader) {
      // Authenticated user
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({
          error: 'Invalid token'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      redeemingUserId = user.id;
      redeemedByValue = user.email;
      isAnonymous = false;
    } else {
      return new Response(JSON.stringify({
        error: 'Authentication required. Provide either a valid Authorization header or deviceId for anonymous redemption.'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    if (!voucherCode || typeof voucherCode !== 'string' || voucherCode.trim().length === 0) {
      return new Response(JSON.stringify({
        error: 'Valid voucher code is required.'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    // Use atomic update to prevent race conditions - only update if status is still 'active'
    const { data: voucherData, error: voucherError } = await supabase
      .from('vouchers')
      .update({
        status: 'redeemed',
        redeemedat: new Date().toISOString(),
        redeemedby: redeemedByValue
      })
      .eq('code', voucherCode.toUpperCase())
      .eq('status', 'active') // Only update if still active
      .select('*')
      .single();

    if (voucherError) {
      console.error('Error redeeming voucher:', voucherError);
      if (voucherError.code === 'PGRST116') { // No rows updated
        return new Response(JSON.stringify({
          error: 'Voucher not found or already redeemed.'
        }), {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      return new Response(JSON.stringify({
        error: 'Failed to redeem voucher.'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Check if voucher has expired (after successful update)
    if (voucherData.expiresAt && new Date(voucherData.expiresAt) < new Date()) {
      // Rollback the redemption since voucher was expired
      await supabase.from('vouchers').update({
        status: 'active',
        redeemedat: null,
        redeemedby: null
      }).eq('code', voucherCode.toUpperCase());

      return new Response(JSON.stringify({
        error: 'Voucher has expired.'
      }), {
        status: 410,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const creditAmount = voucherData.credits;
    console.log('Voucher redeemed successfully:', voucherData);
    console.log('Credit amount redeemed:', creditAmount);
    // Handle credits based on user type
    if (isAnonymous) {
      // For anonymous users, log the redemption - credits are managed locally
      console.log('Logging anonymous redemption for deviceId:', deviceId);
      
      const logPayload = {
        event_type: 'voucher_redemption',
        voucher_code: voucherCode.toUpperCase(),
        success: true,
        credits_redeemed: creditAmount,
        device_id: deviceId,
        location: location || null,
      };

      const { error: logError } = await supabase.from('mobile_app_logs').insert(logPayload);

      if (logError) {
        console.error('Error logging voucher redemption:', logError);
      } else {
        console.log('Voucher redemption logged successfully');
      }
    } else {
      // For authenticated users, update their credit balance
      console.log('About to update credits for authenticated user:', redeemingUserId, 'amount:', creditAmount);
      const { data: currentUserData, error: fetchError } = await supabase.from('users').select('creditbalance, credithistory').eq('id', redeemingUserId).single();
      if (fetchError) {
        console.error('Error fetching user credits:', fetchError);
        return new Response(JSON.stringify({
          error: 'Failed to fetch current credits.'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      const currentCredits = currentUserData?.creditbalance || 0;
      const currentHistory = currentUserData?.credithistory || [];
      const newCredits = currentCredits + creditAmount;
      const newHistory = [
        ...currentHistory,
        {
          date: new Date().toISOString(),
          description: `Voucher redemption: ${creditAmount} credits`,
          amount: creditAmount,
          type: 'credit'
        }
      ];
      console.log('User current credits:', currentCredits, 'New total:', newCredits);
      const { error: updateCreditsError } = await supabase.from('users').update({
        creditbalance: newCredits,
        credithistory: newHistory
      }).eq('id', redeemingUserId);
      if (updateCreditsError) {
        console.error('Error updating user credits:', updateCreditsError);
        return new Response(JSON.stringify({
          error: 'Failed to add credits to account.'
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }
      
    }
    return new Response(JSON.stringify({
      success: true,
      creditsRedeemed: creditAmount
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});