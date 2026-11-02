# student-loan-repayment-assistance-plan-calculator-mcp

An MCP server that gives an AI assistant the federal student loan rules from the One Big Beautiful Bill Act (P.L. 119-21) that are newer than its training data: the Repayment Assistance Plan (RAP) payment, its interest subsidy and principal match, cancellation after 360 payments, the Tiered Standard plan, the loan limits that started July 1, 2026, and the dates SAVE, PAYE and ICR borrowers must move. Every rule is copied from the statute text and StudentAid.gov.

Hosted endpoint, no sign-in and no token:

```
https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp
```

## Tools

| Tool | What it does |
|---|---|
| `calculate_rap_payment` | RAP monthly payment from AGI and dependents. With balance and rate, also the first month (interest waived, $50 principal match) and a constant-income projection to payoff or cancellation after 360 payments. |
| `compare_rap_vs_standard` | RAP against the Tiered Standard plan and the 10-year Standard plan: monthly payment, months, total paid, amount cancelled, PSLF eligibility. |
| `get_federal_loan_limits` | Undergraduate, graduate, professional and Parent PLUS limits in force on a date, before or after July 1, 2026, with the interim exception and the $257,500 lifetime cap. |
| `get_plan_transition_dates` | Every dated step from July 4, 2025 to July 1, 2028, marked past or upcoming, and the current status of SAVE, PAYE, ICR, IBR, RAP and the fixed plans. |

Every result has structured JSON, a plain-English summary, `as_of`, `source` (the statute or StudentAid.gov page) and `more`.

## What it knows that your model does not

- RAP base payment is a percent of the whole AGI by band: $120 a year at $10,000 or less, then 1% (over $10,000) up to 10% (over $100,000). Divide by 12, subtract $50 per dependent, and never pay less than $10.
- Because the percent applies to all of AGI, $50,001 pays 5% ($208.34 a month) while $50,000 pays 4% ($166.67).
- On-time RAP payments that do not cover the month's interest: the unpaid interest is not charged. If principal drops by less than $50, the Department adds a match so it drops by the lesser of $50 or the payment.
- The remaining balance is cancelled after 360 qualifying payments. RAP counts for PSLF. The Tiered Standard plan does not.
- Tiered Standard: 10 years under $25,000, 15 under $50,000, 20 under $100,000, 25 at $100,000 or more.
- From July 1, 2026: Grad PLUS ends for new borrowers, graduate loans cap at $20,500 a year and $100,000, professional at $50,000 and $200,000, Parent PLUS at $20,000 a year and $65,000 per student, and $257,500 lifetime.
- A court order ended SAVE in March 2026. Servicers send 90-day notices from July 1, 2026, then a final 30-day notice. PAYE and ICR end no later than July 1, 2028, when remaining borrowers go to RAP or IBR.

## Install

### Claude.ai custom connector or ChatGPT developer mode

Add a custom connector and paste the URL. No token is needed.

```
https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp
```

### Claude Code

```
claude mcp add --transport http student-loan-rap https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp
```

Or run it locally:

```
claude mcp add student-loan-rap -- npx -y github:theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp
```

### Claude Desktop

Add this to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "student-loan-rap": {
      "command": "npx",
      "args": ["-y", "github:theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp"]
    }
  }
}
```

### Cursor

Add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "student-loan-rap": {
      "url": "https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

### VS Code

Add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "student-loan-rap": {
      "type": "http",
      "url": "https://student-loan-repayment-assistance-plan-calculator-mcp.lipmichal.workers.dev/mcp"
    }
  }
}
```

Node 20 or newer is needed for the local `npx` version.

## Example prompts

- "My AGI is $55,000 and I have one child. What would my RAP student loan payment be?"
- "I owe $40,000 at 6.53%. Compare RAP with the Tiered Standard plan."
- "I was on SAVE. When do I have to pick a new plan, and what happens if I do not?"
- "How much can parents borrow in Parent PLUS loans for a student starting in fall 2026?"
- "Can I still get a Grad PLUS loan for law school starting in August 2026?"
- "When do PAYE and ICR end?"

## Data sources

Rules are copied from the text of P.L. 119-21, Title VIII (govinfo.gov), the StudentAid.gov SAVE FAQ, the FSA Handbook 2025-26 volume 8 chapter 4 and FSA's loan limits FAQ, all fetched on 2026-11-02. See [DATA_SOURCES.md](DATA_SOURCES.md).

## Limitations

- General information, not financial advice. Your servicer computes the official payment.
- Rounding, daily interest accrual, how the subsidy is split across loans and mid-year income changes follow Department procedures and regulations. This server did not confirm final RAP regulations on 2026-11-02 and treats cents as estimates.
- Projections hold income and family size constant and assume every payment is on time.
- IBR, ICR and PAYE payment amounts are not calculated. Health professions and other special loan limits are not covered.

## More

More free data servers with hosted URLs: [mcpstamp.com/free-servers](https://www.mcpstamp.com/free-servers/?utm_source=mcp&utm_medium=student-loan-repayment-assistance-plan-calculator-mcp).

Part of the Zovo MCP collection: https://mcp.zovo.one

## Development

```
npm install
npm run build
npm test
```

`src/core.ts` holds all the rules and has no I/O. `src/stdio.ts` is the local entry and `src/worker.ts` is the Cloudflare Worker entry. Both use the same tool registry in `src/tools.ts`.

## License

MIT

<!-- data-servers:start -->
## More data servers from the same author

Each one is free, needs no API key and has a hosted URL you can paste into Claude or ChatGPT.

| server | tools | hosted URL |
|---|---|---|
| [cups-to-grams-mcp](https://github.com/theluckystrike/cups-to-grams-mcp) | convert_ingredient, search_ingredients, scale_recipe, convert_oven_temperature | `https://cups-to-grams-mcp.lipmichal.workers.dev/mcp` |
| [dscr-loan-calculator-mcp](https://github.com/theluckystrike/dscr-loan-calculator-mcp) | calculate_dscr, max_loan_for_target_dscr, rent_needed_for_target_dscr, compare_scenarios, amortization_summary | `https://dscr-loan-calculator-mcp.lipmichal.workers.dev/mcp` |
| [gold-price-per-gram-mcp](https://github.com/theluckystrike/gold-price-per-gram-mcp) | get_gold_price_per_gram, get_metal_prices, calculate_jewelry_value, convert_gold_units | `https://gold-price-per-gram-mcp.lipmichal.workers.dev/mcp` |
| [lake-level-mcp](https://github.com/theluckystrike/lake-level-mcp) | search_lakes, get_lake_level, get_lake_history, compare_lakes | `https://lake-level-mcp.lipmichal.workers.dev/mcp` |
| [minimum-wage-mcp](https://github.com/theluckystrike/minimum-wage-mcp) | get_minimum_wage, list_upcoming_increases, compare_states, annual_income_at_minimum_wage | `https://minimum-wage-mcp.lipmichal.workers.dev/mcp` |
| [no-tax-on-overtime-mcp](https://github.com/theluckystrike/no-tax-on-overtime-mcp) | calculate_overtime_deduction, calculate_tips_deduction, calculate_senior_deduction, estimate_tax_savings, explain_eligibility | `https://no-tax-on-overtime-mcp.lipmichal.workers.dev/mcp` |
| [paycheck-calculator-mcp](https://github.com/theluckystrike/paycheck-calculator-mcp) | calculate_take_home_pay, compare_states_take_home, salary_to_hourly, hourly_to_salary, get_federal_tax_brackets | `https://paycheck-calculator-mcp.lipmichal.workers.dev/mcp` |
| [uk-income-tax-salary-mcp](https://github.com/theluckystrike/uk-income-tax-salary-mcp) | calculate_uk_take_home, get_uk_tax_bands, compare_salaries, marginal_rate_at_income | `https://uk-income-tax-salary-mcp.lipmichal.workers.dev/mcp` |
| [us-federal-holidays-business-days-mcp](https://github.com/theluckystrike/us-federal-holidays-business-days-mcp) | list_federal_holidays, is_business_day, add_business_days, count_business_days, invoice_due_date | `https://us-federal-holidays-business-days-mcp.lipmichal.workers.dev/mcp` |
| [ab-test-sample-size-calculator-mcp](https://github.com/theluckystrike/ab-test-sample-size-calculator-mcp) | calculate_sample_size, estimate_test_duration, test_ab_significance, fisher_exact_test, check_peeking_risk | `https://ab-test-sample-size-calculator-mcp.lipmichal.workers.dev/mcp` |
| [aca-premium-tax-credit-calculator-mcp](https://github.com/theluckystrike/aca-premium-tax-credit-calculator-mcp) | get_federal_poverty_level, calculate_premium_tax_credit, check_subsidy_cliff, get_aptc_repayment_cap | `https://aca-premium-tax-credit-calculator-mcp.lipmichal.workers.dev/mcp` |
| [ap-score-distributions-mcp](https://github.com/theluckystrike/ap-score-distributions-mcp) | get_ap_score_distribution, estimate_ap_percentile, compare_ap_exams, list_ap_exams, estimate_ap_score_from_composite | `https://ap-score-distributions-mcp.lipmichal.workers.dev/mcp` |
| [car-loan-interest-deduction-calculator-mcp](https://github.com/theluckystrike/car-loan-interest-deduction-calculator-mcp) | calculate_car_loan_interest_deduction, calculate_salt_deduction, get_tax_brackets_and_standard_deduction, calculate_child_tax_credit | `https://car-loan-interest-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [estate-gift-tax-exemption-calculator-mcp](https://github.com/theluckystrike/estate-gift-tax-exemption-calculator-mcp) | get_exemption_amounts, calculate_estate_tax, check_gift, compare_years | `https://estate-gift-tax-exemption-calculator-mcp.lipmichal.workers.dev/mcp` |
| [recipe-nutrition-calculator-mcp](https://github.com/theluckystrike/recipe-nutrition-calculator-mcp) | lookup_ingredient_nutrition, calculate_recipe_nutrition, round_nutrition_label, scale_recipe_nutrition | `https://recipe-nutrition-calculator-mcp.lipmichal.workers.dev/mcp` |
| [retirement-contribution-limits-2027-mcp](https://github.com/theluckystrike/retirement-contribution-limits-2027-mcp) | get_contribution_limits, calculate_max_contribution, get_social_security_cola, compare_years | `https://retirement-contribution-limits-2027-mcp.lipmichal.workers.dev/mcp` |
| [section-179-deduction-calculator-mcp](https://github.com/theluckystrike/section-179-deduction-calculator-mcp) | calculate_section_179, calculate_bonus_depreciation, get_vehicle_depreciation_limits, calculate_asset_loan_payment | `https://section-179-deduction-calculator-mcp.lipmichal.workers.dev/mcp` |
| [subdomain-finder-mcp](https://github.com/theluckystrike/subdomain-finder-mcp) | find_subdomains, resolve_subdomains, get_certificate_history, summarize_attack_surface | `https://subdomain-finder-mcp.lipmichal.workers.dev/mcp` |
| [uk-statutory-sick-pay-maternity-pay-calculator-mcp](https://github.com/theluckystrike/uk-statutory-sick-pay-maternity-pay-calculator-mcp) | calculate_statutory_sick_pay, calculate_statutory_maternity_pay, get_minimum_wage_rates, check_eligibility | `https://uk-statutory-sick-pay-maternity-pay-calculator-mcp.lipmichal.workers.dev/mcp` |

The paid back-office collection (invoices, VAT, PDFs, spreadsheets) is at https://mcp.zovo.one
<!-- data-servers:end -->
