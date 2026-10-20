import type { User, Role, Collector } from "@/types";

type AuthenticatedUser = User & { collectorProfile?: Collector };

export function hasRole(user: AuthenticatedUser | null, role: Role): boolean {
  return user?.role === role;
}

export function isPendingCollector(user: AuthenticatedUser | null): boolean {
  return user?.role === "collector" && user.collectorProfile?.status === "pending";
}

/** The safest dashboard route for a user, given their role and approval status. */
export function getDashboardRoute(user: AuthenticatedUser | null): string {
  if (!user) return "/login";
  if (user.role === "collector" && user.collectorProfile?.status === "pending") {
    return "/collector/pending-approval";
  }
  return `/${user.role}/dashboard`;
}

