export default function SetupNotice({ message }: { message: string }) {
  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="max-w-lg rounded-2xl border border-warn/40 bg-panel p-6">
        <h1 className="text-xl font-bold">Website setup needed</h1>
        <p className="mt-3 text-sm text-fg/90">{message}</p>
        <p className="mt-4 text-xs text-mute">
          Required environment variables: DATABASE_URL, ADMIN_PHONE, ADMIN_PASSWORD, CRON_SECRET. See README → Deploy on Vercel.
        </p>
      </div>
    </div>
  );
}
