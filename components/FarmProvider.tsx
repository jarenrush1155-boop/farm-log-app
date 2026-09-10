'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { createClient } from '../lib/supabase/client';

export type Farm = {
  id: string;
  name: string;
};

type FarmContextValue = {
  farms: Farm[];
  activeFarmId: string | null;
  activeFarm: Farm | null;
  loading: boolean;
  setActiveFarmId: (id: string) => void;
  refreshFarms: () => Promise<void>;
  userEmail: string | null;
  signOut: () => Promise<void>;
};

const STORAGE_KEY = 'farm-log-active-farm-id';

const FarmContext = createContext<FarmContextValue | null>(null);

export function useFarm(): FarmContextValue {
  const ctx = useContext(FarmContext);
  if (!ctx) {
    throw new Error('useFarm must be used within FarmProvider');
  }
  return ctx;
}

/** Safe optional hook for routes that may render outside FarmProvider (should not happen). */
export function useFarmOptional(): FarmContextValue | null {
  return useContext(FarmContext);
}

export default function FarmProvider({ children }: { children: ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [activeFarmId, setActiveFarmIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const refreshFarms = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setUserEmail(user?.email ?? null);

      if (!user) {
        setFarms([]);
        setActiveFarmIdState(null);
        return;
      }

      const { data: memberships, error } = await supabase
        .from('farm_members')
        .select('farm_id, farms ( id, name )')
        .eq('user_id', user.id);

      if (error) {
        console.error('Failed to load farm memberships:', error.message);
        setFarms([]);
        return;
      }

      const nextFarms: Farm[] = (memberships ?? [])
        .map((row: { farms: Farm | Farm[] | null }) => {
          const f = row.farms;
          if (!f) return null;
          return Array.isArray(f) ? f[0] : f;
        })
        .filter((f): f is Farm => Boolean(f?.id && f?.name));

      setFarms(nextFarms);

      const stored =
        typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
      const preferred =
        (stored && nextFarms.some((f) => f.id === stored) && stored) ||
        nextFarms[0]?.id ||
        null;
      setActiveFarmIdState(preferred);
      if (preferred && typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, preferred);
      }
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    refreshFarms();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      refreshFarms();
    });

    return () => subscription.unsubscribe();
  }, [supabase, refreshFarms]);

  const setActiveFarmId = useCallback((id: string) => {
    setActiveFarmIdState(id);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setFarms([]);
    setActiveFarmIdState(null);
    setUserEmail(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, [supabase]);

  const activeFarm = farms.find((f) => f.id === activeFarmId) ?? null;

  const value = useMemo<FarmContextValue>(
    () => ({
      farms,
      activeFarmId,
      activeFarm,
      loading,
      setActiveFarmId,
      refreshFarms,
      userEmail,
      signOut,
    }),
    [farms, activeFarmId, activeFarm, loading, setActiveFarmId, refreshFarms, userEmail, signOut]
  );

  return <FarmContext.Provider value={value}>{children}</FarmContext.Provider>;
}
