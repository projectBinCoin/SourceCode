"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/auth-store";
import { getSupabaseBrowser } from "@/lib/supabase";
import { getDashboardRoute } from "@/lib/access";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const { status, user } = useAuthStore();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // The recovery link lands here with a token; supabase-js detects it in the
  // URL and signs the user in with a recovery session (status flips to authed).
  useEffect(() => {
    if (status === "authed" && done) {
      const t = setTimeout(() => router.replace(user ? getDashboardRoute(user) : "/login"), 1500);
      return () => clearTimeout(t);
    }
  }, [status, user, done, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const sb = getSupabaseBrowser();
    if (!sb) {
      setBusy(false);
      setError("Supabase is not configured.");
      return;
    }
    const { error: err } = await sb.auth.updateUser({ password });
    setBusy(false);
    if (err) setError(err.message);
    else setDone(true);
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy-gradient p-3 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md rounded-2xl border border-[#0099FF]/15 bg-card/80 p-5 shadow-lg backdrop-blur-md sm:p-6"
      >
        <div className="mb-5 flex flex-col items-center gap-3 text-center">
          <BrandLogo className="h-14 w-14 rounded-xl shadow-lg" />
          <h1 className="text-xl font-bold">Set a new password</h1>
        </div>

        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-8 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Verifying reset link…</p>
          </div>
        )}

        {status === "anon" && (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              This reset link is invalid or has expired. Request a new one.
            </p>
            <Link href="/forgot-password" className="block">
              <Button className="w-full">Request New Link</Button>
            </Link>
            <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </span>
            </Link>
          </div>
        )}

        {status === "authed" && !done && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <PasswordInput
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  autoComplete="new-password"
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <PasswordInput
                  id="confirm"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat the new password"
                  autoComplete="new-password"
                  className="pl-9"
                />
              </div>
            </div>

            {error && (
              <p className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            )}

            <Button type="submit" disabled={busy} className="w-full gap-2 glow-primary" size="lg">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {busy ? "Updating…" : "Update Password"}
            </Button>
          </form>
        )}

        {status === "authed" && done && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
              <CheckCircle2 className="h-6 w-6 text-white" />
            </div>
            <p className="text-sm text-muted-foreground">
              Password updated! Redirecting you to your dashboard…
            </p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
