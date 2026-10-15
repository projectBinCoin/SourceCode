import type { User, Role, Collector } from "@/types";

type AuthenticatedUser = User & { collectorProfile?: Collector };

type Permission =
  | "citizen:dashboard"
  | "citizen:bookPickup"
  | "citizen:registerBin"
  | "citizen:wallet"
  | "citizen:requestStatus"
  | "collector:dashboard"
  | "collector:history"
  | "collector:activeJob"
  | "collector:claim"
  | "admin:dashboard"
  | "admin:collectors"
  | "admin:auditLog"
  | "admin:bins"
  | "admin:settings";

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  citizen: [
    "citizen:dashboard",
    "citizen:bookPickup",
    "citizen:registerBin",
    "citizen:wallet",
    "citizen:requestStatus",
  ],
  collector: [
    "collector:dashboard",
    "collector:history",
    "collector:activeJob",
    "collector:claim",
  ],
  admin: [
    "admin:dashboard",
    "admin:collectors",
    "admin:auditLog",
    "admin:bins",
    "admin:settings",
  ],
};

export function hasRole(user: AuthenticatedUser | null, role: Role): boolean {
  return user?.role === role;
}

export function isApprovedCollector(user: AuthenticatedUser | null): boolean {
  return user?.role === "collector" && user.collectorProfile?.status === "approved";
}

export function isPendingCollector(user: AuthenticatedUser | null): boolean {
  return user?.role === "collector" && user.collectorProfile?.status === "pending";
}

export function hasPermission(user: AuthenticatedUser | null, permission: Permission): boolean {
  if (!user) return false;

  // Approved collectors have all collector permissions
  if (user.role === "collector" && user.collectorProfile?.status !== "approved") {
    return false;
  }

  return ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false;
}

export function canAccessRoute(user: AuthenticatedUser | null, routePrefix: string): boolean {
  if (!user) return false;

  const role = user.role;
  if (routePrefix.startsWith(`/${role}`)) {
    if (role === "collector" && user.collectorProfile?.status === "pending") {
      return routePrefix === "/collector/pending-approval";
    }
    return true;
  }
  return false;
}

/** The safest dashboard route for a user, given their role and approval status. */
export function getDashboardRoute(user: AuthenticatedUser | null): string {
  if (!user) return "/login";
  if (user.role === "collector" && user.collectorProfile?.status === "pending") {
    return "/collector/pending-approval";
  }
  return `/${user.role}/dashboard`;
}

export { type Permission };
