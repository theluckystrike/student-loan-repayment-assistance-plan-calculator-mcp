// Fixtures: expected values hand-checked against HEA sec. 455(q) and 455(d)(7) and sec. 455(a)(3)-(8) as
// amended by P.L. 119-21 (govinfo PLAW-119publ21), the FSA Handbook 2025-26 vol. 8 ch. 4, and StudentAid.gov.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calculateRapPayment as rap, rapMonth, simulateRap, compareRapVsStandard as cmp, tieredStandardYears,
  amortizedPayment, getFederalLoanLimits as limits, getPlanTransitionDates as dates, InputError,
} from "../dist/core.js";

test("F1 AGI $0: base $120/yr -> $10/mo", () => {
  const r = rap({ agi: 0 });
  assert.equal(r.applicable_base_payment_annual, 120);
  assert.equal(r.monthly_payment, 10);
});

test("F2 AGI $10,000 exactly: still the $120 flat band -> $10/mo", () => {
  assert.equal(rap({ agi: 10000 }).monthly_payment, 10);
});

test("F3 AGI $15,000: 1% = $150/yr -> $12.50/mo", () => {
  assert.equal(rap({ agi: 15000 }).monthly_payment, 12.5);
});

test("F4 AGI $50,000: 4% = $2,000/yr -> $166.67/mo", () => {
  assert.equal(rap({ agi: 50000 }).monthly_payment, 166.67);
});

test("F5 AGI $50,001: 5% of whole AGI = $2,500.05 -> $208.34/mo (band cliff)", () => {
  assert.equal(rap({ agi: 50001 }).monthly_payment, 208.34);
});

test("F6 AGI $60,000, 2 dependents: 5% = $3,000/12 = $250 - $100 = $150", () => {
  assert.equal(rap({ agi: 60000, dependents: 2 }).monthly_payment, 150);
});

test("F7 AGI $30,000, 3 dependents: $600/12 = $50 - $150 < $10 -> $10 minimum", () => {
  const r = rap({ agi: 30000, dependents: 3 });
  assert.equal(r.formula_result_monthly, -100);
  assert.equal(r.minimum_applied, true);
  assert.equal(r.monthly_payment, 10);
});

test("F8 AGI $100,000: 9% -> $750; AGI $120,000: 10% -> $1,000", () => {
  assert.equal(rap({ agi: 100000 }).monthly_payment, 750);
  assert.equal(rap({ agi: 120000 }).monthly_payment, 1000);
});

test("F9 interest subsidy + full $50 match: $50,000 at 6%, pay $100 -> interest $250, $150 waived, match $50", () => {
  const m = rapMonth(50000, 6, 100);
  assert.deepEqual([m.interest_accrued, m.interest_paid, m.interest_waived, m.principal_paid, m.principal_match, m.ending_balance], [250, 100, 150, 0, 50, 49950]);
});

test("F10 partial match: $25,000 at 6%, pay $166.67 -> principal $41.67, match $8.33, balance $24,950", () => {
  const m = rapMonth(25000, 6, 166.67);
  assert.equal(m.interest_accrued, 125);
  assert.equal(m.principal_paid, 41.67);
  assert.equal(m.principal_match, 8.33);
  assert.equal(m.ending_balance, 24950);
});

test("F11 match limited to payment: $10 payment, no principal paid -> match $10", () => {
  const m = rapMonth(30000, 6, 10);
  assert.equal(m.principal_match, 10);
  assert.equal(m.ending_balance, 29990);
});

test("F12 360-payment cancellation: $30,000 at 6%, AGI $0 -> 360 x $10, balance falls $10/mo, $26,400 cancelled", () => {
  const s = simulateRap(30000, 6, 0, 0);
  assert.equal(s.months_paid, 360);
  assert.equal(s.total_paid, 3600);
  assert.equal(s.forgiven_after_360, 26400);
});

test("F13 360 payments at $100: $50,000 at 6%, AGI $40,000 -> $50/mo principal drop, $32,000 cancelled", () => {
  const s = simulateRap(50000, 6, 40000, 0);
  assert.equal(s.total_paid, 36000);
  assert.equal(s.forgiven_after_360, 32000);
});

test("F14 final payment rule: balance $5 at 0% -> payment is $5, not $10", () => {
  const m = rapMonth(5, 0, 10);
  assert.equal(m.payment, 5);
  assert.equal(m.ending_balance, 0);
});

test("F15 Tiered Standard terms: <$25k 10y, <$50k 15y, <$100k 20y, $100k+ 25y", () => {
  assert.deepEqual([24999.99, 25000, 49999, 50000, 99999, 100000].map(tieredStandardYears), [10, 15, 15, 20, 20, 25]);
});

test("F16 10-year standard amortization: $30,000 at 6% -> $333.06", () => {
  assert.equal(amortizedPayment(30000, 6, 10), 333.06);
  assert.equal(amortizedPayment(12000, 0, 10), 100);
});

test("F17 compare: new-loan borrower loses the 10-year Standard plan", () => {
  const r = cmp({ balance: 30000, rate: 6, agi: 60000, dependents: 1, has_loan_on_or_after_2026_07_01: true });
  assert.equal(r.plans.standard_10_year.available, false);
  assert.equal(r.plans.tiered_standard.years, 15);
  assert.equal(r.plans.repayment_assistance_plan.monthly_payment, 200);
  assert.equal(r.plans.tiered_standard.months, 180);
});

test("F18 limits after July 1, 2026 (sec. 81001)", () => {
  const r = limits({ date: "2026-08-15" });
  assert.equal(r.graduate.unsubsidized_annual, 20500);
  assert.equal(r.graduate.unsubsidized_aggregate_in_addition_to_undergraduate, 100000);
  assert.equal(r.professional.unsubsidized_annual, 50000);
  assert.equal(r.professional.unsubsidized_aggregate_in_addition_to_undergraduate, 200000);
  assert.equal(r.parent_plus.annual_per_dependent_student_all_parents, 20000);
  assert.equal(r.parent_plus.aggregate_per_dependent_student_all_parents, 65000);
  assert.equal(r.lifetime_limit_all_student_loans.amount, 257500);
});

test("F19 limits before July 1, 2026 (FSA Handbook 2025-26)", () => {
  const r = limits({ date: "2026-06-30" });
  assert.equal(r.graduate.aggregate_total_including_undergraduate, 138500);
  assert.equal(r.dependent_undergraduate.aggregate_total, 31000);
  assert.equal(r.independent_undergraduate.annual_total.third_year_and_beyond, 12500);
  assert.equal(r.lifetime_limit_all_student_loans, undefined);
  assert.match(r.parent_plus.annual, /cost of attendance/);
});

test("F20 transition dates: on 2026-11-02 next event is 2026-12-31; July 1, 2028 present", () => {
  const r = dates({ on_date: "2026-11-02" });
  assert.equal(r.next_event.date, "2026-12-31");
  assert.ok(r.events.some((e) => e.date === "2028-07-01"));
  assert.equal(r.events.find((e) => e.date === "2026-03").status, "past");
});

test("F21 input errors", () => {
  assert.throws(() => rap({ agi: -1 }), InputError);
  assert.throws(() => rap({ agi: 50000, balance: 1000 }), InputError);
  assert.throws(() => limits({ date: "July 2026" }), InputError);
});
