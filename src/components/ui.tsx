import Link from "next/link";

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
    <section className={`min-w-0 rounded-xl border border-line bg-panel ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-sm font-bold">{title}</h2>
          {action && <div className="text-xs font-semibold text-acc">{action}</div>}
        </header>
      )}
      <div className={pad ? "p-4" : ""}>{children}</div>
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
    <div className={`min-w-0 rounded-xl border p-4 ${hero ? "grad border-transparent text-white" : "border-line bg-panel"}`}>
      <div className={`text-[10.5px] font-semibold uppercase tracking-wider ${hero ? "text-white/85" : "text-mute"}`}>
        {label}
      </div>
      <div className="mt-1 text-xl font-extrabold leading-tight sm:text-[22px]">{value}</div>
      {sub != null && <div className={`mt-1 text-[11px] ${hero ? "text-white/90" : toneCls}`}>{sub}</div>}
    </div>
  );
}

const BADGE: Record<string, string> = {
  ok: "bg-ok/15 text-ok",
  warn: "bg-warn/15 text-warn",
  bad: "bg-bad/15 text-bad",
  acc: "bg-acc/15 text-acc",
  mute: "bg-line text-mute",
};
const STATUS_TONE: Record<string, keyof typeof BADGE> = {
  active: "ok",
  paid: "ok",
  used: "mute",
  unused: "ok",
  delivered: "ok",
  approved: "ok",
  cash_paid: "ok",
  gift_delivered: "ok",
  inactive: "warn",
  pending: "warn",
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
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold capitalize ${BADGE[t]}`}>
      {String(children).replace(/_/g, " ")}
    </span>
  );
}

export function Flash({ sp }: { sp: { ok?: string; err?: string } }) {
  if (!sp.ok && !sp.err) return null;
  return (
    <div
      role="status"
      className={`mb-4 rounded-lg border px-4 py-3 text-sm font-medium ${
        sp.err ? "border-bad/40 bg-bad/10 text-bad" : "border-ok/40 bg-ok/10 text-ok"
      }`}
    >
      {sp.err ?? sp.ok}
    </div>
  );
}

export function PageHead({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
        {sub && <p className="mt-1 text-sm text-mute">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Progress({ pct, className = "" }: { pct: number; className?: string }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-line ${className}`}>
      <div className="grad h-full rounded-full" style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
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
      {help && <span className="mt-1 block text-[11px] text-mute">{help}</span>}
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

export function Check({ label, name, defaultChecked }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-[#f97316]" />
      {label}
    </label>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-8 text-center text-sm text-mute">{children}</div>;
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4">
      <table className="tbl">{children}</table>
    </div>
  );
}

export function Pager({ page, hasMore, base }: { page: number; hasMore: boolean; base: string }) {
  const sep = base.includes("?") ? "&" : "?";
  return (
    <div className="mt-4 flex justify-end gap-2">
      {page > 1 && (
        <Link className="btn btn-ghost btn-sm" href={`${base}${sep}page=${page - 1}`}>
          ← Prev
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

export function Logo({ short = "ESN", name }: { short?: string; name?: string }) {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grad grid h-9 w-9 place-items-center rounded-xl text-[11px] font-black tracking-tight text-white">{short.slice(0, 3)}</span>
      {name && <span className="text-base font-extrabold leading-tight">{name}</span>}
    </span>
  );
}
