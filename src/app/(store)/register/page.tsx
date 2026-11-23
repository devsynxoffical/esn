import Link from "next/link";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";
import { Flash } from "@/components/ui";
import { registerAction } from "@/app/actions/public";

export const metadata = { title: "Register" };

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

  if (!s.allow_registration) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-2xl font-black">Registration is closed</h1>
        <p className="mt-2 text-mute">Please contact the office: {s.support_phone}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-black sm:text-3xl">Create your account</h1>
      <p className="mt-1 text-sm text-mute">
        Your ID stays <b>inactive</b> until you enter a 16-digit E-Pin (given by the office after payment).
      </p>
      <div className="mt-5">
        <Flash sp={sp} />
      </div>
      {sponsor && (
        <div className="mb-4 rounded-xl border border-acc/40 bg-acc/10 px-4 py-3 text-sm">
          Sponsor: <b>{sponsor.name}</b> ({sponsor.code}) · Joining on the <b>{leg === "L" ? "Left" : "Right"}</b> side
        </div>
      )}
      <form action={registerAction} className="space-y-5 rounded-2xl border border-line bg-panel p-5 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="lbl">Sponsor ID {s.require_sponsor ? "*" : "(optional)"}</span>
            <input className="inp uppercase" name="ref" defaultValue={ref} placeholder="ESN10001" />
          </label>
          <label className="block">
            <span className="lbl">Side</span>
            <select className="inp" name="leg" defaultValue={leg}>
              <option value="L">Left</option>
              <option value="R">Right</option>
            </select>
          </label>
        </div>

        <div>
          <span className="lbl">Choose your plan</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {plans.map((p, i) => (
              <label key={p.id} className="flex cursor-pointer flex-col rounded-xl border border-line p-3 has-[:checked]:border-acc has-[:checked]:bg-acc/10">
                <input
                  type="radio"
                  name="plan_id"
                  value={p.id}
                  defaultChecked={sp.plan ? String(p.id) === sp.plan : i === 0}
                  className="sr-only"
                />
                <span className="text-sm font-bold">{p.name}</span>
                <span className="text-sm font-extrabold text-acc">{money(p.price, s.currency)}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <span className="lbl">Choose your product</span>
          <div className="grid grid-cols-2 gap-2">
            {products.map((p, i) => (
              <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-line p-2 has-[:checked]:border-acc has-[:checked]:bg-acc/10">
                <input
                  type="radio"
                  name="product_id"
                  value={p.id}
                  defaultChecked={sp.product ? String(p.id) === sp.product : i === 0}
                  className="sr-only"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url || "/products/handsfree.svg"} alt="" className="h-12 w-12 rounded-lg object-cover" />
                <span className="text-sm font-bold leading-tight">{p.name}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="lbl">Full name *</span>
            <input className="inp" name="name" required autoComplete="name" />
          </label>
          <label className="block">
            <span className="lbl">Mobile number *</span>
            <input className="inp" name="phone" required inputMode="tel" placeholder="03001234567" autoComplete="tel" />
          </label>
          <label className="block">
            <span className="lbl">CNIC {s.require_cnic ? "*" : "(optional)"}</span>
            <input className="inp" name="cnic" required={s.require_cnic} inputMode="numeric" placeholder="35202-1234567-1" />
          </label>
          <label className="block">
            <span className="lbl">Email (optional)</span>
            <input className="inp" name="email" type="email" autoComplete="email" />
          </label>
          <label className="block">
            <span className="lbl">City *</span>
            <input className="inp" name="city" required />
          </label>
          <label className="block">
            <span className="lbl">Delivery address *</span>
            <input className="inp" name="address" required autoComplete="street-address" />
          </label>
          <label className="block">
            <span className="lbl">Password * (min 8)</span>
            <input className="inp" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </label>
          <label className="block">
            <span className="lbl">Confirm password *</span>
            <input className="inp" name="confirm" type="password" required minLength={8} autoComplete="new-password" />
          </label>
        </div>
        <label className="flex items-start gap-2 text-sm text-mute">
          <input type="checkbox" required className="mt-1 accent-[#f97316]" />
          <span>
            I agree to the <Link href="/terms" className="text-acc">terms & policy</Link>.
          </span>
        </label>
        <button className="btn btn-acc w-full py-3 text-base">Create Account</button>
        <p className="text-center text-sm text-mute">
          Already registered?{" "}
          <Link href="/login" className="font-semibold text-acc">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
