import { requireMember } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { money } from "@/lib/fmt";
import { Card, Flash, PageHead } from "@/components/ui";
import { activateSelfAction } from "@/app/actions/member";

export default async function Activate({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireMember();
  const s = await getSettings();
  return (
    <>
      <PageHead title="Activate your ID" sub={`ID ${me.code} · Plan: ${me.plan_name ?? "—"}`} />
      <Flash sp={sp} />
      {me.status === "active" ? (
        <Card>
          <p className="text-sm">Your ID is already active. 🎉</p>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Enter your 16-digit E-Pin">
            <form action={activateSelfAction} className="space-y-4">
              <input
                className="inp text-center font-mono text-lg tracking-widest"
                name="pin"
                inputMode="numeric"
                placeholder="0000-0000-0000-0000"
                required
                maxLength={19}
              />
              <button className="btn btn-acc w-full py-3">Activate Now</button>
            </form>
          </Card>
          <Card title="How to get an E-Pin">
            <ol className="list-decimal space-y-2 pl-5 text-sm text-mute">
              <li>
                Visit the office and pay <b className="text-fg">{money(me.plan_price, s.currency)}</b> for your product.
              </li>
              <li>The office gives you a 16-digit E-Pin (or your sponsor can activate you from their E-Pin wallet).</li>
              <li>Enter the E-Pin here. Your ID becomes active, your invoice is generated and your product is dispatched.</li>
            </ol>
            <p className="mt-4 text-sm text-mute">
              Office: {s.office_address} · {s.support_phone}
            </p>
          </Card>
        </div>
      )}
    </>
  );
}
