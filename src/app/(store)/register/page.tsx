import Link from "next/link";
import { q, one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";
import { Flash } from "@/components/ui";
import RegisterWizard from "@/components/RegisterWizard";

export const metadata = { title: "Create account" };

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
    <div className="px-4 py-10 sm:py-14">
      <div className="mx-auto w-full max-w-[520px]">
        <h1 className="text-[26px] font-bold tracking-[-0.03em] sm:text-[28px]">Create your account</h1>
        <p className="mt-1.5 text-[14.5px] text-mute">
          Takes 2 minutes. Already a member?{" "}
          <Link href="/login" className="font-semibold text-acc hover:underline">
            Log in
          </Link>
        </p>
        <div className="mt-6">
          <Flash sp={sp} />
        </div>
        <RegisterWizard
          plans={plans.map((p) => ({ id: p.id, name: p.name, price: m(p.price) }))}
          products={products.map((p) => ({
            id: p.id,
            name: p.name,
            category: p.category,
            image: p.image_url || "/products/earbuds.webp",
          }))}
          planId={sp.plan}
          productId={sp.product}
          sponsor={sponsor ? { code: String(sponsor.code), name: String(sponsor.name) } : null}
          refCode={ref}
          leg={leg}
          requireSponsor={!!s.require_sponsor}
          requireCnic={!!s.require_cnic}
        />
      </div>
    </div>
  );
}
