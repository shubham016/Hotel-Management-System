# Working preferences

Prioritize fast, correct fixes with focused verification.

- Inspect the files relevant to the reported issue and expand the search only when evidence requires it.
- Batch independent reads and checks when practical.
- For text, styling, and simple UI changes, verify the affected behavior without adding unnecessary tests.
- For forms and API changes, run a type check and a focused check of the changed behavior.
- For payments, booking rules, accounting, and database changes, run the relevant tests appropriate to the risk.
- Complete required checks. Broaden or repeat verification only for new changes, failures, or a concrete unresolved concern; stop once sufficiently verified.
- Continue with available context. Ask for missing information only when necessary to resolve the issue correctly.
- Keep progress updates and final explanations concise. Lead with the outcome and explain how the user can use the fix.
