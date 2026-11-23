import { requireAdmin } from "@/lib/auth";
import { q, pool } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { getRoot } from "@/lib/engine";
import { money } from "@/lib/fmt";
import { Card, PageHead, Flash, Check } from "@/components/ui";
import { createMemberAction } from "@/app/actions/admin";

export default async function NewMember({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const [plans, products, root] = await Promise.all([
    q("SELECT id, name, price FROM plans WHERE active ORDER BY sort, id"),
    q("SELECT id, name FROM products WHERE is_package AND active ORDER BY sort, id"),
    getRoot(pool()),
  ]);

  return (
    <>
      <PageHead
        title="Add Member / Company Top IDs"
        sub={`Register a member from the office, or create company master IDs at the top of the tree (Level 0 / Level 1). Current top ID: ${root ? root.code : "none"}.`}
      />
      <Flash sp={sp} />
      <Card>
        <form action={createMemberAction} className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block">
              <span className="lbl">Full name</span>
              <input className="inp" name="name" required />
            </label>
            <label className="block">
              <span className="lbl">Mobile (not needed for company IDs)</span>
              <input className="inp" name="phone" inputMode="tel" />
            </label>
            <label className="block">
              <span className="lbl">CNIC (optional)</span>
              <input className="inp" name="cnic" />
            </label>
            <label className="block">
              <span className="lbl">City</span>
              <input className="inp" name="city" />
            </label>
            <label className="block">
              <span className="lbl">Address</span>
              <input className="inp" name="address" />
            </label>
            <label className="block">
              <span className="lbl">Login password</span>
              <input className="inp" name="password" type="text" minLength={8} required />
            </label>
            <label className="block">
              <span className="lbl">Plan</span>
              <select className="inp" name="plan_id">
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {money(p.price, s.currency)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">Product</span>
              <select className="inp" name="product_id">
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="lbl">Sponsor ID (optional)</span>
              <input className="inp uppercase" name="sponsor" placeholder={root?.code ?? "ESN10001"} />
            </label>
            <label className="block">
              <span className="lbl">Side</span>
              <select className="inp" name="leg">
                <option value="L">Left</option>
                <option value="R">Right</option>
              </select>
            </label>
            <label className="block">
              <span className="lbl">Exact placement parent (optional)</span>
              <input className="inp uppercase" name="parent" placeholder="Parent ID, or TOP for the root" />
              <span className="mt-1 block text-[11px] text-mute">Empty = automatic placement / spillover under sponsor.</span>
            </label>
            <label className="block">
              <span className="lbl">Activation</span>
              <select className="inp" name="activation" defaultValue="cash">
                <option value="none">Do not activate (member enters E-Pin later)</option>
                <option value="cash">Activate now — cash received (invoice + order)</option>
                <option value="company">Activate as company ID (no sale, no invoice)</option>
              </select>
            </label>
          </div>
          <Check name="is_company" label="This is a company master ID" />
          <button className="btn btn-acc px-8">Create member</button>
        </form>
      </Card>
    </>
  );
}
