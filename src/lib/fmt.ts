export function money(n: number | string | null | undefined, cur = "Rs.") {
  const v = Number(n ?? 0) || 0;
  return `${cur} ${v.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function num(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("en-PK");
}

export function dt(d: string | Date | null | undefined) {
  if (!d) return "Not yet";
  return new Date(d).toLocaleString("en-PK", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function dOnly(d: string | Date | null | undefined) {
  if (!d) return "Not yet";
  return new Date(d).toLocaleDateString("en-PK", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric" });
}

export const pinFmt = (code: string) => code.replace(/(\d{4})(?=\d)/g, "$1-");

export const TX_LABEL: Record<string, string> = {
  direct_pair: "Direct pair bonus",
  pair_bonus: "Binary pair income",
  direct_referral: "Direct referral bonus",
  rank_reward: "Rank reward",
  salary: "Manager salary",
  pool_share: "Turnover pool share",
  vendor_sale: "Product sale profit",
  withdrawal: "Withdrawal",
  withdrawal_refund: "Withdrawal refund",
  to_epin_wallet: "Moved to E-Pin wallet",
  from_earning_wallet: "From Earning wallet",
  epin_purchase: "E-Pin purchase",
  activation: "ID activation",
  admin_fund: "Fund from company",
  admin_adjust: "Admin adjustment",
};
