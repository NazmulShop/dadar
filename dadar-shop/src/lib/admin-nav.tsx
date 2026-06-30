import {
  LayoutDashboard, Users, UserCog, ShieldBan, Heart, UserSquare2,
  Store, Package, ShoppingCart, CreditCard, Truck, Megaphone,
  Star, BarChart3, LifeBuoy, FileText, Bell, Zap, Settings,
  ShieldCheck, ScrollText, Plug, DatabaseBackup, type LucideIcon,
} from "lucide-react";

export type NavChild = { title: string; to: string };
export type NavSection = {
  title: string;
  icon: LucideIcon;
  to?: string;
  children?: NavChild[];
};

export const ADMIN_NAV: NavSection[] = [
  { title: "Dashboard", icon: LayoutDashboard, to: "/admin" },
  {
    title: "Users", icon: Users, children: [
      { title: "All Users", to: "/admin/users" },
      { title: "Banned Users", to: "/admin/users/banned" },
      { title: "User Roles", to: "/admin/users/roles" },
    ],
  },
  {
    title: "Customers", icon: UserSquare2, children: [
      { title: "Customer List", to: "/admin/customers" },
      { title: "Customer Segments", to: "/admin/segments" },
      { title: "Wishlist Analytics", to: "/admin/wishlist-analytics" },
      { title: "Loyalty Program", to: "/admin/loyalty" },
      { title: "Subscriptions", to: "/admin/subscriptions" },
      { title: "Abandoned Carts", to: "/admin/abandoned-carts" },
    ],
  },
  {
    title: "Vendors", icon: Store, children: [
      { title: "All Sellers", to: "/admin/sellers" },
      { title: "Pending Approval", to: "/admin/vendors/pending" },
      { title: "Vendor Performance", to: "/admin/vendors/performance" },
      { title: "Payouts", to: "/admin/payouts" },
      { title: "Commissions", to: "/admin/commissions" },
    ],
  },
  {
    title: "Products", icon: Package, children: [
      { title: "All Products", to: "/admin/products" },
      { title: "Add Product", to: "/admin/products/add" },
      { title: "Categories", to: "/admin/products/categories" },
      { title: "Subcategories", to: "/admin/products/subcategories" },
      { title: "Brands", to: "/admin/products/brands" },
      { title: "Attributes", to: "/admin/products/attributes" },
      { title: "Inventory", to: "/admin/products/inventory" },
    ],
  },
  {
    title: "Orders", icon: ShoppingCart, children: [
      { title: "All Orders", to: "/admin/orders" },
      { title: "Pending", to: "/admin/orders/pending" },
      { title: "Processing", to: "/admin/orders/processing" },
      { title: "Shipped", to: "/admin/orders/shipped" },
      { title: "Delivered", to: "/admin/orders/delivered" },
      { title: "Cancelled", to: "/admin/orders/cancelled" },
      { title: "Returns & Refunds", to: "/admin/orders/returns" },
    ],
  },
  {
    title: "Payments", icon: CreditCard, children: [
      { title: "Transactions", to: "/admin/transactions" },
      { title: "Payment Methods", to: "/admin/payment-methods" },
      { title: "Refund Requests", to: "/admin/refunds" },
      { title: "Gift Cards", to: "/admin/gift-cards" },
    ],
  },
  {
    title: "Shipping", icon: Truck, children: [
      { title: "Shipping Zones", to: "/admin/shipping-zones" },
      { title: "Delivery Charges", to: "/admin/shipping/charges" },
      { title: "Courier Integration", to: "/admin/shipping/courier" },
    ],
  },
  {
    title: "Marketing", icon: Megaphone, children: [
      { title: "Coupons", to: "/admin/coupons" },
      { title: "Campaigns", to: "/admin/campaigns" },
      { title: "Flash Sales", to: "/admin/flash-sales" },
      { title: "Banners", to: "/admin/banners" },
      { title: "Promotions", to: "/admin/marketing/promotions" },
    ],
  },
  {
    title: "Reviews", icon: Star, children: [
      { title: "Product Reviews", to: "/admin/reviews" },
      { title: "Review Moderation", to: "/admin/reviews/moderation" },
    ],
  },
  {
    title: "Analytics", icon: BarChart3, children: [
      { title: "Sales Reports", to: "/admin/sales-analytics" },
      { title: "Revenue Analytics", to: "/admin/analytics" },
      { title: "Product Performance", to: "/admin/product-performance" },
      { title: "Customer Analytics", to: "/admin/segments" },
      { title: "Conversion Tracking", to: "/admin/conversion-tracking" },
      { title: "Search Analytics", to: "/admin/search-analytics" },
    ],
  },
  {
    title: "Support", icon: LifeBuoy, children: [
      { title: "Support Tickets", to: "/admin/support-tickets" },
      { title: "Live Chat", to: "/admin/live-chat" },
      { title: "Complaints", to: "/admin/support/complaints" },
      { title: "Disputes", to: "/admin/disputes" },
      { title: "Refund Requests", to: "/admin/refunds" },
      { title: "Customer Feedback", to: "/admin/feedback" },
      { title: "Help Center", to: "/admin/support/help-center" },
    ],
  },
  {
    title: "CMS", icon: FileText, children: [
      { title: "Pages", to: "/admin/pages" },
      { title: "Blog / Articles", to: "/admin/blog" },
      { title: "Media Library", to: "/admin/media" },
      { title: "SEO Settings", to: "/admin/seo" },
    ],
  },
  {
    title: "Notifications", icon: Bell, children: [
      { title: "Broadcast", to: "/admin/notifications" },
      { title: "Push Notifications", to: "/admin/push-notifications" },
      { title: "Email Templates", to: "/admin/email-templates" },
      { title: "SMS Templates", to: "/admin/sms-templates" },
    ],
  },
  {
    title: "Automation", icon: Zap, children: [
      { title: "Automation Rules", to: "/admin/automation-rules" },
    ],
  },
  {
    title: "Settings", icon: Settings, children: [
      { title: "General", to: "/admin/settings" },
      { title: "SEO", to: "/admin/seo" },
      { title: "Currency & Tax", to: "/admin/settings/currency" },
      { title: "Email Config", to: "/admin/settings/email" },
      { title: "OTP / SMS Config", to: "/admin/settings/otp" },
    ],
  },
  {
    title: "Admins & Roles", icon: UserCog, children: [
      { title: "Admin List", to: "/admin/admins" },
      { title: "Roles & Permissions", to: "/admin/roles" },
    ],
  },
  {
    title: "Security", icon: ShieldCheck, children: [
      { title: "Login Sessions", to: "/admin/login-sessions" },
      { title: "Security Settings", to: "/admin/security" },
      { title: "Fraud Detection", to: "/admin/fraud-detection" },
      { title: "IP Restrictions", to: "/admin/security/ip" },
    ],
  },
  {
    title: "System Logs", icon: ScrollText, children: [
      { title: "Activity Logs", to: "/admin/activity-logs" },
      { title: "Error Logs", to: "/admin/logs/errors" },
    ],
  },
  {
    title: "API & Integrations", icon: Plug, children: [
      { title: "API Keys", to: "/admin/api-management" },
      { title: "Webhooks", to: "/admin/webhooks" },
      { title: "Third-party", to: "/admin/api/integrations" },
    ],
  },
  {
    title: "Backup & Restore", icon: DatabaseBackup, children: [
      { title: "Backup", to: "/admin/backup" },
      { title: "Restore", to: "/admin/backup/restore" },
    ],
  },
  { title: "Banned Users", icon: ShieldBan, to: "/admin/users/banned" },
  { title: "Wishlist", icon: Heart, to: "/admin/wishlist-analytics" },
];
