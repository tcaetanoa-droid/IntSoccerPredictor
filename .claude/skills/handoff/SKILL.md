---
name: handoff
description: Use when the user wants to hand the current conversation off to a fresh agent or a new session so work continues without losing context. Triggers include "create a handoff", "hand this off", "I'm running low on context", "continue this in a new chat", "compact this for another agent", "pick this up later". Writes a self-contained handoff doc to a temp file.
argument-hint: "What will the next session focus on? (optional)"
disable-model-invocation: true
---

# Handoff

Compact the current conversation into a self-contained handoff document so a fresh agent can pick up the work with no loss of context. The next agent should be able to read one file and keep going.

## Steps

1. **Read the arguments.** If `$ARGUMENTS` is present, treat it as the next session's focus. Bias the whole doc toward it: lead with the relevant thread, trim unrelated context.
2. **Scan the conversation** for the goal, what's done, what's in progress (and exactly where it stopped), decisions made, open questions, and the single most important next action.
3. **Reference, don't duplicate.** If something already lives in an artifact (`docs/ROADMAP.md`, `docs/REPORTS.md`, a spec under `docs/superpowers/specs/`, a plan, a commit, a memory file), point to it by path rather than restating it. The next agent can read those directly.
4. **Redact** API keys, passwords, tokens, and PII. Never copy secret values into the handoff.
5. **Write the doc** to `"$TMPDIR/intsoccer-handoff-<short-slug>.md"` using the template below (slug derived from the task, e.g. `website-brainstorm`). Echo the full absolute path back so the user can paste it into the next session. The handoff is a temp file, not a repo file: do not commit it.
6. **Tell the user** the path plus one line on how to use it: "Start a new session and say: read <path> and continue."

## Output template

```markdown
# Handoff: <task in a few words>
Generated: <date> · Next session focus: <from arguments, or "continue current work">

## Goal
<one or two sentences: what we're ultimately trying to achieve>

## State right now
- Done: <bullets>
- In progress: <what's mid-flight, and where it stopped>
- Blocked / waiting on: <external deps, or "none">

## Next action
<the single most important thing the next agent should do first, concretely>

## Key files & artifacts
<paths the next agent must read. Reference, don't repeat. e.g.>
- `docs/ROADMAP.md` — component status
- <the spec/plan relevant to this task>

## Decisions & constraints made this session
- <decision + one-line why, or "none">

## Open questions
- <unresolved items, or "none">

## Suggested skills for the next agent
<skills the next agent will likely need, with why. e.g.>
- `brainstorming` — if a design conversation is mid-flight
- `executing-plans` — if a plan file is mid-execution
```

## Notes

- Keep it scannable. A handoff longer than the work it describes has failed. Aim for something a fresh agent reads in under a minute.
- The next agent will already have `CLAUDE.md` and the memory files; list only the extra files this task touches.
- If the conversation is too thin to hand off (work barely started), say so instead of padding the doc.
- No em dashes anywhere in the generated doc. Use periods, commas, or colons.
