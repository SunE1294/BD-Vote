import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface VoterStats {
  total: number;
  verified: number;
  pending: number;
  voted: number;
}

async function fetchVoterStats(): Promise<VoterStats> {
  const [totalRes, verifiedRes, pendingRes, votedRes] = await Promise.all([
    supabase.from('voters_master').select('*', { count: 'exact', head: true }),
    supabase.from('voters_master').select('*', { count: 'exact', head: true }).eq('is_verified', true),
    supabase.from('voters_master').select('*', { count: 'exact', head: true }).eq('is_verified', false),
    supabase.from('voters_master').select('*', { count: 'exact', head: true }).eq('has_voted', true),
  ]);

  return {
    total: totalRes.count || 0,
    verified: verifiedRes.count || 0,
    pending: pendingRes.count || 0,
    voted: votedRes.count || 0,
  };
}

export function useVoterStats() {
  return useQuery({
    queryKey: ['voter-stats'],
    queryFn: fetchVoterStats,
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
}

interface Voter {
  id: string;
  voter_id: string;
  full_name: string;
  is_verified: boolean | null;
  has_voted: boolean | null;
  photo_url?: string | null;
  updated_at?: string | null;
  created_at: string;
}

async function fetchVoters(): Promise<Voter[]> {
  const { data, error } = await supabase
    .from('voters_master')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as Voter[];
}

export function useVoters() {
  return useQuery({
    queryKey: ['voters'],
    queryFn: fetchVoters,
    staleTime: 30 * 1000,
  });
}

interface RecentVoter {
  id: string;
  voter_id: string;
  full_name: string;
  is_verified: boolean | null;
  created_at: string;
}

async function fetchRecentVoters(limit: number): Promise<RecentVoter[]> {
  const { data, error } = await supabase
    .from('voters_master')
    .select('id, voter_id, full_name, is_verified, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data || []) as RecentVoter[];
}

export function useRecentVoters(limit: number = 5) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('voters_master-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'voters_master' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['recent-voters'] });
          queryClient.invalidateQueries({ queryKey: ['voter-stats'] });
          queryClient.invalidateQueries({ queryKey: ['voters'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['recent-voters', limit],
    queryFn: () => fetchRecentVoters(limit),
    staleTime: 30 * 1000,
  });
}
