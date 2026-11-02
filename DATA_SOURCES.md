# Data sources

All fetched on 2026-11-02 from the build host. Nothing below is from model memory.

| Rule | Source | Where in the source |
|---|---|---|
| RAP payment bands ($120 flat at AGI $10,000 or less; 1% to 10% of AGI by $10,000 band), divide by 12, minus $50 per dependent, $10 minimum, final payment rule | P.L. 119-21 text, https://www.govinfo.gov/content/pkg/PLAW-119publ21/html/PLAW-119publ21.htm (same text as https://www.congress.gov/bill/119th-congress/house-bill/1/text) | Sec. 82001(d), new HEA sec. 455(q)(4)(B)(i)-(v), 139 Stat. 344-345 |
| Payment applied to interest, then fees, then principal; unpaid principal deferred | same | HEA 455(q)(1)(B)-(C) |
| Interest subsidy (unpaid interest not charged on on-time payments) and matching principal payment (lesser of $50 or the payment, minus principal paid) | same | HEA 455(q)(2)(A)-(B), 139 Stat. 343 |
| Cancellation after 360 qualifying monthly payments; qualifying payment definition | same | HEA 455(q)(1)(D)-(F) |
| AGI definition (spouse included unless married filing separately); dependent = IRC sec. 152 | same | HEA 455(q)(4)(A), (B)(i)(II), (B)(v) |
| RAP and Tiered Standard only for loans made on or after July 1, 2026; Tiered Standard terms 10/15/20/25 years at $25,000/$50,000/$100,000 | same | Sec. 82001(b), HEA 455(d)(6)-(7), 139 Stat. 338-340 |
| Consolidation loans made on or after July 1, 2026: RAP or Tiered Standard only | same | Sec. 82001(e), HEA 455(g)(3) |
| ICR borrowers select a plan before July 1, 2028, start July 1, 2028, default to RAP (or IBR); ICR repeal effective July 1, 2028 | same | Sec. 82001(a) and (c)(3) |
| IBR: partial financial hardship removed, 15% of AGI over 150% of poverty line, effective on enactment (July 4, 2025); Parent PLUS consolidation exclusion through June 30, 2028 | same | Sec. 82001(f) |
| Deferment and forbearance limits and rehabilitation changes from July 1, 2027 | same | Secs. 82002, 82003 |
| RAP payments count for PSLF | same | Sec. 82004 |
| Graduate $20,500 / $100,000, professional $50,000 / $200,000, Parent PLUS $20,000 / $65,000 per dependent student, $257,500 lifetime, Grad PLUS ends, proration, school limits, interim exception | same | Sec. 81001, HEA 455(a)(3)-(8), 139 Stat. 334-337 |
| Enactment date July 4, 2025 | same | "Approved July 4, 2025." |
| SAVE ended by court order March 2026; servicer notices from July 1, 2026; 90 days plus final 30-day notice; default to Standard or Tiered Standard; all SAVE borrowers notified before end of 2026; auto pay by Dec. 31, 2026 gives 1% rate reduction through June 30, 2028; RAP covers Direct Loans disbursed at any time; PAYE/ICR end no later than July 1, 2028; Tiered Standard does not count for PSLF; Parent PLUS consolidation needs one ICR payment before July 1, 2028 for IBR | StudentAid.gov, "SAVE Plan Borrowers: FAQs About Choosing a Different Repayment Plan" (published October 2026), https://studentaid.gov/articles/save/ | Questions 1-4, 5, 7, 10 |
| Undergraduate annual limits ($5,500/$6,500/$7,500 dependent; $9,500/$10,500/$12,500 independent; subsidized $3,500/$4,500/$5,500), aggregates $31,000 / $57,500 (subsidized $23,000), graduate $20,500 annual and $138,500 aggregate before July 1, 2026, PLUS up to COA minus other aid before July 1, 2026 | FSA Handbook 2025-26, vol. 8 ch. 4, https://fsapartners.ed.gov/knowledge-center/fsa-handbook/2025-2026/vol8/ch4-annual-and-aggregate-loan-limits | Tables 1A, 1B, 1C, aggregate table, "Annual Loan Limits for Direct PLUS Loans" |
| Interim exception details; Parent PLUS not prorated | FSA, Frequently Asked Questions, Loan Limits (May 2026), https://fsapartners.ed.gov/sites/default/files/2026-05/FrequentlyAskedQuestionsLoanLimits.pdf | IE section |

## Not verified

- Final RAP regulations: this build did not confirm whether the Department has published final regulations for RAP servicing details (rounding, daily interest, allocation across loans). The tools say so.
- ed.gov press releases returned an Azure WAF challenge page to the build host and were not used.
- The money site https://assetloancalculator.com has no student loan page in its sitemap (checked 2026-11-02), so `more` links to https://www.mcpstamp.com/free-servers/.
