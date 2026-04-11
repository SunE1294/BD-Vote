import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface Constituency {
  id: string;
  name: string;
  code: string;
  district: string;
  division: string;
  created_at: string;
}

export function useConstituencies() {
  return useQuery({
    queryKey: ['constituencies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('constituencies')
        .select('*')
        .order('code');
      if (error) throw error;
      return (data || []) as unknown as Constituency[];
    },
  });
}

export function useAddConstituency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (c: Omit<Constituency, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('constituencies')
        .insert(c)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['constituencies'] }),
  });
}

export function useDeleteConstituency() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('constituencies')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['constituencies'] }),
  });
}
