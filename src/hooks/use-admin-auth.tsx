import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  userId: string | null;
  userEmail: string | null;
}

const DEMO_MODE = true;

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: DEMO_MODE ? true : false,
    isLoading: false,
    isAuthenticated: DEMO_MODE ? true : false,
    userId: DEMO_MODE ? 'demo-admin' : null,
    userEmail: DEMO_MODE ? 'demo@admin.com' : null,
  });

  const checkAdminStatus = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setState({
          isAdmin: false,
          isLoading: false,
          isAuthenticated: false,
          userId: null,
          userEmail: null,
        });
        return;
      }

      // Check if user has admin role
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin role:', error);
        setState({
          isAdmin: false,
          isLoading: false,
          isAuthenticated: true,
          userId: user.id,
          userEmail: user.email || null,
        });
        return;
      }

      setState({
        isAdmin: !!roles,
        isLoading: false,
        isAuthenticated: true,
        userId: user.id,
        userEmail: user.email || null,
      });
    } catch (error) {
      console.error('Error in admin auth check:', error);
      setState({
        isAdmin: false,
        isLoading: false,
        isAuthenticated: false,
        userId: null,
        userEmail: null,
      });
    }
  }, []);

  useEffect(() => {
    if (DEMO_MODE) return; // Skip auth checks in demo mode

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    checkAdminStatus();

    return () => {
      subscription.unsubscribe();
    };
  }, [checkAdminStatus]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setState({
      isAdmin: false,
      isLoading: false,
      isAuthenticated: false,
      userId: null,
      userEmail: null,
    });
  }, []);

  return { ...state, signOut, refetch: checkAdminStatus };
}

// Hook for protecting admin routes
export function useRequireAdmin(redirectTo: string = '/admin/login') {
  const navigate = useNavigate();
  const { toast } = useToast();
  const auth = useAdminAuth();

  useEffect(() => {
    if (!auth.isLoading) {
      if (!auth.isAuthenticated) {
        navigate(redirectTo, { replace: true });
      } else if (!auth.isAdmin) {
        toast({
          title: 'অ্যাক্সেস অস্বীকার',
          description: 'আপনার অ্যাডমিন অ্যাক্সেস নেই।',
          variant: 'destructive',
        });
        supabase.auth.signOut();
        navigate(redirectTo, { replace: true });
      }
    }
  }, [auth.isLoading, auth.isAuthenticated, auth.isAdmin, navigate, redirectTo, toast]);

  return auth;
}
