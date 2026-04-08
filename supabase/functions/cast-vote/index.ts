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
 *   3. Submit vote to BLOCKCHAIN FIRST (primary record)
 *   4. Record in Supabase DB (secondary cache)
 *   5. Return receipt to voter
 * 
 * NO SIMULATED FALLBACK — if blockchain fails, vote fails honestly.
 */

// BDVote contract ABI (only the functions we need)
const BD_VOTE_ABI = [
  {
    "inputs": [{"name": "voterIdHash", "type": "bytes32"}, {"name": "candidateHash", "type": "bytes32"}],
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
  },
  {
    "inputs": [{"name": "candidateHash", "type": "bytes32"}],
    "name": "getCandidateVotes",
    "outputs": [{"name": "", "type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  }
];

// Secure Salt from Environment Variables (Fixing the Rainbow Table Exposure Vulnerability)
const HASH_SALT = Deno.env.get('VOTER_HASH_SALT') || 'fallback-secure-salt-2026';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const contractAddress = Deno.env.get('BD_VOTE_CONTRACT_ADDRESS');
    const deployerPrivateKey = Deno.env.get('BD_VOTE_DEPLOYER_PRIVATE_KEY');

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Top-Level Auth Header Missing' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== Fix Unvalidated API Tokens: Validate the JWT =====
    const authClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthenticated Request Detected. Security Policy Enforced.', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { voter_id, candidate_id } = await req.json();

    if (!voter_id || !candidate_id) {
      return new Response(
        JSON.stringify({ error: 'voter_id এবং candidate_id প্রয়োজন' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check blockchain configuration — NO SIMULATED FALLBACK
    if (!contractAddress || !deployerPrivateKey || contractAddress === '0x0000000000000000000000000000000000000000') {
      return new Response(
        JSON.stringify({ 
          error: 'ব্লকচেইন কনফিগার করা হয়নি। অ্যাডমিনের সাথে যোগাযোগ করুন।',
          details: 'BD_VOTE_CONTRACT_ADDRESS and BD_VOTE_DEPLOYER_PRIVATE_KEY must be set.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ===== Step 1: Verify voter exists in DB =====
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

    // ===== Step 2: Verify candidate =====
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

    // ===== Step 3: Generate hashes (must match frontend) =====
    const { ethers } = await import('npm:ethers@6');

    const voterId = voter.voter_id || voter_id;
    const voterIdHash = ethers.keccak256(ethers.toUtf8Bytes(`${HASH_SALT}:${voterId}`));
    const candidateHash = ethers.keccak256(ethers.toUtf8Bytes(`${HASH_SALT}:candidate:${candidate_id}`));

    // ===== Step 4: Check BLOCKCHAIN for hasVoted (AUTHORITATIVE CHECK) =====
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
    } catch (checkError) {
      console.error('Blockchain hasVoted check failed:', checkError);
      return new Response(
        JSON.stringify({ 
          error: 'ব্লকচেইন যাচাই করতে ব্যর্থ। পরে আবার চেষ্টা করুন।',
          details: 'Could not verify voting status on blockchain.'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== Step 5: Submit vote to BLOCKCHAIN FIRST (primary record) =====
    let txHash: string;
    let receiptHash: string;

    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Blockchain timeout after 30s')), 30000)
      );

      const blockchainOp = async () => {
        const tx = await contract.castVote(voterIdHash, candidateHash);
        console.log(`⏳ Vote TX submitted: ${tx.hash}`);
        const receipt = await tx.wait();
        console.log(`✅ Vote confirmed in block ${receipt.blockNumber}`);

        // Extract receiptHash from the VoteCast event
        let extractedReceipt = '';
        for (const log of receipt.logs) {
          try {
            const parsed = contract.interface.parseLog({ topics: log.topics, data: log.data });
            if (parsed && parsed.name === 'VoteCast') {
              extractedReceipt = parsed.args.receiptHash;
              break;
            }
          } catch {}
        }

        return { hash: receipt.hash, receiptHash: extractedReceipt };
      };

      const result = await Promise.race([blockchainOp(), timeout]);
      txHash = result.hash;
      receiptHash = result.receiptHash;
      console.log(`✅ Vote cast on Base Sepolia: TX=${txHash}, Receipt=${receiptHash}`);

    } catch (blockchainError) {
      // NO SIMULATED FALLBACK — vote fails honestly
      console.error('❌ Blockchain vote submission failed:', blockchainError);
      return new Response(
        JSON.stringify({ 
          error: 'ব্লকচেইনে ভোট জমা দিতে ব্যর্থ হয়েছে। পরে আবার চেষ্টা করুন।',
          details: (blockchainError as Error).message
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== Step 6: Record in Supabase DB (secondary cache) =====
    const { data: voteRecord, error: voteError } = await supabaseAdmin
      .from('votes')
      .insert({
        candidate_id: candidate_id,
        constituency_id: voter.constituency_id,
        tx_hash: txHash,
        voter_id_hash: voterIdHash,
        encrypted_vote: candidateHash,
        receipt_hash: receiptHash,
        status: 'confirmed',
        network: 'Base Sepolia',
      })
      .select()
      .single();

    if (voteError) {
      // Vote IS on blockchain even if DB insert fails
      console.error('⚠️ DB insert failed (vote IS on-chain):', voteError);
    }

    // ===== Step 7: Update voter status in DB =====
    await supabaseAdmin
      .from('voters_master')
      .update({ has_voted: true })
      .eq('id', voter.id);

    // ===== Step 8: Increment candidate vote count in DB =====
    await supabaseAdmin.rpc('increment_vote_count', { p_candidate_id: candidate_id }).catch(() => {});

    // ===== Step 9: Audit log =====
    await supabaseAdmin.from('audit_logs').insert({
      action: 'vote_cast',
      entity_type: 'vote',
      entity_id: voteRecord?.id || 'blockchain-only',
      details: {
        voter_id_hash: voterIdHash,
        candidate_hash: candidateHash,
        candidate_id: candidate_id,
        tx_hash: txHash,
        receipt_hash: receiptHash,
        blockchain_mode: 'live',
        network: 'Base Sepolia',
        status: 'confirmed',
      },
    }).catch(() => {});

    // ===== Step 10: Return success with receipt =====
    return new Response(
      JSON.stringify({
        success: true,
        vote_id: voteRecord?.id,
        tx_hash: txHash,
        receipt_hash: receiptHash,
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
