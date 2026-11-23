import { Check } from "lucide-react";

/** Branded left panel used by the login and register pages. */
export default function AuthAside({
  title,
  sub,
  points,
  stats,
}: {
  title: React.ReactNode;
  sub: string;
  points: string[];
  stats: { label: string; value: string }[];
}) {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-side lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(70%_50%_at_30%_10%,rgba(249,115,22,0.22),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] [background-size:48px_48px] [mask-image:radial-gradient(80%_70%_at_30%_20%,black,transparent)]" />
      <div className="relative flex flex-1 flex-col px-12 py-14 xl:px-16">
        <h2 className="max-w-md text-[34px] font-bold leading-[1.1] tracking-[-0.035em] xl:text-[40px]">{title}</h2>
        <p className="mt-4 max-w-md text-[15.5px] leading-relaxed text-mute">{sub}</p>
        <ul className="mt-8 space-y-3.5">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[14.5px]">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ok/15 text-ok">
                <Check size={13} strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        <div className="mt-auto max-w-md pt-12">
          <div className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-2xl shadow-black/40">
            {stats.map((st) => (
              <div key={st.label} className="bg-panel/95 px-5 py-4">
                <div className="num text-[20px] font-bold tracking-[-0.02em]">{st.value}</div>
                <div className="text-[12.5px] text-mute">{st.label}</div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-mute">Secure login · Your data is never shared · Support from our office team</p>
        </div>
      </div>
    </aside>
  );
}
