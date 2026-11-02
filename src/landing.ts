// GET / page for the hosted Worker.
const TOOLS: Array<[string, string]> = [
  ["calculate_rap_payment", "Repayment Assistance Plan payment: 1% to 10% of AGI by band, minus $50 per dependent, $10 minimum, with the interest subsidy and $50 principal match."],
  ["compare_rap_vs_standard", "RAP against the Tiered Standard plan (10/15/20/25 years by balance) and the 10-year Standard plan: monthly payment, total paid, amount cancelled after 360 payments."],
  ["get_federal_loan_limits", "Loan limits before and after July 1, 2026: Grad PLUS ends, graduate $20,500/$100,000, professional $50,000/$200,000, Parent PLUS $20,000/$65,000, $257,500 lifetime cap."],
  ["get_plan_transition_dates", "When SAVE, PAYE and ICR borrowers must move, and every dated step to July 1, 2028."],
];

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function landingPage(origin: string): string {
  const mcp = `${origin}/mcp`;
  const rows = TOOLS.map(([n, d]) => `<tr><td><code>${n}</code></td><td>${esc(d)}</td></tr>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Student Loan RAP Calculator MCP</title>
<meta name="description" content="MCP server for the federal student loan Repayment Assistance Plan (RAP), new 2026 loan limits and the SAVE, PAYE and ICR transition dates from the One Big Beautiful Bill Act.">
<style>:root{--bg:#fff;--fg:#1a1a1a;--muted:#555;--line:#ddd;--code:#f4f4f4}
@media (prefers-color-scheme:dark){:root{--bg:#141414;--fg:#eee;--muted:#aaa;--line:#333;--code:#222}}
body{background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,sans-serif;max-width:760px;margin:0 auto;padding:24px 16px}
code,pre{background:var(--code);border-radius:4px;font-size:14px}pre{padding:10px;overflow-x:auto}code{padding:1px 4px}
table{border-collapse:collapse;width:100%}td{border-top:1px solid var(--line);padding:8px 6px;vertical-align:top}p.small{color:var(--muted);font-size:14px}a{color:inherit}</style></head>
<body><h1>Student Loan Repayment Assistance Plan calculator MCP server</h1>
<p>Gives an AI assistant the federal student loan rules from the One Big Beautiful Bill Act (P.L. 119-21) that are newer than its training data: the Repayment Assistance Plan (RAP) payment formula, the interest subsidy and principal match, cancellation after 360 payments, the Tiered Standard plan, the loan limits that started July 1, 2026, and the dates SAVE, PAYE and ICR borrowers must move. Every rule is copied from the statute text and StudentAid.gov.</p>
<h2>Connect</h2>
<p>Hosted endpoint (Streamable HTTP, no sign-in, no token). Paste it into Claude.ai custom connectors or ChatGPT developer mode.</p>
<pre>${esc(mcp)}</pre>
<p>Claude Code</p><pre>claude mcp add --transport http student-loan-rap ${esc(mcp)}</pre>
<p>Local (stdio)</p><pre>npx -y github:theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp</pre>
<h2>Tools</h2><table>${rows}</table>
<p>More free data servers: <a href="https://www.mcpstamp.com/free-servers/?utm_source=mcp&amp;utm_medium=student-loan-repayment-assistance-plan-calculator-mcp">mcpstamp.com</a>.
Source: <a href="https://github.com/theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp">github.com/theluckystrike/student-loan-repayment-assistance-plan-calculator-mcp</a>.</p>
<p class="small">General information, not financial advice. Part of the Zovo MCP collection: <a href="https://mcp.zovo.one">mcp.zovo.one</a>.</p>
</body></html>`;
}
