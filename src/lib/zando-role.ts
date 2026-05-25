export const ZANDO_ROLE_STORAGE_KEY = "zando_role";
export const ZANDO_ROLES = ["supplier", "shop", "driver", "admin"] as const;

export type ZandoRole = (typeof ZANDO_ROLES)[number];

export const DEFAULT_ZANDO_ROLE: ZandoRole = "supplier";

export const ZANDO_ROLE_LABELS: Record<ZandoRole, string> = {
  supplier: "Supplier / Grossiste",
  shop: "Shop / Boutique",
  driver: "Driver",
  admin: "Admin",
};

export function isZandoRole(value: string | null | undefined): value is ZandoRole {
  return ZANDO_ROLES.includes(value as ZandoRole);
}

export function getZandoRoleRedirectPath(role: ZandoRole): string {
  if (role === "shop") return "/mobile-shop-dashboard";
  if (role === "driver") return "/mobile-deliveries";
  return "/mobile-dashboard";
}

export function getStoredZandoRole(): ZandoRole {
  if (typeof window === "undefined") return DEFAULT_ZANDO_ROLE;

  try {
    const storedRole = window.localStorage.getItem(ZANDO_ROLE_STORAGE_KEY);
    return isZandoRole(storedRole) ? storedRole : DEFAULT_ZANDO_ROLE;
  } catch {
    return DEFAULT_ZANDO_ROLE;
  }
}

export function saveZandoRole(role: ZandoRole): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(ZANDO_ROLE_STORAGE_KEY, role);
  } catch {
    // Local role selection is best-effort during the MVP.
  }
}
