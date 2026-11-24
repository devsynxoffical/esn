import { requireMember } from "@/lib/auth";
import { one } from "@/lib/db";
import { dt } from "@/lib/fmt";
import { Card, PageHead, Flash, Field, Badge } from "@/components/ui";
import { profileAction, passwordAction } from "@/app/actions/member";

export default async function Profile({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  const me = await requireMember();
  const sponsor = me.sponsor_id ? await one("SELECT code, name FROM users WHERE id = $1", [me.sponsor_id]) : null;
  const parent = me.parent_id ? await one("SELECT code, name FROM users WHERE id = $1", [me.parent_id]) : null;

  return (
    <>
      <PageHead title="My Profile" />
      <Flash sp={sp} />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title="Account">
          <dl className="space-y-2 text-sm">
            {[
              ["Member ID", me.code],
              ["Status", <Badge key="s">{me.status}</Badge>],
              ["Plan", me.plan_name ?? "None"],
              ["Mobile", me.phone],
              ["CNIC", me.cnic ?? "Not added"],
              ["Sponsor", sponsor ? `${sponsor.name} (${sponsor.code})` : "None"],
              ["Placed under", parent ? `${parent.name} (${parent.code}) · ${me.position === "L" ? "Left" : "Right"}` : "Not placed yet"],
              ["Joined", dt(me.created_at)],
              ["Activated", dt(me.activated_at)],
            ].map(([k, v], i) => (
              <div key={i} className="flex justify-between gap-3">
                <dt className="text-mute">{k}</dt>
                <dd className="text-right font-semibold">{v}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[11px] text-mute">To change mobile number or CNIC, contact the office.</p>
        </Card>
        <Card title="Edit details">
          <form action={profileAction} className="space-y-3">
            <Field label="Full name" name="name" defaultValue={me.name} required />
            <Field label="Email" name="email" type="email" defaultValue={me.email} />
            <Field label="City" name="city" defaultValue={me.city} />
            <Field label="Address" name="address" defaultValue={me.address} />
            <button className="btn btn-acc w-full">Save</button>
          </form>
        </Card>
        <Card title="Change password">
          <form action={passwordAction} className="space-y-3">
            <Field label="Current password" name="current" type="password" required autoComplete="current-password" />
            <Field label="New password" name="password" type="password" required autoComplete="new-password" />
            <Field label="Confirm new password" name="confirm" type="password" required autoComplete="new-password" />
            <button className="btn btn-acc w-full">Change password</button>
          </form>
        </Card>
      </div>
    </>
  );
}
