Run a multi-agent review of the staged changes (or the full branch diff vs main if nothing is staged).

## Steps

1. Run `git diff --cached --name-only` to get staged files. If empty, run `git diff main...HEAD --name-only` to get all files changed on this branch.

2. Based on the changed files, determine which agents to invoke:
   - **security-reviewer** → if any file matches `apps/api/src/routes/*`, `apps/api/src/middleware/*`, `apps/api/src/lib/auth*`
   - **migration-reviewer** → if any file matches `apps/api/drizzle/*.sql`
   - **worker-reviewer** → if any file matches `apps/api/src/workers/*`
   - **api-contract-reviewer** → if any file matches `apps/api/src/routes/*`

3. For each relevant agent, read the full diff of its matching files with `git diff --cached -- <files>` (or `git diff main...HEAD -- <files>` if nothing staged).

4. Invoke all relevant agents **in parallel**, passing each agent the diff content of its relevant files.

5. Aggregate and present all findings in a single report:

```
## Review Report

### 🔒 Security  
[findings or "LGTM"]

### 🗄️ Migration Safety  
[findings or "not applicable"]

### ⚙️ Worker Reliability  
[findings or "not applicable"]

### 🔗 API Contract  
[findings or "LGTM"]

---
**Summary**: X issues found (Y critical, Z high, ...)
```

If no relevant agents apply to the changed files, say so explicitly.
