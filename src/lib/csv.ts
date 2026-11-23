export function toCsv(rows: Record<string, unknown>[], cols: [string, string][]): string {
  const esc = (v: unknown) => {
    let s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
    // prevent CSV formula injection in Excel
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(([, h]) => esc(h)).join(","), ...rows.map((r) => cols.map(([k]) => esc(r[k])).join(","))].join("\n");
}

export function csvResponse(name: string, body: string) {
  return new Response("﻿" + body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
