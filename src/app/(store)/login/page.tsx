import Link from "next/link";
import { Flash } from "@/components/ui";
import { loginAction } from "@/app/actions/public";

export const metadata = { title: "Login" };

export default async function Login({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-2xl font-black">Login</h1>
      <p className="mt-1 text-sm text-mute">Members and admins log in here.</p>
      <div className="mt-5">
        <Flash sp={sp} />
      </div>
      <form action={loginAction} className="space-y-4 rounded-2xl border border-line bg-panel p-6">
        <label className="block">
          <span className="lbl">Member ID or mobile number</span>
          <input className="inp" name="id" required autoComplete="username" placeholder="ESN10001 or 03001234567" />
        </label>
        <label className="block">
          <span className="lbl">Password</span>
          <input className="inp" name="password" type="password" required autoComplete="current-password" />
        </label>
        <button className="btn btn-acc w-full py-3">Login</button>
        <p className="text-center text-sm text-mute">
          New here?{" "}
          <Link href="/register" className="font-semibold text-acc">
            Create an account
          </Link>
          <br />
          Forgot password? Contact the office to reset it.
        </p>
      </form>
    </div>
  );
}
