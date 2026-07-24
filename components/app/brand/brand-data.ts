// Mock data for the Brand dashboard. Mirrors the creator data shape but from the brand's perspective.

export type CampaignType =
  | "creator"
  | "referral"
  | "logo"
  | "clipping"
  | "ambassador"
  | "event";

export type CampaignStatus =
  | "Draft"
  | "Submission & Review"
  | "Live"
  | "Completed"
  | "Paused";

export type Phase = "submission" | "live" | "completed";

export type BrandCampaign = {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  cover: string;
  createdAt: string;
  durationDays: number;
  liveStartsAt: string;
  liveEndsAt: string;
  phase: Phase;
  creatorsRequested: number;
  submissionsReceived: number;
  approvedVideos: number;
  views: number;
  budgetTotal: number;
  budgetUsed: number;
  rewardPerK: number;
  maxPerCreator: number;
  /** "global" or list of country names */
  countries?: "global" | string[];
};

export const COUNTRIES = [
  "Uganda", "Kenya", "Nigeria", "South Africa", "Ghana",
  "Tanzania", "Rwanda", "Ethiopia", "Egypt", "Morocco",
];

export const brand = {
  name: "Acme Studio",
  email: "team@acmestudio.com",
  initial: "A",
  color: "oklch(0.66 0.20 42)",
  walletBalance: 18420.5,
  reserved: 12500,
  totalSpend: 24380.4,
  platformFees: 3257.5,
};

export const brandCampaigns: BrandCampaign[] = [
  {
    id: "ac-glow-launch",
    name: "Glow Launch — Summer Drop",
    type: "creator",
    status: "Live",
    cover: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80",
    createdAt: "2026-05-20",
    durationDays: 30,
    liveStartsAt: "2026-06-12",
    liveEndsAt: "2026-07-12",
    phase: "live",
    creatorsRequested: 20,
    submissionsReceived: 38,
    approvedVideos: 18,
    views: 1_842_000,
    budgetTotal: 4600,
    budgetUsed: 3120,
    rewardPerK: 4.2,
    maxPerCreator: 200,
    countries: "global",
  },
  {
    id: "ac-clip-replay",
    name: "Clip & Replay — Highlights",
    type: "clipping",
    status: "Submission & Review",
    cover: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80",
    createdAt: "2026-06-18",
    durationDays: 30,
    liveStartsAt: "2026-07-02",
    liveEndsAt: "2026-08-01",
    phase: "submission",
    creatorsRequested: 10,
    submissionsReceived: 14,
    approvedVideos: 4,
    views: 0,
    budgetTotal: 2300,
    budgetUsed: 0,
    rewardPerK: 1.5,
    maxPerCreator: 200,
    countries: ["Uganda", "Kenya", "Nigeria"],
  },
  {
    id: "ac-referral-loop",
    name: "Referral Loop — VIP Codes",
    type: "referral",
    status: "Live",
    cover: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=80",
    createdAt: "2026-05-02",
    durationDays: 30,
    liveStartsAt: "2026-05-22",
    liveEndsAt: "2026-06-22",
    phase: "live",
    creatorsRequested: 30,
    submissionsReceived: 60,
    approvedVideos: 28,
    views: 612_000,
    budgetTotal: 315, // $10.50 × 30
    budgetUsed: 315,
    rewardPerK: 0,
    maxPerCreator: 0,
    countries: ["South Africa", "Ghana"],
  },
  {
    id: "ac-logo-flyer",
    name: "Festival Flyer Placement",
    type: "logo",
    status: "Completed",
    cover: "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=1200&q=80",
    createdAt: "2026-03-10",
    durationDays: 14,
    liveStartsAt: "2026-03-25",
    liveEndsAt: "2026-04-08",
    phase: "completed",
    creatorsRequested: 15,
    submissionsReceived: 26,
    approvedVideos: 15,
    views: 980_000,
    budgetTotal: 1725,
    budgetUsed: 1725,
    rewardPerK: 1,
    maxPerCreator: 100,
    countries: "global",
  },
];

export type BrandSubmission = {
  id: string;
  campaignId: string;
  creatorName: string;
  creatorAvatar: string;
  thumb: string;
  caption: string;
  platform: "TikTok" | "Instagram" | "YouTube";
  submittedAt: string;
  status: "Pending Review" | "Approved" | "Rejected" | "Needs Revision";
  reason?: string;
  views?: number;
};

export const brandSubmissions: BrandSubmission[] = [
  { id: "bs1", campaignId: "ac-glow-launch", creatorName: "Maya Okafor", creatorAvatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&q=80", thumb: "https://images.unsplash.com/photo-1522335789203-aaa67dd80df3?w=600&q=80", caption: "GRWM with the new SPF50 — daylight, no filter ☀️", platform: "TikTok", submittedAt: "2026-06-22", status: "Pending Review" },
  { id: "bs2", campaignId: "ac-glow-launch", creatorName: "Daniel Park", creatorAvatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&q=80", thumb: "https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=600&q=80", caption: "Hot girl skincare for actual hot weather 🌞", platform: "Instagram", submittedAt: "2026-06-21", status: "Approved", views: 184_000 },
  { id: "bs3", campaignId: "ac-clip-replay", creatorName: "Jordan Smith", creatorAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80", thumb: "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=600&q=80", caption: "Top 5 highlights from this week's drop 🔥", platform: "TikTok", submittedAt: "2026-06-23", status: "Pending Review" },
  { id: "bs4", campaignId: "ac-glow-launch", creatorName: "Priya Nair", creatorAvatar: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&q=80", thumb: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=600&q=80", caption: "POV: your skincare actually works", platform: "TikTok", submittedAt: "2026-06-20", status: "Needs Revision", reason: "Show the texture pump within first 3 seconds." },
  { id: "bs5", campaignId: "ac-referral-loop", creatorName: "Leo Martins", creatorAvatar: "https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=200&q=80", thumb: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=600&q=80", caption: "Use code VIP25 — link in bio 💌", platform: "Instagram", submittedAt: "2026-06-19", status: "Approved", views: 92_000 },
  { id: "bs6", campaignId: "ac-glow-launch", creatorName: "Aria Chen", creatorAvatar: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&q=80", thumb: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=600&q=80", caption: "Honest skin test in golden hour", platform: "YouTube", submittedAt: "2026-06-17", status: "Rejected", reason: "Off-brand color grading; does not match brief tone." },
  { id: "bs7", campaignId: "ac-clip-replay", creatorName: "Sam Taylor", creatorAvatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&q=80", thumb: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80", caption: "These plays were unreal 🎥", platform: "TikTok", submittedAt: "2026-06-23", status: "Pending Review" },
];

export const brandViewsTrend = [
  { d: "Mon", v: 142_000 }, { d: "Tue", v: 168_000 }, { d: "Wed", v: 211_000 },
  { d: "Thu", v: 198_000 }, { d: "Fri", v: 256_000 }, { d: "Sat", v: 312_000 }, { d: "Sun", v: 274_000 },
];

export const brandSpendTrend = [
  { m: "Jan", spend: 1200 }, { m: "Feb", spend: 1800 }, { m: "Mar", spend: 2400 },
  { m: "Apr", spend: 3100 }, { m: "May", spend: 4800 }, { m: "Jun", spend: 6200 },
];

export type BrandTransaction = {
  id: string;
  date: string;
  desc: string;
  amount: number;
  kind: "debit" | "credit" | "fee";
};

export const brandTransactions: BrandTransaction[] = [
  { id: "bt1", date: "2026-06-23", desc: "Top-up — Wire transfer", amount: 10000, kind: "credit" },
  { id: "bt2", date: "2026-06-22", desc: "Payout — Glow Launch creators", amount: -3120, kind: "debit" },
  { id: "bt3", date: "2026-06-22", desc: "Platform fee (15%)", amount: -468, kind: "fee" },
  { id: "bt4", date: "2026-06-19", desc: "Referral Loop — creator payouts", amount: -315, kind: "debit" },
  { id: "bt5", date: "2026-06-10", desc: "Top-up — Credit card", amount: 5000, kind: "credit" },
  { id: "bt6", date: "2026-05-30", desc: "Festival Flyer — creator payouts", amount: -1500, kind: "debit" },
];

export type BrandInvoice = { id: string; number: string; date: string; amount: number; status: "Paid" | "Open" };
export const brandInvoices: BrandInvoice[] = [
  { id: "inv-2606", number: "INV-2606", date: "2026-06-22", amount: 3588, status: "Paid" },
  { id: "inv-2606b", number: "INV-2606B", date: "2026-06-19", amount: 315, status: "Paid" },
  { id: "inv-2505", number: "INV-2505", date: "2026-05-30", amount: 1725, status: "Paid" },
];

export type BrandNotifKind =
  | "application"
  | "submission"
  | "revision"
  | "approval"
  | "submission_limit"
  | "phase_change"
  | "campaign_end"
  | "milestone_payment"
  | "milestone_views"
  | "wallet_low"
  | "payment_processed"
  | "invoice"
  | "platform"
  | "support"
  | "meeting";

export type BrandNotification = {
  id: string;
  title: string;
  body: string;
  /** Days-ago for grouping. 0 = today, 1 = yesterday, 2+ = earlier */
  daysAgo: number;
  time: string;
  read: boolean;
  kind: BrandNotifKind;
  category: "Campaigns" | "Submissions" | "Wallet" | "Analytics" | "Support" | "Platform";
};

export const brandNotifications: BrandNotification[] = [
  { id: "bn1", title: "New creator applied", body: "Maya Okafor applied to Glow Launch.", daysAgo: 0, time: "12m ago", read: false, kind: "application", category: "Campaigns" },
  { id: "bn2", title: "New submission", body: "Daniel Park submitted a video to Glow Launch.", daysAgo: 0, time: "2h ago", read: false, kind: "submission", category: "Submissions" },
  { id: "bn3", title: "Glow Launch hit 1M views 🎉", body: "Total views across approved videos crossed 1,000,000.", daysAgo: 0, time: "4h ago", read: false, kind: "milestone_views", category: "Analytics" },
  { id: "bn4", title: "Wallet balance is running low", body: "Your wallet has under $5,000 reserved. Top up to avoid pauses.", daysAgo: 1, time: "Yesterday at 6:12 PM", read: false, kind: "wallet_low", category: "Wallet" },
  { id: "bn5", title: "Revision submitted", body: "Priya Nair updated her submission after your feedback.", daysAgo: 1, time: "Yesterday at 2:30 PM", read: true, kind: "revision", category: "Submissions" },
  { id: "bn6", title: "Clip & Replay reached submission limit", body: "20 of 20 submission slots received. Review begins now.", daysAgo: 1, time: "Yesterday at 11:04 AM", read: true, kind: "submission_limit", category: "Campaigns" },
  { id: "bn7", title: "Glow Launch enters Live phase soon", body: "Live tracking begins in 2 days after the review window.", daysAgo: 2, time: "2 days ago", read: true, kind: "phase_change", category: "Campaigns" },
  { id: "bn8", title: "Payment processed", body: "$3,120 paid to 12 creators on Glow Launch.", daysAgo: 2, time: "2 days ago", read: true, kind: "payment_processed", category: "Wallet" },
  { id: "bn9", title: "New invoice available", body: "INV-2606 for $3,588 is ready to download.", daysAgo: 3, time: "3 days ago", read: true, kind: "invoice", category: "Wallet" },
  { id: "bn10", title: "Festival Flyer ended", body: "Your campaign completed with 980K total views.", daysAgo: 4, time: "4 days ago", read: true, kind: "campaign_end", category: "Campaigns" },
  { id: "bn11", title: "Support reply", body: "Our team responded to your ticket #4821.", daysAgo: 5, time: "5 days ago", read: true, kind: "support", category: "Support" },
  { id: "bn12", title: "New Goheza feature: bulk approvals", body: "Approve up to 25 submissions in one click.", daysAgo: 6, time: "6 days ago", read: true, kind: "platform", category: "Platform" },
  { id: "bn13", title: "Meeting reminder", body: "Strategy call with Goheza Sales tomorrow at 10:00 AM.", daysAgo: 7, time: "1 week ago", read: true, kind: "meeting", category: "Support" },
];

export const formatMoney = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: n >= 1000 ? 0 : 2 });

export const formatNumber = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`;
  return n.toLocaleString();
};

export const findBrandCampaign = (id: string) => brandCampaigns.find((c) => c.id === id);

export const CAMPAIGN_TYPE_META: Record<CampaignType, { label: string; tagline: string; icon: string; comingSoon?: boolean }> = {
  creator: { label: "Creator Campaign", tagline: "Vetted creators produce original branded content.", icon: "sparkles" },
  referral: { label: "Referral Campaign", tagline: "Creators earn commissions on referral actions.", icon: "share" },
  logo: { label: "Logo / Flyer Placement", tagline: "Creators place your asset in their existing content.", icon: "image" },
  clipping: { label: "Clipping Campaign", tagline: "Creators clip and repost your existing content.", icon: "scissors" },
  ambassador: { label: "Ambassador Campaign", tagline: "Long-term partnerships with select creators.", icon: "crown", comingSoon: true },
  event: { label: "Event Activation", tagline: "On-the-ground creator coverage of events.", icon: "calendar", comingSoon: true },
};
