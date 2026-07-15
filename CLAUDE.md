## Model routing

Route tasks by the work, not the default: a mechanical task goes to worker-bulk even inside a taste-heavy job. A clause checked by a script routes to checker-deterministic; a clause checked by a rubric routes to checker-judgment.

| Tier   | Model Nicknames                         | Use for                                                                               |
| ------ | --------------------------------------- | ------------------------------------------------------------------------------------- |
| haiku  | worker-bulk, checker-deterministic      | Mechanical, zero-judgment work; and all deterministic checks (they only run scripts). |
| sonnet | worker-standard                         | Clear-spec implementation judged on correctness.                                      |
| opus   | worker-craft, checker-judgment, auditor | User-facing/taste work; judgment checks; auditing your own work.                      |
| fable  | (override only)                         | The final escalation rung, and genuinely hard, ambiguous problems. Reserved.          |

<!-- working-memory:start -->

## Working Memory

**AGENT INSTRUCTION:** before deciding what to read, scan the on-demand table under `## Working Memory` in [`AGENTS.md`](AGENTS.md). If your task matches a row, that file is required reading before you proceed.

Always read `_working-memory/activeContext.md` on session start. AGENTS.md is the canonical source for the on-demand table and update rules.
To sync working memory, run `/update-working-memory` or invoke the `working-memory-synchronizer` agent.

<!-- working-memory:end -->
