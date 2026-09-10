import {
  LayoutDashboard, Store, GitBranch, Tags, Package, Boxes, Users, UserCog,
  ScrollText, Undo2, Clock, ShoppingCart, Ticket, BarChart3
} from 'lucide-react';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['ROLE_ADMIN', 'ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER', 'ROLE_BRANCH_CASHIER'] },
  { to: '/pos', label: 'POS terminal', icon: ShoppingCart, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER', 'ROLE_BRANCH_CASHIER'] },
  { to: '/stores', label: 'Stores', icon: Store, roles: ['ROLE_ADMIN', 'ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER'] },
  { to: '/branches', label: 'Branches', icon: GitBranch, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER'] },
  { to: '/categories', label: 'Categories', icon: Tags, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER'] },
  { to: '/products', label: 'Products', icon: Package, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER'] },
  { to: '/inventory', label: 'Inventory', icon: Boxes, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER'] },
  { to: '/orders', label: 'Orders', icon: ScrollText, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER', 'ROLE_BRANCH_CASHIER'] },
  { to: '/refunds', label: 'Refunds', icon: Undo2, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER', 'ROLE_BRANCH_CASHIER'] },
  { to: '/shifts', label: 'Shift reports', icon: Clock, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER', 'ROLE_BRANCH_CASHIER'] },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER'] },
  { to: '/customers', label: 'Customers', icon: Users, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER', 'ROLE_BRANCH_CASHIER'] },
  { to: '/employees', label: 'Employees', icon: UserCog, roles: ['ROLE_STORE_ADMIN', 'ROLE_STORE_MANAGER', 'ROLE_BRANCH_MANAGER'] },

  { to: '/coupons', label: 'Coupons', icon: Ticket, roles: ['ROLE_STORE_ADMIN'] },
];
export function navForRole(role) {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
