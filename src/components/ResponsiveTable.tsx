"use client";

import { useEffect, useRef } from "react";

/**
 * Wraps a data table. On phones (see `.tbl-stack` in globals.css) each row becomes a card and
 * each cell shows its column heading as a label. Labels are copied from the <th> cells after
 * mount; tables without a header row keep the normal (horizontally scrollable) layout.
 */
export default function ResponsiveTable({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const table = ref.current;
    if (!table) return;
    const label = () => {
      const heads = Array.from(table.querySelectorAll("thead th")).map((th) => th.textContent?.trim() ?? "");
      if (!heads.length) return;
      table.classList.add("tbl-stack");
      table.querySelectorAll("tbody tr").forEach((tr) => {
        Array.from(tr.children).forEach((td, i) => td.setAttribute("data-label", heads[i] ?? ""));
      });
    };
    label();
    // rows can change after a server action re-renders the table
    const mo = new MutationObserver(label);
    mo.observe(table, { childList: true, subtree: true });
    return () => mo.disconnect();
  }, []);

  return (
    <div className="-mx-5 overflow-x-auto px-5">
      <table ref={ref} className="tbl">
        {children}
      </table>
    </div>
  );
}
