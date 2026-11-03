// Regression tests for the s1103 finding: compare_rap_vs_standard named Tiered Standard as the lowest total paid
// when the 10-year Standard total was lower, and said only RAP counts toward PSLF.
// PSLF rule: HEA sec. 455(m)(1)(A)(i)-(v) as amended by P.L. 119-21 sec. 82004; StudentAid.gov SAVE FAQ question 10.
import { test } from "node:test";
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { compareRapVsStandard as cmp } from "../dist/core.js";
import { createServer } from "../dist/tools.js";

const ORIGINAL = { balance: 38000, rate: 6.5, agi: 52000, dependents: 1 };

async function callCompare(args) {
  const server = createServer();
  const client = new Client({ name: "t", version: "0" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await Promise.all([server.connect(a), client.connect(b)]);
  const r = await client.callTool({ name: "compare_rap_vs_standard", arguments: args });
  await client.close();
  return r;
}

test("R1 original input: lowest total paid is the 10-year Standard ($51,778.01), computed from totals", () => {
  const r = cmp(ORIGINAL);
  assert.equal(r.plans.standard_10_year.total_paid, 51778.01);
  assert.equal(r.lower_total_paid, "standard_10_year");
  assert.deepEqual(r.lowest_total_paid_plans, ["standard_10_year"]);
  assert.equal(r.lower_monthly_payment, "repayment_assistance_plan");
});

test("R2 lowest total paid always equals the minimum of the totals shown (grid)", () => {
  for (const balance of [8000, 24999, 25000, 38000, 60000, 120000]) for (const rate of [0, 4, 6.5, 9]) for (const agi of [0, 30000, 52000, 90000, 200000]) for (const newLoan of [false, true]) {
    const r = cmp({ balance, rate, agi, dependents: 1, has_loan_on_or_after_2026_07_01: newLoan });
    const totals = Object.entries(r.plans).filter(([, p]) => p.available !== false).map(([k, p]) => [k, p.total_paid]);
    const min = Math.min(...totals.map(([, t]) => t));
    for (const k of r.lowest_total_paid_plans) assert.ok(Math.abs(r.plans[k].total_paid - min) < 0.005, `${k} not min at ${balance}/${rate}/${agi}`);
    assert.ok(r.lowest_total_paid_plans.includes(r.lower_total_paid));
    if (newLoan) assert.ok(!r.lowest_total_paid_plans.includes("standard_10_year"));
  }
});

test("R3 PSLF flags: RAP and 10-year Standard qualify, Tiered Standard does not", () => {
  const r = cmp(ORIGINAL);
  assert.equal(r.plans.repayment_assistance_plan.pslf_qualifying, true);
  assert.equal(r.plans.standard_10_year.pslf_qualifying, true);
  assert.equal(r.plans.tiered_standard.pslf_qualifying, false);
  assert.match(r.pslf.counts.join(" "), /455\(m\)\(1\)\(A\)\(v\)/);
  assert.match(r.pslf.counts.join(" "), /455\(m\)\(1\)\(A\)\(ii\)/);
});

test("R4 tool summary for the original input names the right plan and PSLF plans", async () => {
  const r = await callCompare(ORIGINAL);
  assert.ok(!r.isError);
  const text = r.content[0].text;
  assert.match(text, /Lowest total paid: 10-year Standard\./);
  assert.doesNotMatch(text, /total paid: Tiered Standard/);
  assert.doesNotMatch(text, /Only RAP counts/);
  assert.match(text, /RAP and the 10-year Standard plan count toward PSLF; Tiered Standard does not\./);
  assert.equal(r.structuredContent.lower_total_paid, "standard_10_year");
});

test("R5 tool summary for a new-loan borrower: no 10-year Standard, PSLF says RAP only", async () => {
  const r = await callCompare({ ...ORIGINAL, has_loan_on_or_after_2026_07_01: true });
  const text = r.content[0].text;
  assert.doesNotMatch(text, /10-year Standard/);
  assert.match(text, /RAP counts toward PSLF; Tiered Standard does not\./);
});

test("R6 tie under $25,000: Tiered Standard is 10 years, so both standard plans tie and the summary says so", async () => {
  const r = await callCompare({ balance: 20000, rate: 6, agi: 40000, dependents: 0 });
  assert.deepEqual(r.structuredContent.lowest_total_paid_plans, ["tiered_standard", "standard_10_year"]);
  assert.match(r.content[0].text, /Lowest total paid: Tiered Standard and 10-year Standard \(tie\)\./);
});
