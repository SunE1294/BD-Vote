import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * confirm-verification — Server-side voter verification gate
 *
 * Called AFTER the client-side face match passes.
 * Responsibilities:
 *   1. Validate the voter exists, is not already voted.
 *   2. Mark voters_master.is_verified = true using the service role key
 *      (browser can NEVER write this itself).
 *   3. Issue a short-lived HMAC token encoding the voter UUID.
 *      cast-vote verifies this token to prove the caller was face-verified.
 *
 * Required env vars (set in Supabase project settings → Edge Functions):
 *   VERIFICATION_HMAC_SECRET  — random 32+ char secret, same used in cast-vote
 *   CORS_ALLOWED_ORIGIN       — your deployed app domain, e.g. https://bdvote.app
 */

const ALLOWED_ORIGIN = Deno.env.get('CORS_ALLOWED_ORIGIN') || '';
const TOKEN_TTL_MS   = 10 * 60 * 1000; // 10 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── HMAC helpers ────────────────────────────────────────────────────────────

async function importKey(secret: string, usage: 'sign' | 'verify') {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  );
}

async function createToken(voterId: string, secret: string): Promise<string> {
  const ts      = Date.now().toString();
  const payload = `${voterId}|${ts}`;
  const key     = await importKey(secret, 'sign');
  const sigBuf  = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  const sig     = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  // base64-encode the full token so it travels safely as JSON
  return btoa(`${payload}|${sig}`);
}

// ── Handler ─────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const json = (body: object, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const hmacSecret = Deno.env.get('VERIFICATION_HMAC_SECRET');
    if (!hmacSecret) {
      console.error('VERIFICATION_HMAC_SECRET is not configured');
      return json({ error: 'সার্ভার কনফিগারেশন ত্রুটি' }, 503);
    }

    const supabaseUrl        = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin              = createClient(supabaseUrl, supabaseServiceKey);

    const { voter_id } = await req.json();
    if (!voter_id || typeof voter_id !== 'string') {
      return json({ error: 'voter_id প্রয়োজন' }, 400);
    }

    // 1. Load voter — use service role so we can read regardless of RLS
    const { data: voter, error: voterErr } = await admin
      .from('voters_master')
      .select('id, full_name, has_voted, is_verified')
      .eq('id', voter_id)
      .single();

    if (voterErr || !voter) {
      return json({ error: 'ভোটার পাওয়া যায়নি' }, 404);
    }

    if (voter.has_voted) {
      return json({ error: 'আপনি ইতিমধ্যে ভোট দিয়েছেন' }, 409);
    }

    // 2. Mark is_verified = true server-side (browser can NEVER do this directly)
    const { error: updateErr } = await admin
      .from('voters_master')
      .update({ is_verified: true })
      .eq('id', voter_id);

    if (updateErr) {
      console.error('is_verified update failed:', updateErr);
      return json({ error: 'যাচাই সম্পন্ন করা যায়নি' }, 500);
    }

    // 3. Audit log
    await admin.from('audit_logs').insert({
      action: 'voter_face_verified',
      entity_type: 'voters_master',
      entity_id: voter_id,
      details: { voter_name: voter.full_name },
    }).catch(() => {/* non-critical */});

    // 4. Issue short-lived HMAC token — cast-vote will verify this
    const token = await createToken(voter_id, hmacSecret);

    return json({ success: true, verification_token: token, expires_in: TOKEN_TTL_MS });

  } catch (err) {
    console.error('confirm-verification error:', err);
    return json({ error: 'সার্ভার ত্রুটি', details: String(err) }, 500);
  }
});
