import { getSettings } from "@/lib/settings";

export const metadata = { title: "Terms & Policy" };

export default async function Terms() {
  const s = await getSettings();
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 py-12 text-sm leading-relaxed text-fg/90">
      <h1 className="text-2xl font-bold">Terms & Policy</h1>
      <p>
        {s.site_name} sells physical products (Handsfree, Watches and partner products). Each starter package is a product
        sale; a product sale receipt is issued on every activation.
      </p>
      <h2 className="pt-2 text-lg font-bold">Accounts</h2>
      <p>
        One CNIC and one mobile number may hold one account. Accounts remain inactive until activated with a valid E-Pin.
        Sharing passwords is not allowed. Fraudulent accounts may be blocked and their earnings reversed.
      </p>
      <h2 className="pt-2 text-lg font-bold">Commissions</h2>
      <p>
        Commissions are paid only from product sales made by your team according to the compensation plan published in your
        dashboard. Earnings are not guaranteed and depend on actual sales. Daily caps apply; pairs above the daily cap are
        flushed at the daily closing.
      </p>
      <h2 className="pt-2 text-lg font-bold">Withdrawals</h2>
      <p>
        Withdrawals are processed to your own JazzCash, EasyPaisa or bank account after deduction of the service fee shown at
        the time of request. Minimum withdrawal and fee are shown on the withdrawal page.
      </p>
      <h2 className="pt-2 text-lg font-bold">Privacy</h2>
      <p>Your CNIC, phone and payout details are used only for verification and payments and are never sold.</p>
      <p className="text-mute">Questions? Contact {s.support_phone} or {s.support_email}.</p>
    </div>
  );
}
