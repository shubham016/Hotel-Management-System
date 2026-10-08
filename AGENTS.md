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

# Research and completion standard

- Apply this standard without unnecessary delay: keep research brief and specific to the task, reuse relevant sources already reviewed when still applicable, and stop once there is enough evidence to make a sound implementation choice. Do not turn routine changes into broad audits.
- Before creating or changing functionality or design, research established professional hotel and restaurant systems and their documented workflows. Prefer official product documentation and recognized design systems; briefly explain the relevant findings and how they apply to this project.
- Follow professional hospitality procedures and design patterns, adapting them to the hotel's requirements, existing architecture, permissions, and property/company boundaries.
- After implementation, verify the feature is present and works in the actual application. Check the affected UI, API, authorization, database persistence, associations, and connected workflows as applicable. For design-only work, check the affected rendering and interactions; database checks apply when data is affected.
- Verify relevant success and failure paths with checks proportional to the change's risk. Use isolated test data for destructive or financial checks; do not change real operational data merely to verify a feature.
- Batch independent research and checks when practical. Verify only the affected behavior and its direct dependencies; expand checks only for failures, new changes, or a concrete unresolved risk. Stop once the required checks provide sufficient evidence.
- Treat working integration as part of completion. Fix issues found by the relevant checks before reporting completion. Clearly identify any unverified behavior, blockers, or remaining configuration; do not describe a feature as fully functional when required verification is incomplete.
