import {
  Utensils,
  Car,
  House,
  ShoppingCart,
  Smartphone,
  Laptop,
  GraduationCap,
  Clapperboard,
  Plane,
  HeartPulse,
  Shirt,
  Package,
  Briefcase,
  Code2,
  Store,
  Landmark,
  CreditCard,
  Banknote,
  Wallet,
  ReceiptText,
  TrendingUp,
} from "lucide-react";

export const CATEGORY_ICONS = {
  Food: Utensils,
  Transport: Car,
  Home: House,
  Shopping: ShoppingCart,
  "Bills & Recharge": Smartphone,
  Software: Laptop,
  Education: GraduationCap,
  Entertainment: Clapperboard,
  Travel: Plane,
  Health: HeartPulse,
  Personal: Shirt,
  Other: Package,
  Salary: Briefcase,
  Freelance: Code2,
  Business: Store,
};

export const PAY_ICONS = {
  upi: Smartphone,
  cash: Banknote,
  "credit-card": CreditCard,
  "debit-card": CreditCard,
  "bank-transfer": Landmark,
  other: ReceiptText,
};

export const ACCOUNT_ICONS = {
  bank: Landmark,
  cash: Banknote,
  upi: Smartphone,
  "credit-card": CreditCard,
  "debit-card": CreditCard,
  card: CreditCard,
  investment: TrendingUp,
  other: Wallet,
};

export default function CatIcon({ category, size = 16, className = "", style }) {
  const Icon = category?.name ? CATEGORY_ICONS[category.name] : null;
  if (Icon) return <Icon size={size} className={className} style={style} />;
  return (
    <span className={className || undefined} style={style}>
      {category?.emoji || "📦"}
    </span>
  );
}

export function PayIcon({ method, size = 16, className = "", style }) {
  const Icon = PAY_ICONS[method];
  if (Icon) return <Icon size={size} className={className} style={style} />;
  return <ReceiptText size={size} className={className} style={style} />;
}

export function AccountTypeIcon({ type, size = 16, className = "", style }) {
  const Icon = ACCOUNT_ICONS[type];
  if (Icon) return <Icon size={size} className={className} style={style} />;
  return <Wallet size={size} className={className} style={style} />;
}