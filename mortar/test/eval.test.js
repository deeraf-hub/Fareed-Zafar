import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

// The eval gates are part of the test suite: a rule or model change that drops an emergency
// (or reads "still leaking" as "all clear") fails `npm test`, not just `npm run eval`.
test("eval gates hold: 100% emergency recall on the development set, zero unsafe reply misses", async () => {
  const env = { ...process.env, LOCAL_MODEL_PROVIDER: "simulated", FRONTIER_PROVIDER: "simulated" };
  const { stdout } = await promisify(execFile)(process.execPath, ["--disable-warning=ExperimentalWarning", "evals/run.js", "--json", "--suite", "triage"], { env });
  const triage = JSON.parse(stdout);
  const { stdout: out2 } = await promisify(execFile)(process.execPath, ["--disable-warning=ExperimentalWarning", "evals/run.js", "--json", "--suite", "replies"], { env });
  const replies = JSON.parse(out2);
  assert.equal(triage.passed, true);
  assert.equal(replies.passed, true);
  const m = triage.results[0].metrics;
  assert.equal(m.emergencyRecall.hit, m.emergencyRecall.of);
  assert.equal(replies.results[0].metrics.unsafeMisses, 0);
});
