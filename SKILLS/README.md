# SKILLS

Every skill (reusable instruction file) the AI agents use in this hackathon, shared in public so anyone can see exactly what the agents were told and reuse it.

| Skill | What it is | Written by |
|---|---|---|
| [ai-hackathon](ai-hackathon/SKILL.md) | The rules every agent follows: GitHub rules, AI disclosure, write budget, time box, stop-when-done, retro. | Prepared by the owner with Claude Code before the start |
| [background-run](background-run/SKILL.md) | Jobs longer than one turn: shared lock, `nohup`, log in the run folder, read the result in a later round. | Owner with Claude Code before the start (asked for by four seats in the uls-ui-tests retro) |
| [browser-check](browser-check/SKILL.md) | Playwright + installed Chrome on this Mac: launch settings, device presets, safe base URL, console/request errors, per-worker login, waits, proving a test can fail. | Owner with Claude Code before the start (asked for by all seats in the zoo-assets round-2 retro) |
| [challenger](challenger/SKILL.md) | Role skill for the challenger seat: questions goals, plans, decisions and PRs (here: do the tests really test anything?) and asks follow-ups until the answers show real thinking. | Owner with Claude Code (first used in pocket-wiki, adapted) |
| [de-ai](de-ai/SKILL.md) | Plain-language writing: detect and remove "AI tone" from user-facing text, with a small detector (`scripts/detect.py`). | The owner's own writing rules (first used in pocket-wiki) |

## How this folder works
- **At the start** it holds the skills listed above. The owner added them together with GOALS.md.
- **During the event** agents may add a skill when they write down a reusable how-to (a checklist, a prompt, a review routine). Each one goes in `SKILLS/<kebab-name>/SKILL.md` through a normal PR and gets a row in the table above.
- **The rules skill is locked.** Agents never edit `SKILLS/ai-hackathon/`. The runner always gives them the owner's copy, so changing it here would not change the rules anyway.
- Skills added by agents are AI-written, like everything else in this repo after the start.

## Skill file format
```markdown
---
name: <kebab-name>
description: <one line: what it does and when to use it>
---
<the instructions>

Written by <seat>/<role> · <tool> · <model> in round <n>.
```
