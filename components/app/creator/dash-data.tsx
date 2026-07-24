// Mock data for the creator dashboard. Designed to feel realistic across pages.

export type Platform = "TikTok" | "Instagram" | "YouTube" | "X" | "Facebook";
export type Category = "Fashion" | "Beauty" | "Tech" | "Lifestyle" | "Fitness" | "Food" | "Gaming" | "Finance";

export type Campaign = {
  id: string;
  brand: string;
  brandColor: string; // hex/oklch for logo bg
  brandInitial: string;
  name: string;
  rewardPerK: number; // USD per 1k views
  platforms: Platform[];
  category: Category;
  country: string;
  deadline: string; // YYYY-MM-DD
  status: "Open" | "Closing Soon" | "New";
  creatorsNeeded: number;
  estEarnings: { min: number; max: number };
  cover: string;
  brief: string;
  goals: string[];
  dos: string[];
  donts: string[];
  deliverables: string[];
  guidelines: string[];
  references: string[];
};

export const campaigns: Campaign[] = [
  {
    id: "lumen-summer",
    brand: "Lumen",
    brandColor: "oklch(0.72 0.16 55)",
    brandInitial: "L",
    name: "Summer Glow — Skincare Launch",
    rewardPerK: 4.2,
    platforms: ["TikTok", "Instagram"],
    category: "Beauty",
    country: "Global",
    deadline: "2026-07-22",
    status: "New",
    creatorsNeeded: 30,
    estEarnings: { min: 120, max: 1800 },
    cover: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1200&q=80",
    brief: "Showcase Lumen's new SPF50 day cream in a get-ready-with-me style. Authentic, daylight, real skin.",
    goals: ["Drive 2M attributed views", "300+ creator submissions", "5% CTR to product page"],
    dos: ["Mention SPF50", "Show texture pump", "Tag @lumen.skin"],
    donts: ["Don't compare to competitors", "No filters that hide skin", "No misleading claims"],
    deliverables: ["1 vertical video, 20–45s", "Caption + #LumenGlow", "Cover thumbnail"],
    guidelines: ["Warm tone", "Friendly POV", "Daylight only"],
    references: ["https://images.unsplash.com/photo-1522335789203-aaa67dd80df3?w=600&q=80"],
  },
  {
    id: "norra-runners",
    brand: "Norra",
    brandColor: "oklch(0.55 0.18 268)",
    brandInitial: "N",
    name: "Daily Runners — Performance Sneakers",
    rewardPerK: 5.8,
    platforms: ["Instagram", "YouTube"],
    category: "Fitness",
    country: "US, UK, ZA",
    deadline: "2026-07-10",
    status: "Closing Soon",
    creatorsNeeded: 20,
    estEarnings: { min: 200, max: 2400 },
    cover: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&q=80",
    brief: "Take Norra's daily runners on a 5km morning run and share your honest experience.",
    goals: ["Brand awareness", "Drive add-to-cart on norra.com"],
    dos: ["Real run footage", "Mention weight + grip"],
    donts: ["No treadmill only", "No paid actor look"],
    deliverables: ["1 reel, 30–60s", "1 photo carousel"],
    guidelines: ["Sporty energy", "Fast cuts"],
    references: [],
  },
  {
    id: "vault-dfs",
    brand: "Vault",
    brandColor: "oklch(0.62 0.14 152)",
    brandInitial: "V",
    name: "Vault DFS — Fantasy Football",
    rewardPerK: 7.5,
    platforms: ["TikTok"],
    category: "Gaming",
    country: "US",
    deadline: "2026-08-01",
    status: "Open",
    creatorsNeeded: 50,
    estEarnings: { min: 250, max: 3200 },
    cover: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=80",
    brief: "Show your weekly Vault DFS lineup and pick reasoning. Hype, fast, opinionated.",
    goals: ["App installs", "Signups per dollar"],
    dos: ["Show app UI", "Use promo code VAULT50"],
    donts: ["No gambling claims", "No minors"],
    deliverables: ["1 vertical video, 30s"],
    guidelines: ["High energy"],
    references: [],
  },
  {
    id: "hyrox-launch",
    brand: "Hyrox",
    brandColor: "oklch(0.66 0.20 42)",
    brandInitial: "H",
    name: "Hyrox Gear — Race Day",
    rewardPerK: 3.6,
    platforms: ["Instagram", "TikTok", "YouTube"],
    category: "Fitness",
    country: "EU, UK",
    deadline: "2026-09-12",
    status: "Open",
    creatorsNeeded: 40,
    estEarnings: { min: 90, max: 1500 },
    cover: "https://images.unsplash.com/photo-1517960413843-0aee8e2b3285?w=1200&q=80",
    brief: "Race-day prep with the new Hyrox gear line.",
    goals: ["Drive PDP traffic"],
    dos: ["Show gear in action"],
    donts: ["No staged shots"],
    deliverables: ["1 video"],
    guidelines: ["Athletic"],
    references: [],
  },
  {
    id: "stride-coffee",
    brand: "Stride",
    brandColor: "oklch(0.5 0.07 60)",
    brandInitial: "S",
    name: "Stride Cold Brew",
    rewardPerK: 4.0,
    platforms: ["TikTok", "Instagram"],
    category: "Food",
    country: "Global",
    deadline: "2026-08-20",
    status: "New",
    creatorsNeeded: 25,
    estEarnings: { min: 100, max: 1400 },
    cover: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1200&q=80",
    brief: "Your morning routine, fueled by Stride.",
    goals: ["Brand awareness"],
    dos: ["Show pour"],
    donts: ["No coffee competitors"],
    deliverables: ["1 video"],
    guidelines: ["Calm, warm"],
    references: [],
  },
  {
    id: "northbeam-app",
    brand: "Northbeam",
    brandColor: "oklch(0.45 0.05 240)",
    brandInitial: "N",
    name: "Northbeam — Pro Camera App",
    rewardPerK: 6.2,
    platforms: ["YouTube", "Instagram"],
    category: "Tech",
    country: "Global",
    deadline: "2026-10-01",
    status: "Open",
    creatorsNeeded: 35,
    estEarnings: { min: 180, max: 2600 },
    cover: "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=1200&q=80",
    brief: "Use Northbeam to shoot a 30s cinematic piece. Show pro features.",
    goals: ["App installs"],
    dos: ["Show app UI briefly"],
    donts: ["No deceptive footage"],
    deliverables: ["1 video"],
    guidelines: ["Cinematic"],
    references: [],
  },
];

export type Application = {
  id: string;
  campaignId: string;
  status: "Pending Review" | "Approved" | "Rejected" | "Needs Revision" | "Selected";
  appliedAt: string;
  note?: string;
};

export const applications: Application[] = [
  { id: "a1", campaignId: "lumen-summer", status: "Approved", appliedAt: "2026-06-12" },
  { id: "a2", campaignId: "norra-runners", status: "Pending Review", appliedAt: "2026-06-20" },
  { id: "a3", campaignId: "vault-dfs", status: "Needs Revision", appliedAt: "2026-06-18", note: "Cut the intro to under 3s; show app UI earlier." },
  { id: "a4", campaignId: "stride-coffee", status: "Selected", appliedAt: "2026-06-05" },
  { id: "a5", campaignId: "hyrox-launch", status: "Rejected", appliedAt: "2026-05-29", note: "Brand chose creators in EU only this round." },
];

export type Submission = {
  id: string;
  campaignId: string;
  thumb: string;
  submittedAt: string;
  views: number;
  likes: number;
  comments: number;
  status: "Live" | "Pending Review" | "Approved" | "Rejected" | "Needs Revision";
  feedback?: string;
};

export const submissions: Submission[] = [
  { id: "s1", campaignId: "lumen-summer", thumb: "https://images.unsplash.com/photo-1522335789203-aaa67dd80df3?w=600&q=80", submittedAt: "2026-06-15", views: 482000, likes: 41200, comments: 1820, status: "Live" },
  { id: "s2", campaignId: "stride-coffee", thumb: "https://images.unsplash.com/photo-1494314671902-399b18174975?w=600&q=80", submittedAt: "2026-06-08", views: 188000, likes: 14200, comments: 612, status: "Live" },
  { id: "s3", campaignId: "vault-dfs", thumb: "https://images.unsplash.com/photo-1606921231106-f1083329a65c?w=600&q=80", submittedAt: "2026-06-19", views: 0, likes: 0, comments: 0, status: "Needs Revision", feedback: "Cut intro to under 3s; show app UI earlier." },
  { id: "s4", campaignId: "norra-runners", thumb: "https://images.unsplash.com/photo-1518611012118-696072aa579a?w=600&q=80", submittedAt: "2026-06-21", views: 0, likes: 0, comments: 0, status: "Pending Review" },
];

export const earningsTrend = [
  { month: "Jan", earnings: 320 },
  { month: "Feb", earnings: 480 },
  { month: "Mar", earnings: 610 },
  { month: "Apr", earnings: 950 },
  { month: "May", earnings: 1220 },
  { month: "Jun", earnings: 1840 },
];

export const viewsTrend = [
  { d: "Mon", v: 18000 }, { d: "Tue", v: 24000 }, { d: "Wed", v: 31000 },
  { d: "Thu", v: 28000 }, { d: "Fri", v: 42000 }, { d: "Sat", v: 51000 }, { d: "Sun", v: 47000 },
];

export const platformShare = [
  { name: "TikTok", value: 58 },
  { name: "Instagram", value: 28 },
  { name: "YouTube", value: 14 },
];

export const transactions = [
  { id: "t1", date: "2026-06-22", desc: "Payout — Stride Cold Brew", amount: 320.5, kind: "credit" as const },
  { id: "t2", date: "2026-06-18", desc: "Payout — Lumen Glow", amount: 612.4, kind: "credit" as const },
  { id: "t3", date: "2026-06-10", desc: "Withdrawal to bank", amount: -500, kind: "debit" as const },
  { id: "t4", date: "2026-05-28", desc: "Payout — Norra Runners", amount: 285.0, kind: "credit" as const },
  { id: "t5", date: "2026-05-15", desc: "Withdrawal to bank", amount: -400, kind: "debit" as const },
];

export const notifications = [
  { id: "n1", title: "Your submission was approved", body: "Lumen Glow — published to your TikTok queue.", time: "2h ago", read: false, kind: "approval" as const },
  { id: "n2", title: "New campaign matches your niche", body: "Northbeam — Pro Camera App is live.", time: "5h ago", read: false, kind: "new" as const },
  { id: "n3", title: "Payment received", body: "$612.40 paid to your wallet.", time: "1d ago", read: false, kind: "payment" as const },
  { id: "n4", title: "Submission needs revision", body: "Vault DFS — cut intro to under 3s.", time: "2d ago", read: true, kind: "revision" as const },
  { id: "n5", title: "Campaign deadline approaching", body: "Norra Runners ends in 3 days.", time: "3d ago", read: true, kind: "deadline" as const },
  { id: "n6", title: "Submission rejected", body: "Hyrox — brand chose EU-only creators this round.", time: "4d ago", read: true, kind: "revision" as const },
  { id: "n7", title: "Payment processed", body: "Withdrawal of $500 sent to your bank account.", time: "5d ago", read: true, kind: "payment" as const },
  { id: "n8", title: "New feature: Per-video Analytics", body: "Track each published video's performance separately.", time: "1w ago", read: true, kind: "new" as const },
];

export type PaymentMethod = {
  id: string;
  type: "Bank Account" | "Mobile Money";
  label: string;
  details: string;
  isDefault: boolean;
};

export const paymentMethods: PaymentMethod[] = [
  { id: "pm1", type: "Bank Account", label: "Standard Bank", details: "Naledi K. · ••••8421", isDefault: true },
  { id: "pm2", type: "Mobile Money", label: "MTN MoMo", details: "Naledi K. · +27 71 234 5678", isDefault: false },
];

export const tips = [
  { id: "1", title: "How to shoot a viral hook in 3 seconds", yt: "ScMzIvxBSi4", tag: "Hooks" },
  { id: "2", title: "Better storytelling for short-form", yt: "OTBR-WuY7iE", tag: "Storytelling" },
  { id: "3", title: "DIY lighting that looks pro", yt: "k9Sb0DK0sUQ", tag: "Lighting" },
  { id: "4", title: "Editing pace that keeps viewers", yt: "DUPxYL9YkH0", tag: "Editing" },
  { id: "5", title: "Winning brand collaborations", yt: "p3J6li9DjbA", tag: "Brand deals" },
  { id: "6", title: "TikTok growth in 2026", yt: "M7lc1UVf-VE", tag: "TikTok" },
];

export const creator = {
  name: "Naledi K.",
  handle: "@naledi.creates",
  avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=faces&q=80",
  joined: "March 2025",
  country: "South Africa",
  languages: ["English", "isiZulu"],
  categories: ["Beauty", "Lifestyle"],
  bio: "Lifestyle creator focused on warm, daylight content. 4.1M lifetime views.",
  level: "Creator Pro",
  progress: 68,
};

export function findCampaign(id: string) {
  return campaigns.find((c) => c.id === id);
}

export function formatMoney(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
}

export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US", { notation: n >= 10000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}