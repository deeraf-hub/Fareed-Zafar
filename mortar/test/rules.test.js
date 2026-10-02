import test from "node:test";
import assert from "node:assert/strict";
import { assessMessage, needsTriageModel, statedTemperature, parseVendorReply } from "../src/playbooks/maintenance/rules.js";

const severity = (text, opts) => assessMessage(text, opts).severity;

test("look-alike phrases are cut out before matching, so they can't hide a real hazard", () => {
  assert.equal(severity("Smoke detector keeps chirping"), "P2");
  assert.equal(severity("The fireplace flue is stuck open"), null);
  assert.equal(severity("There's a fire in the kitchen and the fire extinguisher is empty"), "P1");
  assert.equal(severity("the smoke alarm is beeping because there is smoke coming from the oven"), "P1");
});

test("emergency SOP temperature rules: from the message or the weather feed, never a model", () => {
  assert.equal(severity("No heat since last night and it's 30 degrees outside"), "P1");
  assert.equal(severity("The heater stopped working", { outsideTempF: 34 }), "P1");
  assert.equal(severity("The heater stopped working", { outsideTempF: 58 }), "P2");
  assert.equal(severity("AC is broken and it's 101 outside"), "P1");
  assert.equal(severity("AC isn't working and my grandmother has a heart condition"), "P1");
  assert.equal(severity("AC stopped working", { outsideTempF: 84 }), "P2");
  assert.deepEqual(["it's 30 degrees outside", "98° in here", "for 2 days", "unit 3B has 2 inches of water"].map(statedTemperature), [30, 98, null, null]);
});

test("rule-decided P1s never wait on a model; a routine keyword with hazard words gets a second look", () => {
  assert.equal(needsTriageModel(assessMessage("There is water coming through the ceiling")), false);
  assert.equal(needsTriageModel(assessMessage("Kitchen faucet is dripping")), false);
  assert.equal(needsTriageModel(assessMessage("my kitchen is filling up with water from the dishwasher, it won't stop")), true);
  assert.equal(needsTriageModel(assessMessage("The garage door opener stopped working")), true, "no rule matched");
});

test("vendor replies: polite declines, delays, and mixed messages a model should read", () => {
  assert.equal(parseVendorReply("Sorry can't tonight, all techs are out").status, "declined");
  assert.equal(parseVendorReply("we're not able to get there until tomorrow morning").status, "declined");
  assert.equal(parseVendorReply("Running about 30 min behind, still coming").status, "delayed");
  assert.equal(parseVendorReply("can't get there before 1am but we'll come").status, null);
  assert.equal(parseVendorReply("", "1").status, "accepted");
});
