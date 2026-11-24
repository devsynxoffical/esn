import Link from "next/link";
import { Check, Info, ArrowRight, UserCheck } from "lucide-react";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";
import { Flash } from "@/components/ui";
import AuthAside from "@/components/AuthAside";
import { registerAction } from "@/app/actions/public";

export const metadata = { title: "Create account" };

function Step({ n, title, sub, children }: { n: number; title: string; sub?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-5 sm:p-6">
      <div className="mb-5 flex items-start gap-3">
        <span className="grad grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[13px] font-bold text-white">{n}</span>
        <div>
          <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
          {sub && <p className="mt-0.5 text-[13px] text-mute">{sub}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Input({
  label,
  name,
  type = "text",
  required,
  placeholder,
  autoComplete,
  inputMode,
  defaultValue,
  minLength,
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: "tel" | "numeric" | "email" | "text";
  defaultValue?: string;
  minLength?: number;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="lbl">
        {label}
        {required ? <span className="text-acc"> *</span> : <span className="text-mute/70"> (optional)</span>}
      </span>
      <input
        className="inp h-11"
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        defaultValue={defaultValue}
        minLength={minLength}
      />
    </label>
  );
}

export default async function Register({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string; leg?: string; plan?: string; product?: string; ok?: string; err?: string }>;
}) {
  const sp = await searchParams;
  const s = await getSettings();
  const [plans, products] = await Promise.all([
    q("SELECT * FROM plans WHERE active AND public ORDER BY sort, id"),
    q("SELECT * FROM products WHERE is_package AND active ORDER BY sort, id"),
  ]);
  const ref = (sp.ref || "").toUpperCase();
  const sponsor = ref ? await one("SELECT code, name FROM users WHERE upper(code) = $1 AND role = 'member'", [ref]) : null;
  const leg = sp.leg === "R" ? "R" : "L";
  const m = (n: number) => money(n, s.currency);

  if (!s.allow_registration) {
    return (
      <div className="mx-auto max-w-lg px-5 py-24 text-center">
        <h1 className="text-[28px] font-bold tracking-[-0.03em]">Registration is closed</h1>
        <p className="mt-2 text-mute">Please contact the office: {s.support_phone}</p>
      </div>
    );
  }

  return (
    <div className="grid min-h-[calc(100vh-68px)] grid-cols-1 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="hidden border-r border-line bg-side lg:block">
        <div className="sticky top-[68px] flex h-[calc(100vh-68px)]">
          <div className="grid w-full">
            <AuthAside
              title={
                <>
                  Start your business with <span className="grad-text">one product</span>
                </>
              }
              sub="Create your account in two minutes. Pay at the office, enter your E-Pin and your business ID goes live instantly."
              points={[
                "Original Watch or Handsfree delivered to you",
                "Your own Left & Right referral links",
                base(plans) ? `First pair bonus ${m(base(plans)!.direct_pair_bonus)}, then ${m(base(plans)!.indirect_pair_bonus)} per team pair` : "Earn on every matched pair",
                "Training academy with ready-made scripts",
              ]}
              stats={
                plans[0]
                  ? [
                      { label: "Package price", value: m(plans[0].price) },
                      { label: "First pair bonus", value: m(plans[0].direct_pair_bonus) },
                      { label: "Per team pair", value: m(plans[0].indirect_pair_bonus) },
                      { label: "Daily earning limit", value: plans[0].daily_cap_amount > 0 ? m(plans[0].daily_cap_amount) : "No limit" },
                    ]
                  : []
              }
            />
          </div>
        </div>
      </div>

      <div className="min-w-0 px-4 py-10 sm:px-10 sm:py-12">
        <div className="mx-auto w-full max-w-[640px]">
          <h1 className="text-[28px] font-bold tracking-[-0.03em]">Create your account</h1>
          <p className="mt-1.5 text-[14.5px] text-mute">
            Already a member?{" "}
            <Link href="/login" className="font-semibold text-acc hover:underline">
              Log in
            </Link>
          </p>

          <div className="mt-6">
            <Flash sp={sp} />
          </div>

          <div className="mb-5 flex items-start gap-3 rounded-xl border border-line bg-panel px-4 py-3.5 text-[13.5px] text-mute">
            <Info size={18} className="mt-0.5 shrink-0 text-acc" />
            <span>
              Your ID stays <b className="text-fg">inactive</b> until you enter the 16-digit E-Pin you receive from the office after
              payment.
            </span>
          </div>

          <form action={registerAction} className="space-y-5">
            <Step n={1} title="Sponsor & side" sub="Who invited you, and which side of their team you join.">
              {sponsor && (
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-acc/30 bg-acc/[0.07] p-3.5">
                  <span className="grad grid h-10 w-10 shrink-0 place-items-center rounded-full font-bold text-white">
                    {String(sponsor.name).charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[14px] font-semibold">{sponsor.name}</div>
                    <div className="text-[12.5px] text-mute">Sponsor · {sponsor.code}</div>
                  </div>
                  <UserCheck size={18} className="text-ok" />
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="lbl">
                    Sponsor ID{s.require_sponsor ? <span className="text-acc"> *</span> : <span className="text-mute/70"> (optional)</span>}
                  </span>
                  <input className="inp h-11 uppercase" name="ref" defaultValue={ref} placeholder="ESN10001" required={!!s.require_sponsor} />
                </label>
                <div>
                  <span className="lbl">Side</span>
                  <div className="grid h-11 grid-cols-2 gap-1 rounded-[10px] border border-line bg-[#0f141a] p-1">
                    {[
                      ["L", "Left"],
                      ["R", "Right"],
                    ].map(([v, l]) => (
                      <label
                        key={v}
                        className="grid cursor-pointer place-items-center rounded-lg text-[13.5px] font-semibold text-mute transition has-[:checked]:bg-acc has-[:checked]:text-white"
                      >
                        <input type="radio" name="leg" value={v} defaultChecked={leg === v} className="sr-only" />
                        {l}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </Step>

            <Step n={2} title="Choose your plan">
              <div className={`grid gap-3 ${plans.length >= 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
                {plans.map((p, i) => (
                  <label
                    key={p.id}
                    className="relative flex cursor-pointer flex-col rounded-xl border border-line bg-bg/40 p-4 transition hover:border-acc/40 has-[:checked]:border-acc has-[:checked]:bg-acc/[0.07]"
                  >
                    <input
                      type="radio"
                      name="plan_id"
                      value={p.id}
                      defaultChecked={sp.plan ? String(p.id) === sp.plan : i === 0}
                      className="peer sr-only"
                    />
                    <span className="absolute right-3 top-3 hidden h-5 w-5 place-items-center rounded-full bg-acc text-white peer-checked:grid">
                      <Check size={12} strokeWidth={3} />
                    </span>
                    <span className="pr-6 text-[14px] font-semibold leading-snug">{p.name}</span>
                    <span className="num mt-2 text-[20px] font-bold tracking-[-0.02em]">{m(p.price)}</span>
                    <span className="mt-1 text-[12px] text-mute">
                      {m(p.direct_pair_bonus)} first pair · {m(p.indirect_pair_bonus)}/pair
                    </span>
                  </label>
                ))}
              </div>
            </Step>

            <Step n={3} title="Choose your product" sub="Included in your package and delivered to your address.">
              <div className="grid gap-3 sm:grid-cols-2">
                {products.map((p, i) => (
                  <label
                    key={p.id}
                    className="relative flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-bg/40 p-2.5 pr-10 transition hover:border-acc/40 has-[:checked]:border-acc has-[:checked]:bg-acc/[0.07]"
                  >
                    <input
                      type="radio"
                      name="product_id"
                      value={p.id}
                      defaultChecked={sp.product ? String(p.id) === sp.product : i === 0}
                      className="peer sr-only"
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.image_url || "/products/earbuds.webp"} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-semibold">{p.name}</span>
                      <span className="block text-[12px] text-mute">{p.category}</span>
                    </span>
                    <span className="absolute right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-acc text-white peer-checked:grid">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  </label>
                ))}
              </div>
            </Step>

            <Step n={4} title="Your details" sub="Used for your account, delivery and payouts.">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Full name" name="name" required autoComplete="name" placeholder="As on your CNIC" />
                <Input label="Mobile number" name="phone" required inputMode="tel" placeholder="03001234567" autoComplete="tel" />
                <Input label="CNIC" name="cnic" required={!!s.require_cnic} inputMode="numeric" placeholder="35202-1234567-1" />
                <Input label="Email" name="email" type="email" autoComplete="email" placeholder="you@example.com" />
                <Input label="City" name="city" required placeholder="Lahore" />
                <Input label="Delivery address" name="address" required autoComplete="street-address" placeholder="House, street, area" />
              </div>
            </Step>

            <Step n={5} title="Secure your account">
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
                <Input label="Confirm password" name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Repeat password" />
              </div>
            </Step>

            <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-mute">
              <input type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#f97316]" />
              <span>
                I agree to the{" "}
                <Link href="/terms" className="font-medium text-acc hover:underline">
                  terms & privacy policy
                </Link>{" "}
                and confirm my details are correct.
              </span>
            </label>
            <button className="btn btn-acc btn-lg w-full">
              Create my account <ArrowRight size={17} />
            </button>
            <p className="text-center text-[13.5px] text-mute">
              Already registered?{" "}
              <Link href="/login" className="font-semibold text-acc hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

function base<T>(plans: T[]): T | undefined {
  return plans[0];
}
