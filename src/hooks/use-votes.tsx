import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CastVoteResult {
  success: boolean;
  vote_id?: string;
  tx_hash?: string;
  receipt_hash?: string;
  voter_id_hash?: string;
  status?: string;
  blockchain_mode?: string;
  network?: string;
  message?: string;
  error?: string;
}

interface VoteTransaction {
  id: string;
  tx_hash: string | null;
  voter_id_hash: string | null;
  receipt_hash?: string | null;
  status: string;
  created_at: string;
  candidate_id: string;
  network?: string | null;
  encrypted_vote?: string | null;
}

export function useVotes() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<CastVoteResult | null>(null);
  const { toast } = useToast();

  /**
   * Cast a vote via edge function — Blockchain-First Architecture
   *
   * Flow: Edge function verifies the HMAC token (proof of face-verification),
   *       submits to blockchain, waits for confirmation, then caches in DB.
   * No simulated fallback — if blockchain fails, vote fails honestly.
   *
   * @param verificationToken  Short-lived HMAC token from confirm-verification edge fn
   * @param candidateId        Candidate UUID
   */
  const castVote = async (verificationToken: string, candidateId: string): Promise<CastVoteResult> => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('cast-vote', {
        body: { verification_token: verificationToken, candidate_id: candidateId },
      });

      if (error) {
        // Supabase wraps non-2xx edge function responses — read actual body from error.context
        let errorMessage = error.message || 'ভোট দিতে ব্যর্থ হয়েছে';
        if (error.context) {
          try {
            const body = await (error.context as Response).json();
            if (body?.error) errorMessage = body.error;
            if (body?.details) errorMessage += ': ' + body.details;
          } catch {}
        }
        const result: CastVoteResult = { success: false, error: errorMessage };
        setLastResult(result);
        toast({ title: 'ভোট ব্যর্থ', description: errorMessage, variant: 'destructive' });
        return result;
      }

      if (data?.error) {
        const result: CastVoteResult = {
          success: false,
          error: data.error,
        };
        setLastResult(result);
        toast({
          title: 'ভোট ব্যর্থ',
          description: data.error,
          variant: 'destructive',
        });
        return result;
      }

      const result: CastVoteResult = {
        success: true,
        vote_id: data.vote_id,
        tx_hash: data.tx_hash,
        receipt_hash: data.receipt_hash,
        voter_id_hash: data.voter_id_hash,
        status: data.status,
        blockchain_mode: data.blockchain_mode,
        network: data.network,
        message: data.message,
      };
      setLastResult(result);
      return result;
    } catch (err) {
      const result: CastVoteResult = {
        success: false,
        error: 'নেটওয়ার্ক ত্রুটি। আবার চেষ্টা করুন।',
      };
      setLastResult(result);
      return result;
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Fetch recent blockchain transactions (for Results page)
   */
  const fetchRecentTransactions = async (limit = 10): Promise<VoteTransaction[]> => {
    const { data, error } = await supabase
      .from('votes')
      .select('id, tx_hash, voter_id_hash, status, created_at, candidate_id, encrypted_vote')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to fetch transactions:', error);
      return [];
    }

    return (data || []) as VoteTransaction[];
  };

  /**
   * Get vote statistics for results display
   */
  const fetchVoteStats = async () => {
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, full_name, party, vote_count, photo_url')
      .eq('is_active', true)
      .order('vote_count', { ascending: false });

    if (error) {
      console.error('Failed to fetch vote stats:', error);
      return { candidates: [], totalVotes: 0 };
    }

    const totalVotes = (candidates || []).reduce((sum, c) => sum + (c.vote_count || 0), 0);

    return {
      candidates: candidates || [],
      totalVotes,
    };
  };

  return {
    castVote,
    isSubmitting,
    lastResult,
    fetchRecentTransactions,
    fetchVoteStats,
  };
}
