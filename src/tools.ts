// One tool registry shared by the stdio and Cloudflare Worker entries.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  AS_OF, BORROWER_TYPES, DISCLAIMER, InputError, SOURCES, moreUrl,
  calculateRapPayment, compareRapVsStandard, getFederalLoanLimits, getPlanTransitionDates,
} from "./core.js";

export const SERVER_NAME = "student-loan-repayment-assistance-plan-calculator-mcp";
export const SERVER_VERSION = "1.0.1";

const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Payload = Record<string, unknown>;
function reply(summary: string, data: Payload, source: string) {
  const body = { ...data, summary, as_of: AS_OF, source, more: moreUrl(), disclaimer: DISCLAIMER };
  return {
    content: [
      { type: "text" as const, text: `${summary}\n\n${DISCLAIMER}` },
      { type: "text" as const, text: JSON.stringify(body, null, 2) },
    ],
    structuredContent: body,
  };
}

function run(fn: () => ReturnType<typeof reply>) {
  try {
    return fn();
  } catch (e) {
    const msg = e instanceof InputError ? e.message : `Unexpected error: ${(e as Error).message}`;
    return { isError: true, content: [{ type: "text" as const, text: msg }] };
  }
}

const RO = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
const agi = z.number().min(0).max(100000000).describe("Adjusted gross income in dollars from the most recent tax return (borrower plus spouse, unless married filing separately).");
const dependents = z.number().int().min(0).max(30).optional().describe("Number of IRC sec. 152 dependents claimed. Default 0.");

export function registerTools(server: McpServer): void {
  server.registerTool(
    "calculate_rap_payment",
    {
      title: "Repayment Assistance Plan (RAP) monthly payment",
      description:
        "Calculates the federal student loan Repayment Assistance Plan (RAP) payment created by the One Big Beautiful Bill Act (P.L. 119-21, HEA sec. 455(q)), open since July 1, 2026. Base payment is 1% to 10% of the WHOLE AGI by $10,000 band ($120 a year flat at $10,000 or less, 10% above $100,000), divided by 12, minus $50 per dependent, never below $10. With balance and rate it also shows the first month: interest paid first, unpaid interest waived (interest subsidy), the up-to-$50 principal match, and a constant-income projection to payoff or cancellation after 360 qualifying payments. Copied from the statute text, not model memory.",
      inputSchema: {
        agi,
        dependents,
        balance: z.number().min(0).max(100000000).optional().describe("Total RAP-eligible Direct Loan balance in dollars (optional)."),
        rate: z.number().min(0).max(20).optional().describe("Weighted annual interest rate in percent, for example 6.53. Required with balance."),
      },
      annotations: { ...RO, title: "RAP payment" },
    },
    async (a) => run(() => {
      const r = calculateRapPayment(a) as Record<string, any>;
      let s = `RAP payment for AGI ${money(r.agi)} with ${r.dependents} dependent(s): ${money(r.monthly_payment)} a month (${r.band}; base ${money(r.base_monthly)} a month minus ${money(r.dependent_reduction_monthly)} for dependents${r.minimum_applied ? ", raised to the $10 minimum" : ""}).`;
      if (r.first_month) {
        const f = r.first_month, p = r.projection_constant_income;
        s += ` On ${money(r.balance)} at ${r.rate}%, month one accrues ${money(f.interest_accrued)} interest; ${money(f.interest_waived)} is waived and the Department adds a ${money(f.principal_match)} principal match, so the balance falls to ${money(f.ending_balance)}.`;
        s += p.paid_off ? ` At constant income the loans are paid off after ${p.months_paid} payments (total ${money(p.total_paid)}).` : ` At constant income, ${money(p.forgiven_after_360)} would be cancelled after 360 qualifying payments (total paid ${money(p.total_paid)}).`;
      }
      return reply(s, r, SOURCES.statute);
    }),
  );

  server.registerTool(
    "compare_rap_vs_standard",
    {
      title: "Compare RAP with the Tiered Standard and 10-year Standard plans",
      description:
        "Compares the new Repayment Assistance Plan with the Tiered Standard plan (P.L. 119-21: 10 years under $25,000, 15 under $50,000, 20 under $100,000, 25 at $100,000 or more) and, for borrowers with no loan made on or after July 1, 2026, the 10-year Standard plan. Returns monthly payment, months, total paid, interest waived, principal match and the amount cancelled after 360 RAP payments, assuming constant income and on-time payments. Names the plan with the lowest monthly payment and the lowest total paid across all plans shown, and says which count for PSLF (RAP and 10-year Standard yes, Tiered Standard no; HEA 455(m)(1)(A)).",
      inputSchema: {
        balance: z.number().positive().max(100000000).describe("Total Direct Loan principal in dollars."),
        rate: z.number().min(0).max(20).describe("Weighted annual interest rate in percent."),
        agi,
        dependents,
        has_loan_on_or_after_2026_07_01: z.boolean().optional().describe("True if any Direct Loan (including a consolidation loan) was made on or after July 1, 2026. Then the old 10-year Standard plan is not available. Default false."),
      },
      annotations: { ...RO, title: "RAP vs Standard" },
    },
    async (a) => run(() => {
      const r = compareRapVsStandard(a) as Record<string, any>;
      const rap = r.plans.repayment_assistance_plan, t = r.plans.tiered_standard, s10 = r.plans.standard_10_year;
      let s = `For ${money(r.balance)} at ${r.rate}% and AGI ${money(r.agi)}: RAP ${money(rap.monthly_payment)} a month, ${rap.paid_off ? `paid off in ${rap.months_paid} months` : `${money(rap.forgiven_after_360)} cancelled after 360 payments`}, total ${money(rap.total_paid)}. Tiered Standard (${t.years} years) ${money(t.monthly_payment)} a month, total ${money(t.total_paid)}.`;
      if (s10.available) s += ` 10-year Standard ${money(s10.monthly_payment)} a month, total ${money(s10.total_paid)}.`;
      const label: Record<string, string> = { repayment_assistance_plan: "RAP", tiered_standard: "Tiered Standard", standard_10_year: "10-year Standard" };
      const names = (xs: string[]) => xs.map((x) => label[x]).join(" and ") + (xs.length > 1 ? " (tie)" : "");
      s += ` Lowest monthly payment: ${names(r.lowest_monthly_payment_plans)}. Lowest total paid: ${names(r.lowest_total_paid_plans)}.`;
      s += s10.available ? " RAP and the 10-year Standard plan count toward PSLF; Tiered Standard does not." : " RAP counts toward PSLF; Tiered Standard does not.";
      return reply(s, r, SOURCES.statute);
    }),
  );

  server.registerTool(
    "get_federal_loan_limits",
    {
      title: "Federal student loan limits before and after July 1, 2026",
      description:
        "Returns federal Direct Loan borrowing limits in force on a date. From July 1, 2026 (P.L. 119-21 sec. 81001): Grad PLUS ends for new borrowers; graduate unsubsidized $20,500 a year / $100,000 aggregate; professional $50,000 a year / $200,000 aggregate; Parent PLUS $20,000 a year and $65,000 total per dependent student across all parents; $257,500 lifetime cap; less-than-full-time proration; the interim exception for students enrolled with a loan on June 30, 2026. Undergraduate limits ($5,500-$7,500 dependent, $9,500-$12,500 independent) from the FSA Handbook.",
      inputSchema: {
        borrower_type: z.enum(BORROWER_TYPES).optional().describe("dependent_undergraduate, independent_undergraduate, graduate, professional, parent_plus or all (default)."),
        date: z.string().optional().describe("Date the period of instruction begins, YYYY-MM-DD. Default today (2026-11-02)."),
      },
      annotations: { ...RO, title: "Federal loan limits" },
    },
    async (a) => run(() => {
      const r = getFederalLoanLimits(a) as Record<string, any>;
      const parts: string[] = [];
      if (r.graduate) parts.push(`graduate unsubsidized ${money(r.graduate.unsubsidized_annual)} a year`);
      if (r.professional) parts.push(`professional unsubsidized ${money(r.professional.unsubsidized_annual)} a year`);
      if (r.parent_plus) parts.push(typeof r.parent_plus.annual_per_dependent_student_all_parents === "number" ? `Parent PLUS ${money(r.parent_plus.annual_per_dependent_student_all_parents)} a year and ${money(r.parent_plus.aggregate_per_dependent_student_all_parents)} total per student` : "Parent PLUS up to cost of attendance minus other aid");
      if (r.dependent_undergraduate) parts.push(`dependent undergraduate ${money(5500)}/${money(6500)}/${money(7500)} by year`);
      if (r.independent_undergraduate) parts.push(`independent undergraduate ${money(9500)}/${money(10500)}/${money(12500)} by year`);
      if (r.lifetime_limit_all_student_loans) parts.push(`lifetime cap ${money(257500)} (excluding Parent PLUS)`);
      const s = `Federal loan limits for a period starting ${r.date} (${r.rules_in_force}): ${parts.join("; ")}.${r.interim_exception ? " Students enrolled with a loan on June 30, 2026 keep the old limits for up to 3 academic years." : ""}`;
      return reply(s, r, a.date && a.date < "2026-07-01" ? SOURCES.handbook : SOURCES.statute);
    }),
  );

  server.registerTool(
    "get_plan_transition_dates",
    {
      title: "SAVE, PAYE, ICR and RAP transition dates",
      description:
        "Lists the dated steps of the federal student loan repayment overhaul: SAVE ended by court order (March 2026) with 90-day servicer notices from July 1, 2026 plus a final 30-day notice; RAP and the Tiered Standard plan from July 1, 2026; deferment and forbearance limits on loans from July 1, 2027; PAYE and ICR end and remaining borrowers move to RAP or IBR on July 1, 2028; the Parent PLUS consolidation deadline of June 30, 2028. Marks each as past or upcoming against a date and gives the current status of every plan.",
      inputSchema: {
        on_date: z.string().optional().describe("Reference date YYYY-MM-DD for past/upcoming. Default 2026-11-02."),
      },
      annotations: { ...RO, title: "Plan transition dates" },
    },
    async (a) => run(() => {
      const r = getPlanTransitionDates(a) as Record<string, any>;
      const up = r.events.filter((e: any) => e.status !== "past").map((e: any) => e.date);
      const s = `As of ${r.on_date}: SAVE has ended (court order, March 2026) and servicers are moving SAVE borrowers with 90-day notices; RAP is open; PAYE and ICR end no later than July 1, 2028, when remaining borrowers go to RAP or IBR. Upcoming dates: ${up.join(", ") || "none"}.`;
      return reply(s, r, SOURCES.saveFaq);
    }),
  );
}

export function createServer(): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerTools(server);
  return server;
}
