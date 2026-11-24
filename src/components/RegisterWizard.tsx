"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, UserCheck } from "lucide-react";
import { registerAction } from "@/app/actions/public";

type Plan = { id: number; name: string; price: string };
type Product = { id: number; name: string; category: string; image: string };

const STEPS = ["Package", "Sponsor", "Details", "Password"];

function Field({
  label,
  optional,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; optional?: boolean }) {
  return (
    <label className="block">
      <span className="lbl">
        {label}
        {optional && <span className="text-mute/70"> (optional)</span>}
      </span>
      <input className="inp h-11" {...rest} />
    </label>
  );
}

export default function RegisterWizard({
  plans,
  products,
  planId,
  productId,
  sponsor,
  refCode,
  leg,
  requireSponsor,
  requireCnic,
}: {
  plans: Plan[];
  products: Product[];
  planId?: string;
  productId?: string;
  sponsor: { code: string; name: string } | null;
  refCode: string;
  leg: "L" | "R";
  requireSponsor: boolean;
  requireCnic: boolean;
}) {
  const [step, setStep] = useState(0);
  const panels = useRef<(HTMLDivElement | null)[]>([]);
  const last = STEPS.length - 1;

  function next() {
    const panel = panels.current[step];
    if (panel) {
      for (const el of Array.from(panel.querySelectorAll<HTMLInputElement>("input"))) {
        if (!el.checkValidity()) {
          el.reportValidity();
          return;
        }
      }
    }
    setStep((s) => Math.min(s + 1, last));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const show = (i: number) => (step === i ? "space-y-4" : "hidden");
  const choice =
    "relative flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-bg/40 p-3 pr-10 transition hover:border-acc/40 has-[:checked]:border-acc has-[:checked]:bg-acc/[0.07]";
  const tick = (
    <span className="absolute right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 place-items-center rounded-full bg-acc text-white peer-checked:grid">
      <Check size={12} strokeWidth={3} />
    </span>
  );

  return (
    <form
      action={registerAction}
      onKeyDown={(e) => {
        if (e.key === "Enter" && step < last && (e.target as HTMLElement).tagName === "INPUT") {
          e.preventDefault();
          next();
        }
      }}
    >
      {/* progress */}
      <ol className="mb-6 grid grid-cols-4 gap-2">
        {STEPS.map((t, i) => (
          <li key={t}>
            <div className={`h-1.5 rounded-full ${i <= step ? "grad" : "bg-line"}`} />
            <div className={`mt-2 text-[12px] font-medium ${i === step ? "text-fg" : "text-mute"}`}>
              <span className="hidden sm:inline">{i + 1}. </span>
              {t}
            </div>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-line bg-panel p-5 sm:p-7">
        {/* 1. package */}
        <div ref={(el) => { panels.current[0] = el; }} className={show(0)}>
          <h2 className="text-[17px] font-semibold">Choose your package</h2>
          <div className="space-y-2">
            <span className="lbl">Plan</span>
            {plans.map((p, i) => (
              <label key={p.id} className={choice}>
                <input
                  type="radio"
                  name="plan_id"
                  value={p.id}
                  defaultChecked={planId ? String(p.id) === planId : i === 0}
                  className="peer sr-only"
                />
                <span className="flex-1 text-[14px] font-semibold">{p.name}</span>
                <span className="num text-[14px] font-bold">{p.price}</span>
                {tick}
              </label>
            ))}
          </div>
          <div className="space-y-2">
            <span className="lbl">Product delivered to you</span>
            <div className="grid gap-2 sm:grid-cols-2">
              {products.map((p, i) => (
                <label key={p.id} className={choice}>
                  <input
                    type="radio"
                    name="product_id"
                    value={p.id}
                    defaultChecked={productId ? String(p.id) === productId : i === 0}
                    className="peer sr-only"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-semibold leading-snug">{p.name}</span>
                    <span className="block text-[12px] text-mute">{p.category}</span>
                  </span>
                  {tick}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* 2. sponsor */}
        <div ref={(el) => { panels.current[1] = el; }} className={show(1)}>
          <h2 className="text-[17px] font-semibold">Who invited you?</h2>
          {sponsor && (
            <div className="flex items-center gap-3 rounded-xl border border-acc/30 bg-acc/[0.07] p-3">
              <span className="grad grid h-9 w-9 shrink-0 place-items-center rounded-full font-bold text-white">
                {sponsor.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[14px] font-semibold">{sponsor.name}</div>
                <div className="text-[12.5px] text-mute">Sponsor · {sponsor.code}</div>
              </div>
              <UserCheck size={18} className="text-ok" />
            </div>
          )}
          <label className="block">
            <span className="lbl">
              Sponsor ID{!requireSponsor && <span className="text-mute/70"> (optional)</span>}
            </span>
            <input className="inp h-11 uppercase" name="ref" defaultValue={refCode} placeholder="ESN10001" required={requireSponsor} />
          </label>
          <div>
            <span className="lbl">Join on side</span>
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
          <p className="text-[12.5px] text-mute">No sponsor? Leave it empty and the company will place you.</p>
        </div>

        {/* 3. details */}
        <div ref={(el) => { panels.current[2] = el; }} className={show(2)}>
          <h2 className="text-[17px] font-semibold">Your details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" name="name" required autoComplete="name" placeholder="As on your CNIC" />
            <Field label="Mobile number" name="phone" required inputMode="tel" autoComplete="tel" placeholder="03001234567" />
            <Field label="CNIC" name="cnic" required={requireCnic} optional={!requireCnic} inputMode="numeric" placeholder="35202-1234567-1" />
            <Field label="City" name="city" required placeholder="Lahore" />
          </div>
          <Field label="Delivery address" name="address" required autoComplete="street-address" placeholder="House, street, area" />
          <Field label="Email" name="email" type="email" optional autoComplete="email" placeholder="you@example.com" />
        </div>

        {/* 4. password */}
        <div ref={(el) => { panels.current[3] = el; }} className={show(3)}>
          <h2 className="text-[17px] font-semibold">Set your password</h2>
          <Field label="Password" name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="At least 8 characters" />
          <Field label="Confirm password" name="confirm" type="password" required minLength={8} autoComplete="new-password" placeholder="Repeat password" />
          <label className="flex cursor-pointer items-start gap-3 text-[13.5px] text-mute">
            <input type="checkbox" required className="mt-0.5 h-4 w-4 shrink-0 accent-[#f97316]" />
            <span>
              I agree to the{" "}
              <Link href="/terms" className="font-medium text-acc hover:underline">
                terms & privacy policy
              </Link>
              .
            </span>
          </label>
          <p className="rounded-lg bg-bg/50 px-3 py-2.5 text-[12.5px] text-mute">
            After signing up, pay at the office to get your 16-digit E-Pin. Enter it in your dashboard to activate your ID.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className="btn h-12 px-4">
              <ArrowLeft size={17} />
              <span className="sr-only sm:not-sr-only">Back</span>
            </button>
          )}
          {step < last ? (
            <button type="button" onClick={next} className="btn btn-acc h-12 flex-1">
              Continue <ArrowRight size={17} />
            </button>
          ) : (
            <button type="submit" className="btn btn-acc h-12 flex-1">
              Create my account <ArrowRight size={17} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
