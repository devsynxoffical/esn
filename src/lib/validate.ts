export function normPhone(raw: string) {
  let d = raw.replace(/\D/g, "");
  if (d.startsWith("92") && d.length === 12) d = "0" + d.slice(2);
  if (d.length === 10 && d.startsWith("3")) d = "0" + d;
  return d;
}

export function normCnic(raw: string) {
  const d = raw.replace(/\D/g, "");
  return d.length === 13 ? `${d.slice(0, 5)}-${d.slice(5, 12)}-${d.slice(12)}` : "";
}

export const isPhone = (p: string) => /^03\d{9}$/.test(p);
