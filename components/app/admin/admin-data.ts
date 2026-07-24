// Mock data for Goheza Admin (Platform Owner) dashboard.

export type AdminMetric = { label: string; value: string; delta?: string; tone?: "orange" | "indigo" | "green" | "navy" };

export const adminMetrics: AdminMetric[] = [
  { label: "Active Brands", value: "284", delta: "+12 this week", tone: "indigo" },
  { label: "Active Creators", value: "4,812", delta: "+186 this week", tone: "orange" },
  { label: "Campaigns Running", value: "98", delta: "+8 today", tone: "green" },
  { label: "Submissions Today", value: "342" },
  { label: "Approved Content", value: "18,420" },
  { label: "Platform Revenue", value: "$284,910", delta: "+9.4% MoM", tone: "orange" },
  { label: "Wallet Float", value: "$1.42M", tone: "navy" },
  { label: "Pending Payouts", value: "$48,210", delta: "412 creators" },
  { label: "Pending Invoices", value: "$72,580", delta: "16 brands" },
];

export type ActivityKind =
  | "brand_signup" | "creator_signup" | "campaign_created" | "submission_new"
  | "submission_approved" | "submission_rejected" | "wallet_topup" | "withdrawal"
  | "invoice_request" | "support_open" | "support_resolved" | "fraud_alert";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  meta: string;
  time: string;
};

export const adminActivity: ActivityItem[] = [
  { id: "a1", kind: "brand_signup", title: "New brand signed up", meta: "Lumen Skincare · Lagos, NG", time: "2m ago" },
  { id: "a2", kind: "campaign_created", title: "Campaign created", meta: "Plyform — 'Q3 Install Push' · $12,400 budget", time: "8m ago" },
  { id: "a3", kind: "submission_new", title: "New submission received", meta: "@kwamefilms → Glow Launch (TikTok)", time: "12m ago" },
  { id: "a4", kind: "wallet_topup", title: "Wallet top-up", meta: "Nova Pay deposited $25,000", time: "31m ago" },
  { id: "a5", kind: "withdrawal", title: "Creator withdrawal requested", meta: "@naledi.creates → $1,420 (Bank UG)", time: "1h ago" },
  { id: "a6", kind: "submission_approved", title: "Submission approved", meta: "Acme Studio approved 6 videos", time: "1h ago" },
  { id: "a7", kind: "invoice_request", title: "Invoice requested", meta: "Obima — INV draft $4,800", time: "2h ago" },
  { id: "a8", kind: "fraud_alert", title: "Suspicious activity flagged", meta: "Account @ghost_views — 4 rapid submissions", time: "3h ago" },
  { id: "a9", kind: "creator_signup", title: "New creator onboarded", meta: "@imanitalks · Kampala, UG", time: "4h ago" },
  { id: "a10", kind: "support_resolved", title: "Support ticket resolved", meta: "#4821 — Brand wallet refund", time: "5h ago" },
];

export type AdminCampaignRow = {
  id: string;
  brand: string;
  name: string;
  type: "Creator" | "Referral" | "Clipping" | "Logo/Flyer";
  status: "Draft" | "Active" | "Pending Payment" | "Completed" | "Paused";
  budget: number;
  creators: number;
  spend: number;
  views: number;
  starts: string;
  ends: string;
};

export const adminCampaigns: AdminCampaignRow[] = [
  { id: "c1", brand: "Acme Studio", name: "Glow Launch — Summer Drop", type: "Creator", status: "Active", budget: 4600, creators: 20, spend: 3120, views: 1_842_000, starts: "2026-06-12", ends: "2026-07-12" },
  { id: "c2", brand: "Plyform", name: "Q3 Install Push", type: "Creator", status: "Active", budget: 12400, creators: 35, spend: 6100, views: 920_000, starts: "2026-06-18", ends: "2026-07-18" },
  { id: "c3", brand: "Nova Pay", name: "Referral Loop — VIP", type: "Referral", status: "Active", budget: 4200, creators: 30, spend: 1850, views: 612_000, starts: "2026-05-22", ends: "2026-06-22" },
  { id: "c4", brand: "Obima", name: "Festival Flyer Placement", type: "Logo/Flyer", status: "Completed", budget: 1725, creators: 15, spend: 1725, views: 980_000, starts: "2026-03-25", ends: "2026-04-08" },
  { id: "c5", brand: "Kairo", name: "Highlight Clipping — Replays", type: "Clipping", status: "Pending Payment", budget: 2300, creators: 10, spend: 0, views: 0, starts: "2026-07-02", ends: "2026-08-01" },
  { id: "c6", brand: "Sadewa", name: "Awareness Drive", type: "Creator", status: "Paused", budget: 8000, creators: 25, spend: 4200, views: 1_120_000, starts: "2026-05-10", ends: "2026-06-10" },
];

export type AdminUser = {
  id: string;
  type: "Brand" | "Creator";
  name: string;
  handle?: string;
  country: string;
  status: "Active" | "Suspended" | "Pending";
  spent?: number;
  earned?: number;
  joined: string;
  flag?: "none" | "review" | "fraud";
};

export const adminUsers: AdminUser[] = [
  { id: "u1", type: "Brand", name: "Acme Studio", country: "Nigeria", status: "Active", spent: 24380, joined: "2026-02-04", flag: "none" },
  { id: "u2", type: "Brand", name: "Nova Pay", country: "Kenya", status: "Active", spent: 56120, joined: "2026-01-12", flag: "none" },
  { id: "u3", type: "Brand", name: "Obima", country: "Ghana", status: "Suspended", spent: 4200, joined: "2025-11-18", flag: "review" },
  { id: "u4", type: "Creator", name: "Naledi Khumalo", handle: "@naledi.creates", country: "South Africa", status: "Active", earned: 4820, joined: "2026-03-08", flag: "none" },
  { id: "u5", type: "Creator", name: "Kwame Owusu", handle: "@kwamefilms", country: "Ghana", status: "Active", earned: 6210, joined: "2026-02-22", flag: "none" },
  { id: "u6", type: "Creator", name: "Ghost Account", handle: "@ghost_views", country: "Unknown", status: "Pending", earned: 0, joined: "2026-06-22", flag: "fraud" },
];

export type AdminInvoice = {
  id: string;
  number: string;
  brand: string;
  amount: number;
  status: "Pending" | "Sent" | "Paid" | "Overdue";
  date: string;
};

export const adminInvoices: AdminInvoice[] = [
  { id: "i1", number: "INV-2706", brand: "Plyform", amount: 12400, status: "Pending", date: "2026-07-01" },
  { id: "i2", number: "INV-2705", brand: "Acme Studio", amount: 3588, status: "Paid", date: "2026-06-22" },
  { id: "i3", number: "INV-2704", brand: "Obima", amount: 4200, status: "Overdue", date: "2026-05-30" },
  { id: "i4", number: "INV-2703", brand: "Kairo", amount: 2300, status: "Sent", date: "2026-06-28" },
];

export type AdminTicket = {
  id: string;
  user: string;
  subject: string;
  category: "Payments" | "Campaign" | "Technical" | "Account" | "Fraud";
  priority: "Low" | "Medium" | "High" | "Urgent";
  status: "Open" | "In Progress" | "Resolved";
  updated: string;
};

export const adminTickets: AdminTicket[] = [
  { id: "t1", user: "Plyform (Brand)", subject: "Wallet top-up not reflecting", category: "Payments", priority: "High", status: "Open", updated: "12m ago" },
  { id: "t2", user: "@kwamefilms", subject: "Withdrawal pending 3 days", category: "Payments", priority: "Medium", status: "In Progress", updated: "1h ago" },
  { id: "t3", user: "Obima", subject: "Need invoice for compliance", category: "Account", priority: "Low", status: "Open", updated: "4h ago" },
  { id: "t4", user: "@naledi.creates", subject: "Submission rejected unfairly", category: "Campaign", priority: "High", status: "Open", updated: "5h ago" },
  { id: "t5", user: "Anonymous", subject: "Possible fake account farming views", category: "Fraud", priority: "Urgent", status: "Open", updated: "8h ago" },
  { id: "t6", user: "Nova Pay", subject: "Analytics export bug", category: "Technical", priority: "Medium", status: "Resolved", updated: "1d ago" },
];

export type AdminDispute = {
  id: string;
  brand: string;
  creator: string;
  campaign: string;
  type: "Payment" | "Content Rejection" | "Fraud" | "Performance";
  amount: number;
  opened: string;
  status: "Open" | "Resolved";
};

export const adminDisputes: AdminDispute[] = [
  { id: "d1", brand: "Acme Studio", creator: "@aria.chen", campaign: "Glow Launch", type: "Content Rejection", amount: 200, opened: "2026-06-20", status: "Open" },
  { id: "d2", brand: "Obima", creator: "@bayosounds", campaign: "Festival Flyer", type: "Payment", amount: 100, opened: "2026-06-15", status: "Open" },
  { id: "d3", brand: "Nova Pay", creator: "@ghost_views", campaign: "Referral Loop", type: "Fraud", amount: 420, opened: "2026-06-22", status: "Open" },
];

export const adminGrowth = [
  { m: "Jan", brands: 142, creators: 1800 },
  { m: "Feb", brands: 168, creators: 2120 },
  { m: "Mar", brands: 196, creators: 2680 },
  { m: "Apr", brands: 224, creators: 3210 },
  { m: "May", brands: 256, creators: 3940 },
  { m: "Jun", brands: 284, creators: 4812 },
];

export const adminRevenue = [
  { m: "Jan", revenue: 84000 },
  { m: "Feb", revenue: 102000 },
  { m: "Mar", revenue: 138000 },
  { m: "Apr", revenue: 182000 },
  { m: "May", revenue: 234000 },
  { m: "Jun", revenue: 284910 },
];

export const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n >= 1000 ? 0 : 2 });
export const formatNumber = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString();
};
