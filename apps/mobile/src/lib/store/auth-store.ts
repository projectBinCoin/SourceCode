import { create } from "zustand";
import { getSupabase } from "@/lib/supabase";
import { fetchUserProfile, fetchUserProfileByEmail } from "@/lib/supabase-data";
import { generateId } from "@/lib/points";
import type { Collector, User } from "@/types";

type AuthUser = User & { collectorProfile?: Collector };

interface AuthState {
  user: AuthUser | null;
  /** "loading" until the initial session check completes. */
  status: "loading" | "authed" | "anon";
  init: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    role: "citizen" | "collector";
  }) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
}

function avatarFor(name: string): string {
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;
}

/** Bound any auth/network call so a hung request can never wedge the app. */
function withTimeout<T>(p: Promise<T>, ms = 10000): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

let refreshInFlight: Promise<void> | null = null;

// Recovers auth users whose app_users profile was never created (e.g. a
// signup that failed after the auth user was committed) — rebuilds the
// profile from signup metadata instead of signing them out forever.
async function loadProfile(sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const sb = getSupabase();
  if (!sb) return null;
  const profile = await withTimeout(fetchUserProfile(sessionUser.id));
  if (profile) return profile;
  // A row can exist under a legacy client-generated id — adopt it by email
  // rather than inserting a duplicate (unique(email) → 409 spam).
  if (sessionUser.email) {
    const byEmail = await withTimeout(fetchUserProfileByEmail(sessionUser.email));
    if (byEmail) return byEmail;
  }
  const meta = sessionUser.user_metadata ?? {};
  const email = sessionUser.email ?? "";
  const name = (meta.name as string) ?? (email.split("@")[0] || "User");
  const role = meta.role === "collector" ? "collector" : "citizen";
  await sb.from("app_users").upsert({ id: sessionUser.id, name, email, role, avatar_url: avatarFor(name) });
  if (role === "collector") {
    await sb.from("collectors").upsert({
      id: generateId("col"), user_id: sessionUser.id, name, email, status: "pending",
      total_jobs: 0, penalty_count: 0, joined_at: new Date().toISOString(), avatar_url: avatarFor(name),
      lat: 6.9271, lng: 79.8612,
    });
  }
  return withTimeout(fetchUserProfile(sessionUser.id));
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "loading",

  init: async () => {
    const sb = getSupabase();
    if (!sb) {
      set({ user: null, status: "anon" });
      return;
    }
    try {
      const { data } = await withTimeout(sb.auth.getSession());
      const sessionUser = data.session?.user;
      if (!sessionUser) {
        set({ user: null, status: "anon" });
        return;
      }
      const profile = await withTimeout(loadProfile(sessionUser));
      if (!profile) {
        set({ user: null, status: "anon" });
        return;
      }
      set({ user: profile, status: "authed" });
    } catch {
      set({ user: null, status: "anon" });
    }
  },

  refreshProfile: () => {
    // Dedupe concurrent calls — onAuthStateChange and signIn can both trigger
    // this, and parallel getSession() calls deadlock the auth lock on RN.
    if (refreshInFlight) return refreshInFlight;
    refreshInFlight = (async () => {
      const sb = getSupabase();
      if (!sb) return;
      try {
        const { data } = await withTimeout(sb.auth.getSession());
        const sessionUser = data.session?.user;
        if (!sessionUser) {
          set({ user: null, status: "anon" });
          return;
        }
        const profile = await withTimeout(loadProfile(sessionUser));
        if (profile) set({ user: profile, status: "authed" });
        else set({ user: null, status: "anon" });
      } catch {
        set({ user: null, status: "anon" });
      }
    })().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  },

  signIn: async (email, password) => {
    const sb = getSupabase();
    if (!sb) return "Supabase is not configured.";
    try {
      const { error } = await withTimeout(sb.auth.signInWithPassword({ email, password }), 15000);
      if (error) return error.message;
    } catch {
      return "Sign in timed out — check your connection and try again.";
    }
    await useAuthStore.getState().refreshProfile();
    return null;
  },

  signUp: async ({ name, email, password, role }) => {
    const sb = getSupabase();
    if (!sb) return { error: "Supabase is not configured.", needsConfirmation: false };

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    const authUser = data.user;
    if (!authUser) return { error: "Signup failed — please try again.", needsConfirmation: false };

    const profile: User = { id: authUser.id, name, email, role, avatarUrl: avatarFor(name) };
    const { error: profileErr } = await sb.from("app_users").upsert({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      avatar_url: profile.avatarUrl,
    });
    if (profileErr) {
      // 409 = unique(email) — this address already has a profile.
      const existing = await fetchUserProfileByEmail(email);
      if (existing)
        return { error: "This email is already registered — sign in instead.", needsConfirmation: false };
      return { error: profileErr.message, needsConfirmation: false };
    }

    if (role === "collector") {
      const collector: Collector = {
        id: generateId("col"),
        userId: authUser.id,
        name,
        email,
        status: "pending",
        totalJobs: 0,
        penaltyCount: 0,
        joinedAt: new Date().toISOString(),
        avatarUrl: avatarFor(name),
        lat: 6.9271,
        lng: 79.8612,
      };
      const { error: collectorErr } = await sb.from("collectors").upsert({
        id: collector.id,
        user_id: collector.userId,
        name: collector.name,
        email: collector.email,
        status: collector.status,
        total_jobs: collector.totalJobs,
        penalty_count: collector.penaltyCount,
        joined_at: collector.joinedAt,
        avatar_url: collector.avatarUrl,
        lat: collector.lat,
        lng: collector.lng,
      });
      if (collectorErr) return { error: collectorErr.message, needsConfirmation: false };
    }

    await useAuthStore.getState().refreshProfile();
    return { error: null, needsConfirmation: !data.session };
  },

  signOut: async () => {
    const sb = getSupabase();
    try {
      if (sb) await withTimeout(sb.auth.signOut(), 5000);
    } catch {
      // Local sign-out still proceeds even if the network call hangs.
    }
    set({ user: null, status: "anon" });
  },
}));
