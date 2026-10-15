"use client";

import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/auth-store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, CheckCircle2, Truck, RefreshCw, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PendingApprovalPage() {
  const user = useAuthStore((s) => s.user);
  const refreshProfile = useAuthStore((s) => s.refreshProfile);
  const signOut = useAuthStore((s) => s.signOut);
  const router = useRouter();

  const handleLogout = async () => {
    await signOut();
    router.push("/login");
  };

  return (
    <div className="bg-brand-radial flex min-h-[80vh] items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Card className="w-full border-[#0099FF]/20">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#003B73] to-[#0055A4] shadow-lg"
            >
              <Clock className="h-8 w-8 text-white" />
            </motion.div>
            <CardTitle className="text-xl">Account Pending Admin Approval</CardTitle>
            <CardDescription>
              Welcome, {user?.name}! Your collector account is currently awaiting approval from the system administrator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-[#0099FF]/10 bg-gradient-to-br from-[#003B73]/5 to-[#0099FF]/5 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-[#0099FF]" />
                <span>Registration complete</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Awaiting admin review</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4" />
                <span>Ready to collect once approved</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => void refreshProfile()} className="gap-2" variant="outline">
                <RefreshCw className="h-4 w-4" /> Refresh Status
              </Button>
              <Button onClick={() => void handleLogout()} className="gap-2" variant="ghost">
                <LogOut className="h-4 w-4" /> Logout
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
