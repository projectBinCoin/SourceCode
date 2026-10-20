import type { User, Collector } from "@/types";
import type { Href } from "expo-router";

type AuthenticatedUser = User & { collectorProfile?: Collector };

/** The safest dashboard route for a user, given their role and approval status. */
export function getDashboardRoute(user: AuthenticatedUser | null): Href {
  if (!user) return "/login";
  if (user.role === "collector" && user.collectorProfile?.status === "pending") {
    return "/collector/pending-approval";
  }
  return `/${user.role}/dashboard` as Href;
}

