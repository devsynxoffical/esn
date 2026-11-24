import Link from "next/link";
import ResponsiveTable from "./ResponsiveTable";

export function Card({
  title,
  action,
  children,
  className = "",
  pad = true,
}: {
  title?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  pad?: boolean;
}) {
  return (
    <section className={`min-w-0 rounded-xl border border-line bg-panel ${pad ? "p-5" : ""} ${className}`}>
      {(title || action) && (
        <header className={`flex items-center justify-between gap-3 ${pad ? "mb-4" : "px-5 pb-3 pt-5"}`}>
          <h2 className="text-[15px] font-semibold tracking-[-0.01em]">{title}</h2>
          {action && <div className="text-[13px] font-medium text-acc [&_a:hover]:underline">{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  sub,
  hero = false,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  hero?: boolean;
  tone?: "ok" | "warn" | "bad";
}) {
  const toneCls = tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : tone === "bad" ? "text-bad" : "text-mute";
  return (
    <div
      className={`min-w-0 rounded-xl border px-5 py-4 ${
        hero ? "grad border-transparent text-white shadow-[0_8px_30px_-12px_rgba(249,115,22,0.6)]" : "border-line bg-panel"
      }`}
    >
      <div className={`line-clamp-2 text-[11px] font-semibold uppercase leading-snug tracking-[0.06em] sm:truncate ${hero ? "text-white/90" : "text-mute"}`}>
        {label}
      </div>
      <div className="num mt-1.5 truncate text-[19px] font-bold leading-tight tracking-[-0.02em] sm:text-[22px]">{value}</div>
      {sub != null && <div className={`mt-1 truncate text-[12px] ${hero ? "text-white/90" : toneCls}`}>{sub}</div>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/15 text-bad",
  acc: "bg-acc/15 text-acc",
  mute: "bg-white/5 text-mute",
};
const STATUS_TONE: Record<string, keyof typeof BADGE> = {
  active: "ok",
  paid: "ok",
  done: "ok",
  used: "mute",
  unused: "ok",
  delivered: "ok",
  approved: "ok",
  cash_paid: "ok",
  gift_delivered: "ok",
  inactive: "warn",
  pending: "warn",
  new: "acc",
  dispatched: "acc",
  choose: "acc",
  gift_pending: "warn",
  blocked: "bad",
  rejected: "bad",
  revoked: "bad",
  flushed: "bad",
  cancelled: "bad",
};

export function Badge({ children, tone }: { children: React.ReactNode; tone?: keyof typeof BADGE }) {
  const t = tone ?? STATUS_TONE[String(children).toLowerCase()] ?? "mute";
  const text = String(children).replace(/_/g, " ");
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-md px-2 py-0.5 text-[11px] font-semibold ${BADGE[t]}`}>
      {text.charAt(0).toUpperCase() + text.slice(1)}
    </span>
  );
}

export function Flash({ sp }: { sp: { ok?: string; err?: string } }) {
  if (!sp.ok && !sp.err) return null;
  return (
    <div
      role="status"
      className={`mb-5 flex items-start gap-3 rounded-xl border px-4 py-3 text-[13.5px] font-medium ${
        sp.err ? "border-bad/30 bg-bad/10 text-bad" : "border-ok/30 bg-ok/10 text-ok"
      }`}
    >
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${sp.err ? "bg-bad" : "bg-ok"}`} />
      {sp.err ?? sp.ok}
    </div>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-[22px] font-bold tracking-[-0.02em]">{title}</h1>
        {sub && <p className="mt-1 max-w-3xl text-[13.5px] text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Progress({ pct, className = "", tone }: { pct: number; className?: string; tone?: "bad" }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div
        className={`h-full rounded-full ${tone === "bad" ? "bg-bad" : "grad"}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </div>
  );
}

export function Field({
  label,
  name,
  type = "text",
  defaultValue,
  placeholder,
  required,
  help,
  step,
  min,
  className = "",
  autoComplete,
  inputMode,
  maxLength,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string | number | null;
  placeholder?: string;
  required?: boolean;
  help?: string;
  step?: string;
  min?: string | number;
  className?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "decimal" | "tel" | "text" | "email";
  maxLength?: number;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="lbl">{label}</span>
      <input
        className="inp"
        name={name}
        type={type}
        defaultValue={defaultValue ?? undefined}
        placeholder={placeholder}
        required={required}
        step={step}
        min={min}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
      />
      {help && <span className="mt-1.5 block text-[12px] text-mute">{help}</span>}
    </label>
  );
}

export function Select({
  label,
  name,
  options,
  defaultValue,
  required,
  className = "",
}: {
  label: string;
  name: string;
  options: { value: string | number; label: string }[];
  defaultValue?: string | number | null;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="lbl">{label}</span>
      <select className="inp" name={name} defaultValue={defaultValue ?? undefined} required={required}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Toggle switch styled like the reference. Submits "on" when checked. */
export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 text-[13.5px]">
      <span>{label}</span>
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="switch" />
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center text-[13.5px] text-mute">{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return <ResponsiveTable>{children}</ResponsiveTable>;
}

export function Pager({ page, hasMore, base }: { page: number; hasMore: boolean; base: string }) {
  if (page <= 1 && !hasMore) return null;
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="mt-4 flex justify-end gap-2">
      {page > 1 && (
        <Link className="btn btn-ghost btn-sm" href={`${base}${sep}page=${page - 1}`}>
          ← Previous
        </Link>
      )}
      {hasMore && (
        <Link className="btn btn-ghost btn-sm" href={`${base}${sep}page=${page + 1}`}>
          Next →
        </Link>
      )}
    </div>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <span className="grad inline-grid shrink-0 place-items-center rounded-[10px]" style={{ width: size, height: size }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M5 19 12 5l7 14" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8.5 13.5h7" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function Logo({ name }: { short?: string; name?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      {name && <span className="text-[17px] font-bold tracking-[-0.02em]">{name}</span>}
    </span>
  );
}

/** Vertical bar chart. Bars alternate acc / acc2 like the reference. */
export function Bars({
  data,
  height = 140,
  format = (n: number) => String(n),
}: {
  data: { label: string; value: number }[];
  height?: number;
  format?: (n: number) => string;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div>
      <div className="flex items-end gap-[6px]" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="group relative flex h-full flex-1 flex-col justify-end">
            <div
              className={`w-full rounded-t-[3px] ${i % 2 ? "bg-acc2" : "bg-acc"} transition-opacity group-hover:opacity-80`}
              style={{ height: `${Math.max(d.value > 0 ? 3 : 1.5, (d.value / max) * 100)}%` }}
            />
            <span className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-black/80 px-1.5 py-0.5 text-[11px] group-hover:block">
              {format(d.value)}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 flex gap-[6px]">
        {data.map((d, i) => (
          <span key={i} className="flex-1 truncate text-center text-[11px] text-mute">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
}

const DONUT_COLORS = ["#f97316", "#fb923c", "#3fb950", "#d29922", "#58a6ff"];

/** Donut chart with legend. */
export function Donut({ data, format }: { data: { label: string; value: number }[]; format: (n: number) => string }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="flex flex-col items-center gap-5 sm:flex-row sm:gap-6">
      <svg width="112" height="112" viewBox="0 0 112 112" className="shrink-0 -rotate-90">
        <circle cx="56" cy="56" r={r} fill="none" stroke="#262d37" strokeWidth="16" />
        {total > 0 &&
          data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <circle
                key={i}
                cx="56"
                cy="56"
                r={r}
                fill="none"
                stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                strokeWidth="16"
                strokeDasharray={`${len} ${c - len}`}
                strokeDashoffset={-off}
              />
            );
            off += len;
            return el;
          })}
      </svg>
      <ul className="min-w-0 space-y-2 text-[13px]">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
            <span className="font-semibold">{d.label}</span>
            <span className="num truncate text-mute">
              {format(d.value)} ({total > 0 ? Math.round((d.value / total) * 100) : 0}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Label / value row used inside panels. */
export function Row({ label, value, tone }: { label: React.ReactNode; value: React.ReactNode; tone?: "ok" | "bad" | "warn" }) {
  const c = tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "";
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line py-2.5 text-[13.5px] last:border-0">
      <span className="text-mute">{label}</span>
      <span className={`num font-semibold ${c}`}>{value}</span>
    </div>
  );
}
