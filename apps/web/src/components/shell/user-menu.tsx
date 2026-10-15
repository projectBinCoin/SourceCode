"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store/auth-store";
import { getSupabaseBrowser } from "@/lib/supabase";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { LogOut, ChevronDown, RefreshCw, KeyRound, Loader2 } from "lucide-react";

const roleLabels: Record<string, string> = {
  citizen: "Citizen",
  collector: "Collector",
  admin: "Admin",
};

export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const signOut = useAuthStore((s) => s.signOut);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const router = useRouter();

  const [showChangePw, setShowChangePw] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  const handleChangePassword = async () => {
    setPwError(null);
    if (password.length < 6) {
      setPwError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwBusy(true);
    const sb = getSupabaseBrowser();
    const { error } = sb ? await sb.auth.updateUser({ password }) : { error: { message: "Supabase is not configured." } };
    setPwBusy(false);
    if (error) {
      setPwError(error.message);
      return;
    }
    setShowChangePw(false);
    setPassword("");
    setConfirm("");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#0099FF]/20 bg-[#0099FF]/5 px-2.5 text-sm font-medium text-foreground transition-colors hover:border-[#0099FF]/40 hover:bg-[#0099FF]/10 sm:px-3 sm:gap-2"
        >
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.avatarUrl} alt={user.name} />
            <AvatarFallback>{user.name[0]}</AvatarFallback>
          </Avatar>
          <span className="hidden max-w-[120px] truncate sm:inline">{user.name}</span>
          <ChevronDown className="h-3 w-3" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuGroup>
            <DropdownMenuLabel className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatarUrl} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-medium">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.email}</span>
              </div>
            </DropdownMenuLabel>
            <div className="px-1.5 pb-1 text-xs text-muted-foreground">
              Role: {roleLabels[user.role] ?? user.role}
              {user.collectorProfile && ` (${user.collectorProfile.status})`}
            </div>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setShowChangePw(true)}>
              <KeyRound className="h-4 w-4" /> Change password
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void refreshProfile()}>
              <RefreshCw className="h-4 w-4" /> Refresh profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleLogout()} className="text-destructive">
              <LogOut className="h-4 w-4" /> Logout
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog
        open={showChangePw}
        onOpenChange={(open) => {
          setShowChangePw(open);
          if (!open) {
            setPwError(null);
            setPassword("");
            setConfirm("");
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Set a new password for {user.email}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <PasswordInput
                id="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <PasswordInput
                id="confirm-password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat the new password"
                autoComplete="new-password"
              />
            </div>
            {pwError && <p className="text-sm text-destructive">{pwError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePw(false)}>Cancel</Button>
            <Button onClick={() => void handleChangePassword()} disabled={pwBusy} className="gap-2">
              {pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              {pwBusy ? "Updating…" : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
