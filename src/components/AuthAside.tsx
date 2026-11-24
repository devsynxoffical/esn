/** Branded left panel for the login page: a headline and one dashboard preview. */
export default function AuthAside({ title, sub }: { title: React.ReactNode; sub: string }) {
  return (
    <aside className="relative hidden overflow-hidden border-r border-line bg-side lg:flex lg:flex-col">
      <div className="pointer-events-none absolute inset-0 [background:radial-gradient(70%_50%_at_30%_10%,rgba(249,115,22,0.2),transparent_70%)]" />
      <div className="relative flex flex-1 flex-col justify-center gap-10 px-12 py-14 xl:px-16">
        <div>
          <h2 className="max-w-md text-[36px] font-bold leading-[1.1] tracking-[-0.035em] xl:text-[40px]">{title}</h2>
          <p className="mt-4 max-w-sm text-[15.5px] leading-relaxed text-mute">{sub}</p>
        </div>
        <div className="max-w-[560px] overflow-hidden rounded-xl border border-white/10 shadow-2xl shadow-black/50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/showcase/dashboard.webp" alt="ESN member dashboard" className="block w-full" />
        </div>
      </div>
    </aside>
  );
}
