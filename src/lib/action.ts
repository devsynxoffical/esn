import "server-only";
import { redirect, unstable_rethrow } from "next/navigation";
import { revalidatePath } from "next/cache";
import { UserError } from "./db";

function withMsg(path: string, key: "ok" | "err", msg: string) {
  const safe = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  const [p, qs = ""] = safe.split("?");
  const params = new URLSearchParams(qs);
  params.delete("ok");
  params.delete("err");
  params.set(key, msg);
  return `${p}?${params.toString()}`;
}

/**
 * Run a server-action body and redirect back with a flash message.
 * Errors thrown as UserError are shown to the user; other errors are logged and hidden.
 */
export async function handle(back: string, fn: () => Promise<string | void>, next?: string | (() => string)) {
  let msg: string | void;
  try {
    msg = await fn();
  } catch (e) {
    unstable_rethrow(e);
    let text = "Something went wrong. Please try again.";
    if (e instanceof UserError) text = e.message;
    else if (e && typeof e === "object" && "code" in e && (e as { code: string }).code === "23505")
      text = "This record already exists (duplicate).";
    else console.error(e);
    redirect(withMsg(back, "err", text));
  }
  revalidatePath("/", "layout");
  const dest = typeof next === "function" ? next() : (next ?? back);
  redirect(withMsg(dest, "ok", msg || "Saved."));
}

export const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
export const numv = (fd: FormData, k: string) => {
  const v = Number(String(fd.get(k) ?? "").replace(/,/g, ""));
  return Number.isFinite(v) ? v : NaN;
};
export const bool = (fd: FormData, k: string) => fd.get(k) === "on" || fd.get(k) === "true";
