"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Mail, Loader2, Info, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError("Please enter your account email.");
      return;
    }
    setBusy(true);
    const sb = getSupabaseBrowser();
    if (!sb) {
      setBusy(false);
      setError("Supabase is not configured.");
      return;
    }
    const { error: err } = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (err) setError(err.message);
    else setSent(true);
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
          <div>
            <h1 className="text-xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your account email and we&apos;ll send you a reset link.
            </p>
          </div>
        </div>

        {sent ? (
          <div className="space-y-4">
            <p className="flex items-start gap-2 rounded-lg border border-[#0099FF]/30 bg-[#0099FF]/10 p-3 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0099FF]" />
              Reset link sent to <span className="font-medium">{email}</span>. Check your inbox
              (and spam folder) — the link opens the password reset page.
            </p>
            <Link href="/login" className="block">
              <Button variant="outline" className="w-full gap-2">
                <ArrowLeft className="h-4 w-4" /> Back to Sign In
              </Button>
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
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
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              {busy ? "Sending…" : "Send Reset Link"}
            </Button>

            <Link href="/login" className="block text-center text-sm text-muted-foreground hover:text-foreground">
              <span className="inline-flex items-center gap-1">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </span>
            </Link>
          </form>
        )}
      </motion.div>
    </div>
  );
}
