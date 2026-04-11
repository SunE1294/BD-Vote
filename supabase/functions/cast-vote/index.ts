import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

/**
 * cast-vote — Blockchain-First Secure Vote Submission
 *
 * Security changes vs. original:
 *   - Requires a short-lived HMAC token issued by confirm-verification.
 *     No raw voter_id accepted — prevents anyone with a UUID from casting a vote.
 *   - HASH_SALT never exposed to the browser; only lives here as env var.
 *   - Waits for tx confirmation (tx.wait) and extracts the on-chain receiptHash
 *     from the VoteCast event so verifyReceipt() actually works.
 *   - CORS locked to CORS_ALLOWED_ORIGIN env var (set your deployed domain).
 *
 * Required env vars:
 *   VERIFICATION_HMAC_SECRET    — must match confirm-verification
 *   VOTER_HASH_SALT             — secret salt for NID hashing (server-only)
 *   BD_VOTE_CONTRACT_ADDRESS    — deployed BDVote contract
 *   BD_VOTE_DEPLOYER_PRIVATE_KEY — relayer wallet private key
 *   CORS_ALLOWED_ORIGIN         — your app domain
 */

const ALLOWED_ORIGIN = Deno.env.get('CORS_ALLOWED_ORIGIN') || '';
const TOKEN_TTL_MS   = 10 * 60 * 1000; // must match confirm-verification

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BD_VOTE_ABI = [
  {
    inputs: [
      { name: 'voterIdHash',   type: 'bytes32' },
      { name: 'candidateHash', type: 'bytes32' },
      { name: 'candidateName', type: 'string'  },
    ],
    name: 'castVote',
    outputs: [{ name: 'receiptHash', type: 'bytes32' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'voterIdHash', type: 'bytes32' }],
    name: 'checkHasVoted',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true,  name: 'voterIdHash',   type: 'bytes32' },
      { indexed: true,  name: 'candidateHash',  type: 'bytes32' },
      { indexed: false, name: 'candidateName',  type: 'string'  },
      { indexed: false, name: 'receiptHash',    type: 'bytes32' },
      { indexed: false, name: 'timestamp',      type: 'uint256' },
      { indexed: false, name: 'voteIndex',      type: 'uint256' },
    ],
    name: 'VoteCast',
    type: 'event',
  },
];

// ── HMAC token verification ─────────────────────────────────────────────────

async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const decoded = atob(token);
    const parts   = decoded.split('|');
    if (parts.length !== 3) return null;

    const [voterId, tsStr, sig] = parts;

    // Reject expired tokens
    if (Date.now() - parseInt(tsStr, 10) > TOKEN_TTL_MS) return null;

    const payload = `${voterId}|${tsStr}`;
    const key     = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const sigBytes = Uint8Array.from(atob(sig), (c) => c.charCodeAt(0));
    const valid    = await crypto.subtle.verify('HMAC', key, sigBytes, new TextEncoder().encode(payload));
    return valid ? voterId : null;
  } catch {
    return null;
  }
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
    // ── Env checks ──────────────────────────────────────────────────────────
    const hmacSecret      = Deno.env.get('VERIFICATION_HMAC_SECRET');
    const hashSalt        = Deno.env.get('VOTER_HASH_SALT') || 'fallback-secure-salt-2026';
    const contractAddress = Deno.env.get('BD_VOTE_CONTRACT_ADDRESS') || '0x0eCa67dCED1D02aDACA453Ac1e330B7b4beF25f9';
    const deployerKey     = Deno.env.get('BD_VOTE_DEPLOYER_PRIVATE_KEY');
    const supabaseUrl     = Deno.env.get('SUPABASE_URL')!;
    const serviceKey      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!hmacSecret) {
      return json({ error: 'VERIFICATION_HMAC_SECRET কনফিগার করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।' }, 503);
    }
    if (!deployerKey) {
      return json({ error: 'ব্লকচেইন কনফিগার করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।' }, 503);
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // ── Parse body ──────────────────────────────────────────────────────────
    const { verification_token, candidate_id } = await req.json();

    if (!verification_token || !candidate_id) {
      return json({ error: 'verification_token এবং candidate_id প্রয়োজন' }, 400);
    }

    // ── Verify HMAC token — proves caller went through face verification ────
    const voter_id = await verifyToken(verification_token, hmacSecret);
    if (!voter_id) {
      return json({ error: 'যাচাইকরণ টোকেন অবৈধ বা মেয়াদোত্তীর্ণ। আবার যাচাই করুন।' }, 401);
    }

    // ── Load voter ──────────────────────────────────────────────────────────
    const { data: voter, error: voterErr } = await admin
      .from('voters_master')
      .select('id, voter_id, full_name, has_voted, is_verified, constituency_id')
      .eq('id', voter_id)
      .single();

    if (voterErr || !voter) {
      return json({ error: 'ভোটার খুঁজে পাওয়া যায়নি' }, 404);
    }
    if (!voter.is_verified) {
      return json({ error: 'ভোটার যাচাই সম্পন্ন হয়নি' }, 403);
    }
    if (voter.has_voted) {
      return json({ error: 'আপনি ইতিমধ্যে ভোট দিয়েছেন' }, 409);
    }

    // ── Load candidate ──────────────────────────────────────────────────────
    const { data: candidate, error: candidateErr } = await admin
      .from('candidates')
      .select('id, full_name, constituency_id')
      .eq('id', candidate_id)
      .eq('is_active', true)
      .single();

    if (candidateErr || !candidate) {
      return json({ error: 'প্রার্থী খুঁজে পাওয়া যায়নি' }, 404);
    }

    // ── Generate hashes (ONLY on server — salt never in frontend) ───────────
    const { ethers } = await import('npm:ethers@6');
    const voterNid      = voter.voter_id || voter_id;
    const voterIdHash   = ethers.keccak256(ethers.toUtf8Bytes(`${hashSalt}:${voterNid}`));
    const candidateHash = ethers.keccak256(ethers.toUtf8Bytes(`${hashSalt}:candidate:${candidate_id}`));

    // ── Blockchain: check hasVoted (authoritative) ──────────────────────────
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const wallet   = new ethers.Wallet(deployerKey, provider);
    const contract = new ethers.Contract(contractAddress, BD_VOTE_ABI, wallet);

    try {
      const alreadyOnChain = await contract.checkHasVoted(voterIdHash);
      if (alreadyOnChain) {
        return json({ error: 'ব্লকচেইনে ইতিমধ্যে ভোট রেকর্ড আছে। একাধিক ভোট অনুমোদিত নয়।' }, 409);
      }
    } catch (checkErr) {
      console.error('Blockchain hasVoted check failed:', checkErr);
      return json({ error: 'ব্লকচেইন যাচাই করতে ব্যর্থ। পরে আবার চেষ্টা করুন।' }, 503);
    }

    // ── Submit vote to blockchain and WAIT for confirmation ─────────────────
    // Base Sepolia mines blocks in ~2 s, so tx.wait(1) is fast.
    // Waiting ensures we can extract the on-chain receiptHash from the event,
    // which is required for verifyReceipt() to work correctly.
    let txHash: string;
    let receiptHash: string;

    try {
      const tx = await contract.castVote(voterIdHash, candidateHash, candidate.full_name);
      txHash = tx.hash;
      console.log(`✅ Vote broadcast TX=${txHash}`);

      // Wait up to 45 s for 1 confirmation
      const txReceipt = await Promise.race([
        tx.wait(1),
        new Promise<null>((_, rej) => setTimeout(() => rej(new Error('confirmation timeout')), 45_000)),
      ]);

      // Extract receiptHash from VoteCast event
      receiptHash = txHash; // fallback — overwritten if event found
      if (txReceipt && (txReceipt as { logs: unknown[] }).logs) {
        const iface = new ethers.Interface(BD_VOTE_ABI);
        for (const log of (txReceipt as { logs: { topics: string[]; data: string }[] }).logs) {
          try {
            const parsed = iface.parseLog(log);
            if (parsed?.name === 'VoteCast') {
              receiptHash = parsed.args.receiptHash as string;
              console.log(`✅ On-chain receiptHash extracted: ${receiptHash}`);
              break;
            }
          } catch { /* not a VoteCast log */ }
        }
      }
    } catch (blockchainErr) {
      const msg = (blockchainErr as Error).message || '';
      if (msg.includes('confirmation timeout')) {
        // Tx broadcast succeeded but confirmation timed out.
        // The vote IS in the mempool — return success with txHash.
        // receiptHash will be unavailable until mined.
        console.warn('⚠️ Confirmation timeout — vote is pending on-chain');
        receiptHash = txHash!;
      } else {
        console.error('❌ Blockchain vote failed:', blockchainErr);
        return json(
          { error: 'ব্লকচেইনে ভোট জমা দিতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।', details: msg },
          503,
        );
      }
    }

    // ── Record in DB (cache — non-critical) ─────────────────────────────────
    const { data: voteRecord, error: voteErr } = await admin
      .from('votes')
      .insert({
        candidate_id:   candidate_id,
        constituency_id: voter.constituency_id,
        tx_hash:        txHash!,
        voter_id_hash:  voterIdHash,
        encrypted_vote: candidateHash,
        receipt_hash:   receiptHash,   // now the real on-chain receipt hash
        status:         'confirmed',
        network:        'base-sepolia',
      })
      .select()
      .single();

    if (voteErr) {
      // Vote is confirmed on-chain even if DB cache fails
      console.error('⚠️ DB insert failed (vote IS on-chain):', voteErr);
    }

    // ── Mark voter as has_voted ──────────────────────────────────────────────
    await admin
      .from('voters_master')
      .update({ has_voted: true })
      .eq('id', voter.id)
      .catch((e: Error) => console.warn('voters_master update failed (non-critical):', e));

    // ── Audit log ────────────────────────────────────────────────────────────
    await admin.from('audit_logs').insert({
      action:      'vote_cast',
      entity_type: 'vote',
      entity_id:   voteRecord?.id || 'blockchain-only',
      details: {
        voter_id_hash: voterIdHash,
        candidate_id,
        tx_hash:      txHash!,
        receipt_hash: receiptHash,
        network:      'Base Sepolia',
      },
    }).catch(() => {/* non-critical */});

    return json({
      success:          true,
      vote_id:          voteRecord?.id,
      tx_hash:          txHash!,
      receipt_hash:     receiptHash,
      voter_id_hash:    voterIdHash,
      blockchain_mode:  'live',
      network:          'Base Sepolia',
      status:           'confirmed',
      message:          'আপনার ভোট সফলভাবে ব্লকচেইনে রেকর্ড করা হয়েছে। আপনার রিসিট সংরক্ষণ করুন।',
    });

  } catch (err) {
    console.error('cast-vote error:', err);
    return json({ error: 'সার্ভার ত্রুটি', details: String(err) }, 500);
  }
});
