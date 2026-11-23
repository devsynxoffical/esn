/** Runs once when a server instance starts, before it handles requests: prepares the database. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { setupProblem } = await import("./lib/bootstrap");
  // Never block startup: if setup cannot finish (missing env vars, DB down), pages show a setup notice and retry.
  const problem = await setupProblem();
  if (problem) console.warn("ESN setup pending:", problem);
}
