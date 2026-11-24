import Link from "next/link";
import { UserRound, LockKeyhole, ArrowRight, MessageCircle } from "lucide-react";
import { q } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";
import { Flash } from "@/components/ui";
import AuthAside from "@/components/AuthAside";
import { loginAction } from "@/app/actions/public";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const plan = (await q("SELECT * FROM plans WHERE active AND public ORDER BY sort, id LIMIT 1"))[0];
  const wa = String(s.support_whatsapp).replace(/\D/g, "");

  return (
    <div className="grid min-h-[calc(100vh-68px)] grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <AuthAside
        title={
          <>
            Welcome back to your <span className="grad-text">business dashboard</span>
          </>
        }
        sub="Track your team, see today's pairs, manage your wallets and request withdrawals — all in one place."
        points={[
          "Live Left & Right team tree",
          "Earning wallet and E-Pin wallet",
          "Withdraw to JazzCash, EasyPaisa or bank",
          "Training academy & rank rewards",
        ]}
        stats={
          plan
            ? [
                { label: "Package price", value: money(plan.price, s.currency) },
                { label: "First pair bonus", value: money(plan.direct_pair_bonus, s.currency) },
                { label: "Per team pair", value: money(plan.indirect_pair_bonus, s.currency) },
                { label: "Daily earning limit", value: plan.daily_cap_amount > 0 ? money(plan.daily_cap_amount, s.currency) : "No limit" },
              ]
            : []
        }
      />

      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[28px] font-bold tracking-[-0.03em]">Log in</h1>
          <p className="mt-1.5 text-[14.5px] text-mute">Members and admins sign in here.</p>

          <div className="mt-7">
            <Flash sp={sp} />
          </div>

          <form action={loginAction} className="space-y-5">
            <label className="block">
              <span className="lbl">Member ID or mobile number</span>
              <span className="relative block">
                <UserRound size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  className="inp h-12 pl-11 text-[15px]"
                  name="id"
                  required
                  autoComplete="username"
                  placeholder="ESN10001 or 03001234567"
                  autoFocus
                />
              </span>
            </label>
            <label className="block">
              <span className="flex items-center justify-between">
                <span className="lbl">Password</span>
                <a
                  href={wa ? `https://wa.me/${wa}?text=${encodeURIComponent("Hi, I forgot my ESN password. My ID is: ")}` : "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="mb-1.5 text-[12.5px] font-medium text-acc hover:underline"
                >
                  Forgot password?
                </a>
              </span>
              <span className="relative block">
                <LockKeyhole size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mute" />
                <input
                  className="inp h-12 pl-11 text-[15px]"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  placeholder="Your password"
                />
              </span>
            </label>
            <button className="btn btn-acc btn-lg w-full">
              Log in <ArrowRight size={17} />
            </button>
          </form>

          <div className="my-8 flex items-center gap-4 text-[12.5px] text-mute">
            <span className="h-px flex-1 bg-line" /> New to {s.site_short}? <span className="h-px flex-1 bg-line" />
          </div>
          <Link href="/register" className="btn btn-ghost btn-lg w-full">
            Create an account
          </Link>

          <div className="mt-8 flex items-start gap-3 rounded-xl border border-line bg-panel p-4 text-[13px] text-mute">
            <MessageCircle size={18} className="mt-0.5 shrink-0 text-acc" />
            <span>
              Forgot your password or need help? Contact the office on{" "}
              <span className="text-fg">{s.support_phone}</span> and we&apos;ll reset it for you.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
