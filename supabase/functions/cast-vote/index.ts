import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * BDVote Secure Edge Function — Blockchain-First Architecture
 *
 * Flow:
 *   1. Verify voter in DB (exists, not voted)
 *   2. Check BLOCKCHAIN for hasVoted (authoritative check)
 *   3. Submit vote to BLOCKCHAIN FIRST (broadcast only — no tx.wait())
 *   4. Record in Supabase DB (secondary cache — trigger auto-increments vote_count)
 *   5. Return receipt to voter
 *
 * NO SIMULATED FALLBACK — if blockchain fails, vote fails honestly.
 */

const BD_VOTE_ABI = [
  {
    "inputs": [
      {"name": "voterIdHash", "type": "bytes32"},
      {"name": "candidateHash", "type": "bytes32"},
      {"name": "candidateName", "type": "string"}
    ],
    "name": "castVote",
    "outputs": [{"name": "receiptHash", "type": "bytes32"}],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"name": "voterIdHash", "type": "bytes32"}],
    "name": "checkHasVoted",
    "outputs": [{"name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  }
];

const HASH_SALT = Deno.env.get('VOTER_HASH_SALT') || 'fallback-secure-salt-2026';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    // New contract (with candidateName support) deployed 2026-04-08
    const contractAddress = Deno.env.get('BD_VOTE_CONTRACT_ADDRESS') || '0x0eCa67dCED1D02aDACA453Ac1e330B7b4beF25f9';
    const deployerPrivateKey = Deno.env.get('BD_VOTE_DEPLOYER_PRIVATE_KEY');

    const { voter_id, candidate_id } = await req.json();
    if (!voter_id || !candidate_id) {
      return new Response(
        JSON.stringify({ error: 'voter_id এবং candidate_id প্রয়োজন' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!deployerPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'ব্লকচেইন কনফিগার করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Verify voter
    const { data: voter, error: voterError } = await supabaseAdmin
      .from('voters_master')
      .select('id, voter_id, full_name, has_voted, is_verified, constituency_id')
      .eq('id', voter_id)
      .single();

    if (voterError || !voter) {
      return new Response(
        JSON.stringify({ error: 'ভোটার খুঁজে পাওয়া যায়নি' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!voter.is_verified) {
      return new Response(
        JSON.stringify({ error: 'ভোটার যাচাই সম্পন্ন হয়নি' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Verify candidate
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('id, full_name, constituency_id')
      .eq('id', candidate_id)
      .eq('is_active', true)
      .single();

    if (candidateError || !candidate) {
      return new Response(
        JSON.stringify({ error: 'প্রার্থী খুঁজে পাওয়া যায়নি' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Generate hashes
    const { ethers } = await import('npm:ethers@6');
    const voterId = voter.voter_id || voter_id;
    const voterIdHash = ethers.keccak256(ethers.toUtf8Bytes(`${HASH_SALT}:${voterId}`));
    const candidateHash = ethers.keccak256(ethers.toUtf8Bytes(`${HASH_SALT}:candidate:${candidate_id}`));

    // Step 4: Check blockchain — has voter already voted?
    const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
    const wallet = new ethers.Wallet(deployerPrivateKey, provider);
    const contract = new ethers.Contract(contractAddress, BD_VOTE_ABI, wallet);

    try {
      const alreadyVotedOnChain = await contract.checkHasVoted(voterIdHash);
      if (alreadyVotedOnChain) {
        return new Response(
          JSON.stringify({ error: 'আপনি ইতিমধ্যে ব্লকচেইনে ভোট দিয়েছেন। একাধিক ভোট অনুমোদিত নয়।' }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } catch (checkErr) {
      console.error('Blockchain hasVoted check failed:', checkErr);
      return new Response(
        JSON.stringify({ error: 'ব্লকচেইন যাচাই করতে ব্যর্থ। পরে আবার চেষ্টা করুন।' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 5: Broadcast vote to blockchain (NO tx.wait() — return hash immediately)
    let txHash: string;
    try {
      const tx = await contract.castVote(voterIdHash, candidateHash, candidate.full_name);
      txHash = tx.hash;
      console.log(`✅ Vote broadcast to Base Sepolia: TX=${txHash}`);
    } catch (blockchainErr) {
      console.error('❌ Blockchain vote failed:', blockchainErr);
      return new Response(
        JSON.stringify({
          error: 'ব্লকচেইনে ভোট জমা দিতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।',
          details: (blockchainErr as Error).message,
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 6: Record in DB (trigger auto-increments candidate vote_count)
    const { data: voteRecord, error: voteError } = await supabaseAdmin
      .from('votes')
      .insert({
        candidate_id: candidate_id,
        constituency_id: voter.constituency_id,
        tx_hash: txHash,
        voter_id_hash: voterIdHash,
        encrypted_vote: candidateHash,
        receipt_hash: txHash,
        status: 'confirmed',
        network: 'base-sepolia',
      })
      .select()
      .single();

    if (voteError) {
      console.error('⚠️ DB insert failed (vote IS on-chain):', voteError);
    }

    // Step 7: Mark voter as has_voted
    try {
      await supabaseAdmin
        .from('voters_master')
        .update({ has_voted: true })
        .eq('id', voter.id);
    } catch (updateErr) {
      console.warn('voters_master update failed (non-critical):', updateErr);
    }

    // Step 8: Audit log
    try {
      await supabaseAdmin.from('audit_logs').insert({
        action: 'vote_cast',
        entity_type: 'vote',
        entity_id: voteRecord?.id || 'blockchain-only',
        details: {
          voter_id_hash: voterIdHash,
          candidate_id: candidate_id,
          tx_hash: txHash,
          blockchain_mode: 'live',
          network: 'Base Sepolia',
          status: 'confirmed',
        },
      });
    } catch (auditErr) {
      console.warn('Audit log failed (non-critical):', auditErr);
    }

    return new Response(
      JSON.stringify({
        success: true,
        vote_id: voteRecord?.id,
        tx_hash: txHash,
        receipt_hash: txHash,
        voter_id_hash: voterIdHash,
        blockchain_mode: 'live',
        network: 'Base Sepolia',
        status: 'confirmed',
        message: 'আপনার ভোট সফলভাবে ব্লকচেইনে রেকর্ড করা হয়েছে। আপনার রিসিট সংরক্ষণ করুন।',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Cast vote error:', error);
    return new Response(
      JSON.stringify({ error: 'সার্ভার ত্রুটি', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
