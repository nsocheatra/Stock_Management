export const PERMISSIONS = {
  "pos.access": "Access POS",
  "products.manage": "Manage Products",
  "stock.manage": "Manage Stock & Inventory",
  "customers.manage": "Manage Customers",
  "suppliers.manage": "Manage Suppliers",
  "reports.view": "View Reports",
  "settings.manage": "Manage Settings",
  "users.manage": "Manage Users",
  "audit.manage": "Manage Stock Counts",
  "orders.manage": "Manage Orders",
  "debts.manage": "Manage Debts",
  "promotions.manage": "Manage Promotions",
  "delivery.manage": "Manage Deliveries",
  "membership.manage": "Manage Membership",
  "cashflow.manage": "Manage Cash Flow",
  "notifications.view": "View Notifications",
} as const;

export type Permission = keyof typeof PERMISSIONS;

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  admin: Object.keys(PERMISSIONS) as Permission[],
  stock_manager: ["products.manage", "stock.manage", "reports.view", "audit.manage", "customers.manage", "suppliers.manage", "orders.manage", "notifications.view"],
  cashier: ["pos.access", "customers.manage", "debts.manage"],
};

export function checkPermission(user: { role: string; permissions: string } | null, permission: Permission): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  try {
    const perms = JSON.parse(user.permissions || "[]") as string[];
    return perms.includes(permission);
  } catch {
    return false;
  }
}
