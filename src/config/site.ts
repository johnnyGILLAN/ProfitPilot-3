
import type { LucideIcon } from "lucide-react";
import { LayoutDashboard, ArrowLeftRight, CalendarDays, Calculator, Target, Settings, LifeBuoy, UploadCloud, BarChart3, FileText, ShieldAlert, Briefcase } from "lucide-react";

export const APP_NAME = "ProfitPilot";

export type NavItem = {
  title: string; // This will become a translation key
  href: string;
  icon: LucideIcon;
  disabled?: boolean;
  translationKey: string; // Explicit key for translation
};

// Note: The 'title' field here is now effectively a fallback or identifier.
// The actual display text should come from the translation files using 'translationKey'.
export const mainNavItems: NavItem[] = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    translationKey: "nav.dashboard",
  },
  {
    title: "Transactions",
    href: "/transactions",
    icon: ArrowLeftRight,
    translationKey: "nav.transactions",
  },
  {
    title: "Monthly Summary",
    href: "/monthly-summary",
    icon: CalendarDays,
    translationKey: "nav.monthlySummary",
  },
  {
    title: "Financial Insights",
    href: "/financial-insights",
    icon: BarChart3,
    translationKey: "nav.financialInsights",
  },
  {
    title: "Invoice Generator",
    href: "/invoice-generator",
    icon: FileText,
    translationKey: "nav.invoiceGenerator",
  },
  {
    title: "Business Planning",
    href: "/business-planning",
    icon: Briefcase,
    translationKey: "nav.businessPlanning",
  },
  {
    title: "Import Data",
    href: "/import-data",
    icon: UploadCloud,
    translationKey: "nav.importData",
  },
  {
    title: "Tax Calculator",
    href: "/tax-calculator",
    icon: Calculator,
    translationKey: "nav.taxCalculator",
  },
  {
    title: "Goal Tracker",
    href: "/goal-tracker",
    icon: Target,
    translationKey: "nav.goalTracker",
  },
];

export const secondaryNavItems: NavItem[] = [
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    disabled: false,
    translationKey: "nav.settings",
  },
  {
    title: "Support",
    href: "/support",
    icon: LifeBuoy,
    disabled: false, // Keep enabled to test translations if page exists
    translationKey: "nav.support",
  },
  {
    title: "Admin Panel",
    href: "/admin",
    icon: ShieldAlert, 
    disabled: false, 
    translationKey: "nav.adminPanel",
  }
];

export const countries = [
  'USA', 'UK', 'Canada', 'Netherlands', 'Germany', 'France', 'Australia', 'India', 'UAE',
  'Ireland', 'Japan', 'Singapore', 'Brazil', 'Mexico', 'South Africa', 'Italy', 'Spain',
  'Sweden', 'Poland', 'Belgium', 'Austria', 'Portugal', 'New Zealand', 'Switzerland',
  'Norway', 'Philippines', 'Denmark', 'Malaysia', 'Romania', 'Czech Republic', 'Indonesia'
] as const;

export type Country = typeof countries[number];

export const currencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "INR"] as const;
export type Currency = typeof currencies[number];

export const dateFormats = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD"] as const;
export type DateFormat = typeof dateFormats[number];
