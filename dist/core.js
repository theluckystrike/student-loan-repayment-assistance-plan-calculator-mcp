// Pure core: One Big Beautiful Bill Act (P.L. 119-21, Title VIII, enacted July 4, 2025) federal student
// loan rules. Repayment Assistance Plan (RAP) payment formula, interest subsidy and $50 principal match,
// 360-payment cancellation, the Tiered Standard plan, new loan limits from July 1, 2026, and the dates
// borrowers leave SAVE, PAYE and ICR. No I/O. Every rule was copied from the statute text on govinfo.gov
// or from studentaid.gov / fsapartners.ed.gov pages fetched on 2026-11-02; see DATA_SOURCES.md.
export const AS_OF = "2026-11-02";
export const REPO = "student-loan-repayment-assistance-plan-calculator-mcp";
export const DISCLAIMER = "General information, not financial or legal advice. Your servicer computes the official payment from your certified income and loan records. Use the StudentAid.gov Loan Simulator to confirm.";
export const SOURCES = {
    statute: "https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm",
    congress: "https://www.congress.gov/bill/119th-congress/house-bill/1/text",
    saveFaq: "https://studentaid.gov/articles/save/",
    handbook: "https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2025-2026/vol8/ch4-annual-and-aggregate-loan-limits",
    limitsFaq: "https://fsapartners.ed.gov/sites/default/files/2026-05/FrequentlyAskedQuestionsLoanLimits.pdf",
};
const MORE = "https://www.mcpstamp.com/free-servers/";
export function moreUrl() {
    return `${MORE}?utm_source=mcp&utm_medium=${REPO}`;
}
export class InputError extends Error {
}
export const REGULATION_NOTE = "The RAP formula, the $10 minimum, the $50-per-dependent reduction, the interest subsidy, the $50 principal match and the 360-payment cancellation are fixed by statute (HEA sec. 455(q), added by P.L. 119-21 sec. 82001(d)). How a servicer rounds, accrues daily interest, applies the subsidy across several loans and treats a mid-year income change is set by Department of Education procedures and regulations, which this server did not confirm as final on 2026-11-02. Treat cents-level results as estimates.";
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const RAP_BANDS = [
    { over: 0, up_to: 10000, percent: null, flat_annual: 120 },
    { over: 10000, up_to: 20000, percent: 1, flat_annual: null },
    { over: 20000, up_to: 30000, percent: 2, flat_annual: null },
    { over: 30000, up_to: 40000, percent: 3, flat_annual: null },
    { over: 40000, up_to: 50000, percent: 4, flat_annual: null },
    { over: 50000, up_to: 60000, percent: 5, flat_annual: null },
    { over: 60000, up_to: 70000, percent: 6, flat_annual: null },
    { over: 70000, up_to: 80000, percent: 7, flat_annual: null },
    { over: 80000, up_to: 90000, percent: 8, flat_annual: null },
    { over: 90000, up_to: 100000, percent: 9, flat_annual: null },
    { over: 100000, up_to: null, percent: 10, flat_annual: null },
];
export const RAP_MINIMUM_MONTHLY = 10;
export const RAP_DEPENDENT_REDUCTION = 50;
export const RAP_PRINCIPAL_MATCH = 50;
export const RAP_QUALIFYING_PAYMENTS = 360;
export function rapBand(agi) {
    if (!(agi >= 0) || !Number.isFinite(agi))
        throw new InputError("agi must be a number of dollars, 0 or more.");
    if (agi <= 10000)
        return RAP_BANDS[0];
    for (const b of RAP_BANDS)
        if (agi > b.over && (b.up_to === null || agi <= b.up_to))
            return b;
    return RAP_BANDS[RAP_BANDS.length - 1];
}
/** Annual applicable base payment. The percent applies to the whole AGI, not just the slice in the band. */
export function rapBaseAnnual(agi) {
    const b = rapBand(agi);
    return b.flat_annual !== null ? b.flat_annual : (agi * b.percent) / 100;
}
function checkInt(n, name, max) {
    if (!Number.isInteger(n) || n < 0 || n > max)
        throw new InputError(`${name} must be a whole number from 0 to ${max}.`);
    return n;
}
function checkMoney(n, name, max = 1e8) {
    if (!Number.isFinite(n) || n < 0 || n > max)
        throw new InputError(`${name} must be a dollar amount from 0 to ${max}.`);
    return n;
}
function checkRate(r) {
    if (!Number.isFinite(r) || r < 0 || r > 20)
        throw new InputError("rate is the annual interest rate in percent, for example 6.53. It must be 0 to 20.");
    return r;
}
/** Monthly RAP payment before the final-payment rule: base/12 - $50 x dependents, never below $10. */
export function rapMonthly(agi, dependents) {
    checkInt(dependents, "dependents", 30);
    const formula = rapBaseAnnual(agi) / 12 - RAP_DEPENDENT_REDUCTION * dependents;
    const minimum_applied = formula < RAP_MINIMUM_MONTHLY;
    return { formula: round2(formula), payment: round2(minimum_applied ? RAP_MINIMUM_MONTHLY : formula), minimum_applied };
}
/** One on-time RAP month (sec. 455(q)(1)(B), (2)(A), (2)(B)). Payment goes to interest first, then principal. */
export function rapMonth(balance, annualRatePct, scheduled) {
    const interest = round2((balance * annualRatePct) / 100 / 12);
    const payment = round2(Math.min(scheduled, balance + interest)); // final payment rule (4)(B)(iii)
    const interest_paid = Math.min(payment, interest);
    const interest_waived = round2(interest - interest_paid); // (2)(A) unpaid interest is not charged
    const principal_paid = round2(payment - interest_paid);
    let principal_match = 0;
    if (principal_paid < RAP_PRINCIPAL_MATCH) {
        principal_match = round2(Math.min(RAP_PRINCIPAL_MATCH, payment) - principal_paid); // (2)(B)
        principal_match = round2(Math.max(0, Math.min(principal_match, balance - principal_paid)));
    }
    const ending_balance = round2(Math.max(0, balance - principal_paid - principal_match));
    return { payment, interest_accrued: interest, interest_paid: round2(interest_paid), interest_waived, principal_paid, principal_match, ending_balance };
}
/** Simulates RAP with income and dependents held constant, every payment on time, no deferment. */
export function simulateRap(balance, ratePct, agi, dependents) {
    const scheduled = rapMonthly(agi, dependents).payment;
    let b = balance, paid = 0, waived = 0, match = 0, m = 0;
    while (b > 0 && m < RAP_QUALIFYING_PAYMENTS) {
        const r = rapMonth(b, ratePct, scheduled);
        paid += r.payment;
        waived += r.interest_waived;
        match += r.principal_match;
        b = r.ending_balance;
        m++;
    }
    return { months_paid: m, paid_off: b <= 0, forgiven_after_360: round2(b), total_paid: round2(paid), total_interest_waived: round2(waived), total_principal_match: round2(match) };
}
export function calculateRapPayment(input) {
    const agi = checkMoney(input.agi, "agi");
    const dependents = checkInt(input.dependents ?? 0, "dependents", 30);
    const band = rapBand(agi);
    const base = rapBaseAnnual(agi);
    const m = rapMonthly(agi, dependents);
    const out = {
        agi, dependents,
        band: band.flat_annual !== null ? "AGI $10,000 or less: flat $120 a year" : `AGI over $${band.over.toLocaleString("en-US")}${band.up_to ? ` up to $${band.up_to.toLocaleString("en-US")}` : ""}: ${band.percent}% of the whole AGI`,
        applicable_base_payment_annual: round2(base),
        base_monthly: round2(base / 12),
        dependent_reduction_monthly: RAP_DEPENDENT_REDUCTION * dependents,
        formula_result_monthly: m.formula,
        minimum_applied: m.minimum_applied,
        monthly_payment: m.payment,
        annual_total: round2(m.payment * 12),
    };
    if (input.balance !== undefined) {
        const balance = checkMoney(input.balance, "balance");
        const rate = checkRate(input.rate ?? 0);
        if (input.rate === undefined)
            throw new InputError("Give rate (annual percent) together with balance.");
        const first = rapMonth(balance, rate, m.payment);
        out.balance = balance;
        out.rate = rate;
        out.first_month = first;
        out.projection_constant_income = simulateRap(balance, rate, agi, dependents);
    }
    out.notes = [
        "AGI is the borrower's (and spouse's, unless married filing separately) adjusted gross income from the most recent tax year.",
        "Dependents are IRC sec. 152 dependents; if married filing separately, only those the borrower claims on that return.",
        "Each on-time payment that does not cover the month's interest: the unpaid interest is not charged. If it lowers principal by less than $50, the Department reduces principal so the total drop equals the lesser of $50 or the payment.",
        "After 360 qualifying monthly payments the remaining balance is cancelled. RAP payments count for PSLF.",
        "Parent PLUS loans and consolidation loans that repaid them (excepted loans) cannot use RAP.",
    ];
    out.regulation_note = REGULATION_NOTE;
    return out;
}
// ---------------------------------------------------------------- Standard plans
/** Tiered Standard plan term for loans made on or after July 1, 2026 (sec. 455(d)(7)(A)(i)). */
export function tieredStandardYears(totalPrincipal) {
    if (totalPrincipal < 25000)
        return 10;
    if (totalPrincipal < 50000)
        return 15;
    if (totalPrincipal < 100000)
        return 20;
    return 25;
}
export function amortizedPayment(balance, ratePct, years) {
    const n = years * 12;
    const r = ratePct / 100 / 12;
    if (r === 0)
        return round2(balance / n);
    return round2((balance * r) / (1 - Math.pow(1 + r, -n)));
}
function standardTotals(balance, ratePct, years) {
    const pay = amortizedPayment(balance, ratePct, years);
    // total paid with the last payment trimmed to what is owed
    let b = balance, paid = 0, m = 0;
    const n = years * 12;
    while (b > 0.004 && m < n) {
        const i = round2((b * ratePct) / 100 / 12);
        const p = m === n - 1 ? round2(b + i) : Math.min(pay, round2(b + i)); // last payment clears the rounding residual
        paid += p;
        b = round2(b + i - p);
        m++;
    }
    return { years, monthly_payment: pay, months: m, total_paid: round2(paid), total_interest: round2(paid - balance) };
}
export function compareRapVsStandard(input) {
    const balance = checkMoney(input.balance, "balance");
    if (balance <= 0)
        throw new InputError("balance must be more than 0.");
    const rate = checkRate(input.rate);
    const agi = checkMoney(input.agi, "agi");
    const dependents = checkInt(input.dependents ?? 0, "dependents", 30);
    const newLoan = input.has_loan_on_or_after_2026_07_01 ?? false;
    const rapPay = rapMonthly(agi, dependents);
    const sim = simulateRap(balance, rate, agi, dependents);
    const tiered = standardTotals(balance, rate, tieredStandardYears(balance));
    const plans = {
        repayment_assistance_plan: { monthly_payment: rapPay.payment, ...sim, pslf_qualifying: true },
        tiered_standard: { ...tiered, available: true, pslf_qualifying: false, rule: "10 years under $25,000; 15 years $25,000 to under $50,000; 20 years $50,000 to under $100,000; 25 years $100,000 or more (total principal when entering repayment)." },
    };
    if (!newLoan) {
        plans.standard_10_year = { ...standardTotals(balance, rate, 10), available: true, note: "Only for borrowers with no Direct Loan made on or after July 1, 2026." };
    }
    else {
        plans.standard_10_year = { available: false, note: "Not available: a borrower with any loan made on or after July 1, 2026 may choose only the Tiered Standard plan or RAP for all Direct Loans." };
    }
    const cheaperMonthly = rapPay.payment < tiered.monthly_payment ? "repayment_assistance_plan" : "tiered_standard";
    const rapTotal = sim.total_paid;
    const cheaperTotal = rapTotal < tiered.total_paid ? "repayment_assistance_plan" : "tiered_standard";
    return {
        balance, rate, agi, dependents, has_loan_on_or_after_2026_07_01: newLoan,
        plans,
        lower_monthly_payment: cheaperMonthly,
        lower_total_paid: cheaperTotal,
        assumptions: [
            "Income and dependents stay the same every year; in reality RAP is recalculated each year from new AGI.",
            "Interest is computed monthly at rate/12 on the balance; servicers accrue simple daily interest.",
            "All RAP payments are on time, so the interest subsidy and principal match apply every month.",
            "Balance is treated as one loan pool of Direct Loans eligible for RAP (no Parent PLUS).",
        ],
        regulation_note: REGULATION_NOTE,
    };
}
// ---------------------------------------------------------------- Loan limits
export const BORROWER_TYPES = ["dependent_undergraduate", "independent_undergraduate", "graduate", "professional", "parent_plus", "all"];
export const NEW_RULES_DATE = "2026-07-01";
const UNDERGRAD = {
    dependent_undergraduate: {
        annual_total: { first_year: 5500, second_year: 6500, third_year_and_beyond: 7500 },
        annual_subsidized_max: { first_year: 3500, second_year: 4500, third_year_and_beyond: 5500 },
        aggregate_total: 31000, aggregate_subsidized_max: 23000,
        note: "Excludes dependent students whose parents cannot get a Direct PLUS Loan; those students get the independent limits. Not changed by P.L. 119-21.",
    },
    independent_undergraduate: {
        annual_total: { first_year: 9500, second_year: 10500, third_year_and_beyond: 12500 },
        annual_subsidized_max: { first_year: 3500, second_year: 4500, third_year_and_beyond: 5500 },
        aggregate_total: 57500, aggregate_subsidized_max: 23000,
        note: "Also applies to dependent undergraduates whose parents cannot get a Direct PLUS Loan. Not changed by P.L. 119-21.",
    },
};
export function parseDate(s) {
    const d = s ?? AS_OF;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || Number.isNaN(Date.parse(d)))
        throw new InputError("date must be YYYY-MM-DD, for example 2026-08-15.");
    return d;
}
export function getFederalLoanLimits(input) {
    const type = input.borrower_type ?? "all";
    const date = parseDate(input.date);
    const after = date >= NEW_RULES_DATE;
    const want = (t) => type === "all" || type === t;
    const out = { date, rules_in_force: after ? "P.L. 119-21 limits (periods of instruction beginning on or after July 1, 2026)" : "Limits before July 1, 2026" };
    if (want("dependent_undergraduate"))
        out.dependent_undergraduate = { ...UNDERGRAD.dependent_undergraduate, ...(after ? { less_than_full_time: "Annual limit reduced in direct proportion to less-than-full-time enrollment (rounded to the nearest whole percentage point), per a schedule the Secretary publishes." } : {}) };
    if (want("independent_undergraduate"))
        out.independent_undergraduate = { ...UNDERGRAD.independent_undergraduate, ...(after ? { less_than_full_time: "Annual limit reduced in direct proportion to less-than-full-time enrollment, per the Secretary's schedule." } : {}) };
    if (want("graduate")) {
        out.graduate = after
            ? { unsubsidized_annual: 20500, unsubsidized_aggregate_in_addition_to_undergraduate: 100000, grad_plus: "Not available. Graduate PLUS ended for periods of instruction beginning on or after July 1, 2026 (interim exception below).", aggregate_note: "If the student is or has been a professional student, the graduate aggregate is $200,000 minus what was borrowed for professional study.", definition: "Graduate student: program that awards a graduate credential other than a professional degree." }
            : { unsubsidized_annual: 20500, aggregate_total_including_undergraduate: 138500, aggregate_subsidized_max: 65500, grad_plus: "Up to cost of attendance minus other financial aid; no fixed limit." };
    }
    if (want("professional")) {
        out.professional = after
            ? { unsubsidized_annual: 50000, unsubsidized_aggregate_in_addition_to_undergraduate: 200000, grad_plus: "Not available from July 1, 2026 (interim exception below).", aggregate_note: "If the student is or has been a graduate (non-professional) student, the professional aggregate is $200,000 minus what was borrowed for graduate study.", definition: "Professional student: program that awards a professional degree as defined in 34 CFR 668.2 as in effect on July 4, 2025." }
            : { unsubsidized_annual: 20500, aggregate_total_including_undergraduate: 138500, aggregate_subsidized_max: 65500, grad_plus: "Up to cost of attendance minus other financial aid; no fixed limit.", note: "Some health professions programs had higher unsubsidized limits before July 1, 2026; not covered here." };
    }
    if (want("parent_plus")) {
        out.parent_plus = after
            ? { annual_per_dependent_student_all_parents: 20000, aggregate_per_dependent_student_all_parents: 65000, aggregate_note: "Counted without regard to amounts repaid, forgiven or discharged.", less_than_full_time: "Per FSA's FAQ, Parent PLUS is not reduced for less-than-full-time enrollment.", repayment: "Parent PLUS loans made on or after July 1, 2026 can be repaid only under the Tiered Standard plan; they cannot use RAP." }
            : { annual: "Up to the student's cost of attendance minus other financial aid; no fixed limit.", aggregate: null };
    }
    if (after) {
        out.lifetime_limit_all_student_loans = { amount: 257500, note: "Lifetime maximum for loans a student borrows under Title IV (undergraduate, graduate and professional, Direct and FFEL), not counting Parent PLUS loans borrowed for a dependent. Counted without regard to amounts repaid, forgiven or discharged." };
        out.institution_may_set_lower_limits = "From July 1, 2026 a school may set lower annual loan limits for a program, applied the same way to all students in that program.";
        out.interim_exception = "A student who on June 30, 2026 was enrolled in a program and had received a Direct Loan for it (or whose parent had) keeps the old limits, including Grad PLUS and uncapped Parent PLUS, for the expected time to credential: the lesser of 3 academic years or the time left in the program.";
    }
    out.regulation_note = "Loan limits come straight from HEA sec. 455(a)(3)-(8) as amended by P.L. 119-21 sec. 81001. The proration schedule for less-than-full-time study and the professional-degree list are set by the Department; check your school's financial aid office.";
    return out;
}
export const TRANSITION_EVENTS = [
    { date: "2025-07-04", event: "P.L. 119-21 (One Big Beautiful Bill Act, H.R. 1) enacted. IBR changes take effect: the partial financial hardship test is removed (IBR payment is 15% of AGI over 150% of the poverty line, capped at the 10-year standard amount).", who: "All IBR borrowers", source: SOURCES.statute },
    { date: "2026-03", event: "A court order ended the SAVE Plan (per StudentAid.gov). SAVE borrowers must pick another plan.", who: "SAVE borrowers", source: SOURCES.saveFaq },
    { date: "2026-07-01", event: "Repayment Assistance Plan (RAP) opens. It applies to Direct Loans disbursed at any time, except Parent PLUS loans and consolidation loans that repaid them.", who: "Direct Loan borrowers", source: SOURCES.statute },
    { date: "2026-07-01", event: "New loans (including consolidation loans) made on or after this date can be repaid only under the Tiered Standard plan or RAP. A borrower who has any such loan must repay all Direct Loans under the same chosen plan. Old Standard, Graduated, Extended, IBR and ICR options apply only to loans made before July 1, 2026 to borrowers with no newer loan.", who: "Anyone borrowing on or after July 1, 2026", source: SOURCES.statute },
    { date: "2026-07-01", event: "Graduate PLUS ends for new borrowers. New annual and aggregate caps for graduate, professional and Parent PLUS loans and the $257,500 lifetime cap begin (interim exception for students already enrolled with a loan on June 30, 2026).", who: "Graduate, professional and parent borrowers", source: SOURCES.statute },
    { date: "2026-07-01", event: "Servicers began sending 90-day notices to SAVE borrowers, in groups. After 90 days a final 30-day notice follows. Example from StudentAid.gov: a notice on July 1, 2026 meant a Sept. 29, 2026 deadline. Borrowers who do not choose are placed in the Standard plan (no loan on or after July 1, 2026) or the Tiered Standard plan (a newer loan has entered repayment).", who: "SAVE borrowers", source: SOURCES.saveFaq },
    { date: "2026-12-31", event: "StudentAid.gov says servicers will notify every SAVE borrower before the end of 2026, and that eligible borrowers enrolled in auto pay by Dec. 31, 2026 get a 1% interest rate reduction through June 30, 2028.", who: "SAVE borrowers", source: SOURCES.saveFaq },
    { date: "2027-07-01", event: "For loans made on or after this date: no unemployment or economic hardship deferment, and discretionary forbearance is capped at 9 months in any 24-month period. Defaulted borrowers may rehabilitate twice instead of once, and the minimum rehabilitation payment on newer Direct Loans is $10.", who: "Borrowers of loans made on or after July 1, 2027; defaulted borrowers", source: SOURCES.statute },
    { date: "2028-06-30", event: "Last day a Parent PLUS consolidation loan can be in ICR or another income-driven plan to keep IBR access later (StudentAid.gov: make at least one payment under ICR before July 1, 2028). Income contingent plans (ICR, PAYE, SAVE) are available only before this date.", who: "Parent PLUS borrowers who consolidated", source: SOURCES.statute },
    { date: "2028-07-01", event: "ICR authority is repealed. Every borrower still in an income contingent plan (ICR, PAYE) must have chosen RAP, IBR or another available plan and starts paying under it. Borrowers who do not choose are placed in RAP (or IBR if their loans cannot use RAP).", who: "ICR and PAYE borrowers", source: SOURCES.statute },
];
export function getPlanTransitionDates(input = {}) {
    const today = parseDate(input.on_date);
    const events = TRANSITION_EVENTS.map((e) => ({ ...e, status: e.date.length === 7 ? (e.date <= today.slice(0, 7) ? "past" : "upcoming") : e.date < today ? "past" : e.date === today ? "today" : "upcoming" }));
    const next = events.find((e) => e.status !== "past") ?? null;
    return {
        on_date: today,
        events,
        next_event: next,
        plan_status: {
            SAVE: "Ended by court order in March 2026. Borrowers are being moved to other plans by servicer notice (90 days plus a final 30-day notice).",
            PAYE: "Available only for Direct Loans disbursed before July 1, 2026; ends no later than July 1, 2028.",
            ICR: "Available only for Direct Loans disbursed before July 1, 2026; ends no later than July 1, 2028. The statutory repeal is effective July 1, 2028.",
            IBR: "Stays. Direct and FFEL loans disbursed before July 1, 2026. No partial financial hardship requirement since July 4, 2025.",
            RAP: "Open since July 1, 2026 for Direct Loans disbursed at any time, except Parent PLUS and consolidation loans that repaid Parent PLUS. 30-year (360 qualifying payments) horizon.",
            Tiered_Standard: "For borrowers with any loan made on or after July 1, 2026: 10, 15, 20 or 25 years by balance. Does not count for PSLF.",
            Standard_Graduated_Extended: "Only for borrowers whose loans were all disbursed before July 1, 2026.",
        },
        regulation_note: "Dates are from the statute and StudentAid.gov. Your own SAVE deadline is 90 days from your servicer's notice, not from an FSA email. Check your servicer inbox.",
    };
}
