"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/auth-store";
import { getDashboardRoute } from "@/lib/access";
import { BrandLogo } from "@/components/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { User, Truck, ShieldCheck, Sparkles, Mail, Lock, Loader2, Info } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const { status, user, signIn, signUp } = useAuthStore();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"citizen" | "collector">("citizen");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status === "authed" && user) {
      router.replace(getDashboardRoute(user));
    }
  }, [status, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setBusy(true);
    if (mode === "signin") {
      const err = await signIn(email.trim(), password);
      setBusy(false);
      if (err) setError(err);
    } else {
      const res = await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
      });
      setBusy(false);
      if (res.error) {
        setError(res.error);
      } else if (res.needsConfirmation) {
        setNotice("Account created! Check your email to confirm your address, then sign in.");
      }
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-navy-gradient p-3 sm:p-4">
      {/* Animated background orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#0099FF]/15 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, 30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-[#0055A4]/15 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, -20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute left-1/2 top-1/3 h-64 w-64 rounded-full bg-[#0066C5]/10 blur-3xl"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Logo & title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-6 flex flex-col items-center gap-3"
      >
        <BrandLogo className="float h-20 w-20 rounded-2xl shadow-2xl sm:h-24 sm:w-24" />
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Bincoin
          </h1>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-sm font-medium text-[#0099FF]">
            <Sparkles className="h-3.5 w-3.5" />
            Smart Waste Management System
          </p>
        </div>
      </motion.div>

      {/* Auth card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-md rounded-2xl border border-[#0099FF]/15 bg-card/80 p-5 shadow-lg backdrop-blur-md sm:p-6"
      >
        {/* Mode tabs */}
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setNotice(null);
              }}
              className={cn(
                "rounded-lg py-2 text-sm font-medium transition-all",
                mode === m ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Husni Mohamad"
                autoComplete="name"
              />
            </div>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <PasswordInput
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "At least 6 characters" : "Your password"}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                className="pl-9"
              />
            </div>
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label>I am joining as</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("citizen")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all",
                    role === "citizen"
                      ? "border-[#0099FF] bg-[#0099FF]/5 shadow-sm"
                      : "border-muted hover:border-[#0099FF]/40"
                  )}
                >
                  <User className={cn("h-5 w-5", role === "citizen" ? "text-[#0099FF]" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-medium">Citizen</p>
                    <p className="text-xs text-muted-foreground">Household user</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setRole("collector")}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border-2 p-3 text-left transition-all",
                    role === "collector"
                      ? "border-[#0099FF] bg-[#0099FF]/5 shadow-sm"
                      : "border-muted hover:border-[#0099FF]/40"
                  )}
                >
                  <Truck className={cn("h-5 w-5", role === "collector" ? "text-[#0099FF]" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-medium">Collector</p>
                    <p className="text-xs text-muted-foreground">Needs approval</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {mode === "signin" && (
            <div className="text-right">
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-[#0099FF] hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-2.5 text-sm text-destructive">
              {error}
            </p>
          )}
          {notice && (
            <p className="flex items-start gap-2 rounded-lg border border-[#0099FF]/30 bg-[#0099FF]/10 p-2.5 text-sm text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#0099FF]" />
              {notice}
            </p>
          )}

          <Button type="submit" disabled={busy} className="w-full gap-2 glow-primary" size="lg">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? <ShieldCheck className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
            {busy ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          {mode === "signin"
            ? "New to Bincoin? Switch to Create Account above."
            : "Collector accounts become active once an admin approves them."}
        </p>
      </motion.div>
    </div>
  );
}
