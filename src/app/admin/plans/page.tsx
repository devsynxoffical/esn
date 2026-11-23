import { requireAdmin } from "@/lib/auth";
import { q, type Row } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";
import { Card, PageHead, Flash, Check } from "@/components/ui";
import { savePlanAction } from "@/app/actions/admin";

function PlanForm({ p }: { p?: Row }) {
  const f = (name: string, label: string, help?: string, step = "0.01") => (
    <label className="block">
      <span className="lbl">{label}</span>
      <input className="inp" name={name} type="number" step={step} min={0} defaultValue={p?.[name] ?? 0} required />
      {help && <span className="mt-1 block text-[11px] text-mute">{help}</span>}
    </label>
  );
  return (
    <form action={savePlanAction} className="space-y-4">
      <input type="hidden" name="id" value={p?.id ?? 0} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-2">
          <span className="lbl">Plan name</span>
          <input className="inp" name="name" defaultValue={p?.name ?? ""} required />
        </label>
        {f("sort", "Display order", undefined, "1")}
        <label className="block sm:col-span-3">
          <span className="lbl">Description (shown on website)</span>
          <textarea className="inp" name="description" rows={2} defaultValue={p?.description ?? ""} />
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {f("price", "Package price (investment)")}
        {f("direct_pair_bonus", "Direct pair bonus (1st pair)", "Paid once on 1 Left + 1 Right own direct")}
        {f("indirect_pair_bonus", "Indirect pair bonus (per pair)", "Every 1:1 match after the first pair")}
        {f("direct_referral_bonus", "Direct referral bonus (per direct)", "0 = off. Paid instantly per activated direct")}
        {f("daily_cap_pairs", "Daily capping — max pairs", "0 = no pair limit", "1")}
        {f("daily_cap_amount", "Daily capping — max amount", "0 = no amount limit")}
        {f("monthly_salary", "Manager monthly salary", "Only for manager plans")}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Check name="is_distributor" label="Distributor portal" defaultChecked={p?.is_distributor} />
        <Check name="is_manager" label="Manager portal (salary + pool)" defaultChecked={p?.is_manager} />
        <Check name="public" label="Show at registration" defaultChecked={p ? p.public : true} />
        <Check name="active" label="Active" defaultChecked={p ? p.active : true} />
      </div>
      <button className="btn btn-acc">{p ? "Save plan" : "Create plan"}</button>
    </form>
  );
}

export default async function Plans({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const plans = await q("SELECT * FROM plans ORDER BY sort, id");
  return (
    <>
      <PageHead
        title="Plans & Commissions"
        sub="The 3 plan models. Edit price (investment), direct & indirect pair bonus, daily capping and salary. Changes apply to new pairs immediately."
      />
      <Flash sp={sp} />
      <div className="space-y-4">
        {plans.map((p) => (
          <Card
            key={p.id}
            title={`${p.name}${p.active ? "" : " (inactive)"}`}
            action={`${money(p.price, s.currency)} · ${money(p.direct_pair_bonus, s.currency)} / ${money(p.indirect_pair_bonus, s.currency)}`}
          >
            <PlanForm p={p} />
          </Card>
        ))}
        <Card title="Add a new plan">
          <PlanForm />
        </Card>
      </div>
    </>
  );
}
