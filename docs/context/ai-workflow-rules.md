# AI Workflow Rules

These notes summarize the user's proportional workflow for this project. Follow the current user request and applicable `AGENTS.md` instructions when they differ from reference templates or these notes.

## Approach and Scoping

- Implement small, clearly specified changes directly.
- Ask clarifying questions before large coding changes or when material ambiguity affects the result.
- Do not introduce design/plan documents, approval cycles, or subagents for small changes unless requested.
- Read relevant files only; reuse information already inspected unless it may have changed.
- Keep changes focused and preserve unrelated local work.

## When to Split Work

Split unrelated changes or work that crosses several boundaries, such as a new import format plus a studio redesign. Confirm requirements for large changes before implementation. The existence of a template section is not authorization to add a feature, database, login flow, or deployment.

## Handling Missing Requirements

Use the current implementation and agreed scope as context. Ask when an unresolved choice materially changes behavior. Record useful unresolved decisions in [progress-tracker.md](progress-tracker.md), without converting suggestions into approved work.

## Files and Credentials

- Main app work normally belongs in `reframe/components/`, `app/`, and `lib/reframe/`.
- Starter/vendor files and `components/ui/` should only change when relevant to the task; the templates do not impose extra approval requirements.
- Never copy `.env` values, GitHub tokens, or private imported source into documentation, logs, or committed fixtures.
- Preserve the import, credential, sandbox, and storage boundaries described in [architecture.md](architecture.md).

## Verification

1. Add meaningful tests for behavior changes and bugs; avoid tests that merely match source text or duplicate coverage.
2. Run affected tests and relevant required checks after implementation.
3. Use one browser verification pass for interactive changes. Repeat checks only after a failure, relevant code change, or new evidence that makes the previous result insufficient.
4. Apply stronger verification to authentication, permissions, deletion, migrations, payments, and data integrity when those areas are involved.
5. Documentation-only edits need content and link review; they do not automatically require a new app build or browser session.
6. Stop when the requested behavior works and relevant checks pass. Report changes, checks, and remaining limitations briefly.

## Keeping Docs in Sync

Update the relevant context file when scope, architecture, storage, UI behavior, conventions, or verification status changes. Distinguish implemented behavior, fresh test results, earlier reported checks, and unverified external behavior. Keep tool output concise.
