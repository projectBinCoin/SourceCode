import { create } from "zustand";
import { getSupabaseBrowser } from "@/lib/supabase";
import { fetchUserProfile } from "@/lib/supabase-data";
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

// Recovers auth users whose app_users profile was never created (e.g. a
// signup that failed after the auth user was committed) — rebuilds the
// profile from signup metadata instead of locking them out forever.
async function loadProfile(sb: NonNullable<ReturnType<typeof getSupabaseBrowser>>, sessionUser: { id: string; email?: string; user_metadata?: Record<string, unknown> }) {
  const profile = await fetchUserProfile(sessionUser.id);
  if (profile) return profile;
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
  return fetchUserProfile(sessionUser.id);
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  status: "loading",

  init: async () => {
    const sb = getSupabaseBrowser();
    if (!sb) {
      set({ user: null, status: "anon" });
      return;
    }
    // Clear storage left behind by the old demo-auth implementation.
    try {
      localStorage.removeItem("t2c-auth");
      localStorage.removeItem("t2c-data");
    } catch {
      // storage unavailable (private mode) — non-fatal
    }
    const { data } = await sb.auth.getSession();
    const sessionUser = data.session?.user;
    if (!sessionUser) {
      set({ user: null, status: "anon" });
      return;
    }
    const profile = await loadProfile(sb, sessionUser);
    if (!profile) {
      set({ user: null, status: "anon" });
      return;
    }
    set({ user: profile, status: "authed" });
  },

  refreshProfile: async () => {
    const sb = getSupabaseBrowser();
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    const sessionUser = data.session?.user;
    if (!sessionUser) {
      set({ user: null, status: "anon" });
      return;
    }
    const profile = await loadProfile(sb, sessionUser);
    if (profile) set({ user: profile, status: "authed" });
    else set({ user: null, status: "anon" });
  },

  signIn: async (email, password) => {
    const sb = getSupabaseBrowser();
    if (!sb) return "Supabase is not configured.";
    const { error } = await sb.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    await useAuthStore.getState().refreshProfile();
    return null;
  },

  signUp: async ({ name, email, password, role }) => {
    const sb = getSupabaseBrowser();
    if (!sb) return { error: "Supabase is not configured.", needsConfirmation: false };

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { name, role } },
    });
    if (error) return { error: error.message, needsConfirmation: false };
    const authUser = data.user;
    if (!authUser) return { error: "Signup failed — please try again.", needsConfirmation: false };

    const profile: User = {
      id: authUser.id,
      name,
      email,
      role,
      avatarUrl: avatarFor(name),
    };
    const { error: profileErr } = await sb
      .from("app_users")
      .upsert({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        avatar_url: profile.avatarUrl,
      });
    if (profileErr) return { error: profileErr.message, needsConfirmation: false };

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
    const sb = getSupabaseBrowser();
    await sb?.auth.signOut();
    set({ user: null, status: "anon" });
  },
}));
