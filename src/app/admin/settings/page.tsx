import { requireAdmin } from "@/lib/auth";
import { getSettings, SETTING_DEFS, DEFAULTS, type SettingKey } from "@/lib/settings";
import { Card, PageHead, Flash } from "@/components/ui";
import { saveSettingsAction } from "@/app/actions/admin";

export default async function Settings({ searchParams }: { searchParams: Promise<{ ok?: string; err?: string }> }) {
  const sp = await searchParams;
  await requireAdmin();
  const s = await getSettings();
  const groups = new Map<string, SettingKey[]>();
  for (const k of Object.keys(SETTING_DEFS) as SettingKey[]) {
    const g = SETTING_DEFS[k].group;
    if (!groups.has(g)) groups.set(g, []);
    groups.get(g)!.push(k);
  }

  return (
    <>
      <PageHead
        title="Master Settings"
        sub="Every rule of the system. Changes apply immediately — no code changes needed. Plan prices & commissions are under Plans; rank rewards under Ranks."
      />
      <Flash sp={sp} />
      <form action={saveSettingsAction} className="space-y-4">
        {[...groups.entries()].map(([g, keys]) => (
          <Card key={g} title={g}>
            <div className="grid gap-4 md:grid-cols-2">
              {keys.map((k) => {
                const def = SETTING_DEFS[k];
                const v = s[k] as unknown;
                const dflt = DEFAULTS[k] as unknown;
                return (
                  <div key={k} className={def.type === "textarea" || def.type === "list" ? "md:col-span-2" : ""}>
                    <input type="hidden" name={`present_${k}`} value="1" />
                    {def.type === "bool" ? (
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line p-3">
                        <input type="checkbox" name={k} defaultChecked={!!v} className="mt-0.5 h-4 w-4 accent-[#f97316]" />
                        <span>
                          <span className="block text-sm font-semibold">{def.label}</span>
                          {def.help && <span className="block text-[11px] text-mute">{def.help}</span>}
                        </span>
                      </label>
                    ) : (
                      <label className="block">
                        <span className="lbl">{def.label}</span>
                        {def.type === "select" ? (
                          <select className="inp" name={k} defaultValue={String(v)}>
                            {def.options!.map((o) => (
                              <option key={o.value} value={o.value}>
                                {o.label}
                              </option>
                            ))}
                          </select>
                        ) : def.type === "textarea" || def.type === "list" ? (
                          <textarea
                            className="inp"
                            name={k}
                            rows={def.type === "list" ? 3 : 2}
                            defaultValue={Array.isArray(v) ? v.join("\n") : String(v ?? "")}
                          />
                        ) : (
                          <input
                            className="inp"
                            name={k}
                            type={def.type === "number" ? "number" : "text"}
                            step={def.type === "number" ? "0.01" : undefined}
                            defaultValue={String(v ?? "")}
                          />
                        )}
                        <span className="mt-1 block text-[11px] text-mute">
                          {def.help ? `${def.help} ` : ""}Default: {Array.isArray(dflt) ? dflt.join(", ") : String(dflt) || "—"}
                        </span>
                      </label>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
        <div className="sticky bottom-3 z-10 flex justify-end">
          <button className="btn btn-acc btn-lg w-full shadow-lg shadow-black/40 sm:w-auto sm:px-8">Save all settings</button>
        </div>
      </form>
    </>
  );
}
