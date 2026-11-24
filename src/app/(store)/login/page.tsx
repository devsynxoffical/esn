import Link from "next/link";
import { UserRound, LockKeyhole, ArrowRight } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { Flash } from "@/components/ui";
import AuthAside from "@/components/AuthAside";
import { loginAction } from "@/app/actions/public";

export const metadata = { title: "Log in" };

export default async function Login({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const s = await getSettings();
  const wa = String(s.support_whatsapp).replace(/\D/g, "");

  return (
    <div className="grid min-h-[calc(100vh-68px)] grid-cols-1 lg:grid-cols-[1.05fr_1fr]">
      <AuthAside
        title={
          <>
            Welcome back to your <span className="grad-text">business dashboard</span>
          </>
        }
        sub="Track your team, pairs and wallets in one place."
      />

      <div className="flex items-center justify-center px-5 py-14 sm:px-10">
        <div className="w-full max-w-[420px]">
          <h1 className="text-[28px] font-bold tracking-[-0.03em]">Log in</h1>
          <p className="mt-1.5 text-[14.5px] text-mute">Welcome back. Enter your details to continue.</p>

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

          <p className="mt-8 text-center text-[14px] text-mute">
            New to {s.site_short}?{" "}
            <Link href="/register" className="font-semibold text-acc hover:underline">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
