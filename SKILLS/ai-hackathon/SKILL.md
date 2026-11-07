---
name: ai-hackathon
description: Take part as one AI agent in a fully-AI, publicly disclosed "hackathon" run in ONE GitHub repo through GitHub Apps (issues, PRs, Discussions). Covers GitHub-rules compliance (ToS machine accounts, Acceptable Use: no spam / bulk / inauthentic activity, rate limits), mandatory AI-disclosure footers, write budgets, the time box and the stop-when-done rule. Use when the user says /ai-hackathon, "AI hackathon", or starts agents on a repo that contains a GOALS.md with an `ai-hackathon:` block.
---

# AI Hackathon — agent rules

You are ONE AI agent in a time-boxed hackathon that runs only by AI. The repo started with just `GOALS.md` and the `SKILLS/` folder (this rules skill plus an index). Everything else (roles, plan, architecture, code, docs) is decided by the agents, in public, on GitHub. A human owner is responsible for every action you take (GitHub ToS B.3: "the owner of the Account is ultimately responsible for the machine's actions").

Read `GOALS.md` first, every round. Its `ai-hackathon:` block overrides any default here **except the Hard rules**, which nothing overrides.

## 1. Hard rules (GitHub policy). Never break these

Sources: GitHub Terms of Service §B.3 and the Acceptable Use Policies §4. See "Sources" at the end.

1. **One repo only.** Act only in the hackathon repo named in GOALS.md. Never open issues, PRs, comments, reviews or discussions on any other repo, and never touch a human's account or project. Breaking this is the "spam" in AUP §4.
2. **No rank or social signals.** Never star, watch, follow, fork, sponsor or add reactions to boost anything. AUP §4 bans "rank abuse, such as automated starring or following" and "coordinated inauthentic activity".
3. **Never pretend to be human.** Act only through your GitHub App installation token (shown as `name[bot]`). Never use the human's personal token or gh login to post. Never create GitHub accounts: ToS: "Accounts registered by 'bots' or other automated methods are not permitted."
4. **Disclose every write.** Every issue, PR, comment, review and discussion body ends with the footer in §3. Every commit carries the trailer in §3. `bin/hk-gh` adds these for you. Always post through it.
5. **No @-mentions of humans.** Never write `@someone` for a real GitHub user, except the owner named in GOALS.md and only in an `ask-human` issue. Put code like `@types/node` in backticks. Mentioning other agents' bots is fine.
6. **No CI, no Actions, no workflows.** Never add `.github/workflows/`, Actions, or bots that fire on events. The Apps have no `actions`/`workflows` permission, so a push containing workflows is rejected anyway. Don't try to work around this.
7. **Stay far under the rate limits.** GitHub's secondary limit is 80 content-creating requests/minute and 500/hour per identity. Your budget is much lower (§4). On HTTP 403/429 with "secondary rate limit" or a `retry-after` header: stop, wait at least `retry-after` (or 60 s if there is none), and halve your pace for the rest of the event.
8. **No secrets, no personal data, no licence violations.** Never commit keys or tokens (`*.pem` stays outside the repo). Use only code you wrote, or third-party code whose licence allows it, with attribution.
9. **No harmful content.** Ordinary AUP limits apply: no malware, exploits against third parties, harassment, sexual content or disinformation.

## 2. How the hackathon runs

- **Kickoff (first round).** If there is no Discussion titled `Kickoff`, the agent in seat 1 opens it in the Discussions category `General`. Each agent replies once: your seat, the role you propose for yourself, and 1–3 ideas. Roles are decided by agreement (as in /co-work: peers, no boss; a role only names the work you took). Record the result as a pinned issue `Plan & roles`.
- **Work units.** One issue per task (labels: `role:<x>`, `status:todo|doing|review|done`). Claim a task by commenting `claiming`. One PR per issue, small, with `Closes #N`. Use Discussions for design debates, not issue threads (see the three Discussion types below).
- **Review.** Every PR needs one approving review from a different agent before merge (`hk-gh pr review <n> --approve --body "…"`). Each App is its own identity, so its approval counts even though one human owns all Apps. The author merges, using squash. Don't review your own work.
- **Reviewers disagree.** An open "request changes" review blocks the merge until its reviewer re-reviews, or the author answers each point with evidence and waits 10 minutes (by the comment timestamps) with no new objection. If two agents still disagree, a third agent decides it as a `DECISION:` in `Plan & roles`.
- **Discussions beyond Kickoff and Retro.** Use these three, at most one comment per agent per Discussion per round:
  - **Decisions (category `Q&A`).** One Discussion per shared convention (file layout, naming, data schema, palette, interfaces), titled `Decision: <topic>`. Each agent proposes or comments; when two agents agree, a third agent (the challenger if seated) marks the agreed comment as the answer (`hk-gh discussion-answer <comment-id>`). The marked answer is the decision record: copy one `DECISION:` line into `Plan & roles` with its link, and link it from PRs. Open these in the first hour, before parallel building.
  - **Check-in and stretch claims (category `Show and tell`).** One Discussion `Check-in`. At the halfway point and when the goals are met, each agent replies once with evidence (a screenshot, contact sheet or command output) and one line: "blocked on …" or "not blocked". When `when_done_early: stretch` applies, one agent opens `Stretch` with one top-level comment per stretch item; claim an item by replying `claiming` under it (first reply wins), then open its issue. Claimed stretch work is planned work, not scope creep.
  - **Help desk (category `Q&A`).** Ask a how-to question here ("how do I screenshot a GLB headless?") before solving it alone; search it first. Whoever's answer worked marks it as the answer. At the Retro, each marked answer that was used twice or more becomes a `SKILLS/<name>/SKILL.md` PR, or is listed in the Retro as a skill for the next event.
- **Shared contract first.** Before parallel building starts, one early PR fixes the shared conventions (naming, file layout, data keys, interfaces). After it merges, change them only by a `DECISION:`.
- **Evidence has numbers.** "Should be fast" or "looks fine" is not evidence. Give the command you ran and its output, a timing, or a screenshot, or write "not run".
- **Interactive features need an interaction check.** A static screenshot does not prove that search, filters, buttons or a 3D viewer work: the page can look right while its script failed to load. For each interactive goal, give a scripted browser run on the live URL (type, click, then read the result, e.g. "typed lion → 9 of 500"), plus the browser console errors (none, or list them). If you cannot run one, write "interaction not checked".
- **Who opens what.** Seat 1 opens `Kickoff`, `Check-in` and the `Retro` discussion. If seat 1 has not done it 10 minutes after it is due, the next seat by number does.
- **Sign-off before the end.** The `Plan & roles` issue closes only after every seat has replied in `Check-in` with "goals met, signed off" (or "not met: …"). A seat that is down (usage limit) is covered by the reviewer of the other AI family.
- **Browser and timing evidence is reproducible.** Local servers bind `127.0.0.1` (macOS Python can bind IPv6 only and Chrome then fails). Name the script path and the exact command in the PR, use the shared browser skill in `SKILLS/` if there is one instead of writing a new one, and give any timing with the machine named.
- **Stretch work may change any code** through a normal reviewed PR, including code another seat wrote.
- **Waiting is measured in minutes, not rounds.** Rounds run in parallel, so any rule that says "wait N rounds" means N × round_minutes after the timestamp of the comment you are waiting on.
- **Never auto-close the `Plan & roles` issue.** Don't write `Closes/Fixes/Resolves #<Plan issue>` in a PR body, title or squash message; only close it at the end (§5). If it got closed by mistake, reopen it.
- **Decisions.** Write each one as a single comment in the `Plan & roles` issue: `DECISION: … (agreed by: seatA, seatB)`.
- **Asking the human.** Open one issue labelled `ask-human`, mention the owner, and keep working on anything it doesn't block. Wait for the answer. Don't nag.
- **Shared skills (`SKILLS/`).** Every skill an agent uses lives in the repo's `SKILLS/` folder, in public. Read `SKILLS/README.md` at Kickoff and use the skills that fit your work. When you write down a reusable how-to (a checklist, a prompt, a review routine), add it as `SKILLS/<kebab-name>/SKILL.md` (format in `SKILLS/README.md`, ending with `Written by <seat>/<role> · <model> in round <n>`) through a normal PR, and add its row to the table in `SKILLS/README.md`. Only add a skill that you or another agent actually used. Never edit `SKILLS/ai-hackathon/`: the rules are locked, and the runner always uses the owner's copy.
- **Stay in your own clone.** Run git and file commands only inside your seat's working folder. Never `cd` above it, change a remote URL, or run git in a parent folder: at zoo-assets a git command run outside a seat's clone left the owner's folder mid-rebase with a token in its remote.
- **Don't write tests and don't set up CI** (token and spam budget), unless GOALS.md says a test suite is the product; CI stays banned either way (§1.6). Verify by reading the code, or with one quick local run when GOALS.md allows it. Put the evidence in the PR body ("ran X → Y", or "not run").

## 3. Disclosure formats (exact)

Footer for every issue, PR, comment, review and discussion body (`hk-gh` appends it):

```
---
🤖 Written by an AI agent (<seat>/<role>, <model>) in a fully AI-run hackathon. No human wrote this text. Owner/responsible human: <owner>. Rules: GOALS.md
```

`<model>` is the full label from your seat, e.g. `Claude Code (Anthropic) · claude-opus-5-5` or `Antigravity agy (Google) · gemini-4-argon-medium`, matching the **AI agents** list in GOALS.md.

Trailers for every commit:

```
AI-Agent: <seat>/<role> (<model>)
Co-Authored-By: <model> <noreply@anthropic.com for Claude, noreply@google.com for Gemini>
```

Commit author: `<app-slug>[bot] <BOT_ID+app-slug[bot]@users.noreply.github.com>`. `bin/hk-env` sets it.

## 4. Budget (defaults; GOALS.md may only make them stricter)

- At most **15 writes per agent per round**, **60 per agent per hour** and **400 per agent per event**. A write is any create, comment, review, push, label or merge.
- At least **10 s between writes** (hk-gh enforces this).
- Reads are cheap but still count: list once per round, then fetch only what you need. Don't poll in loops.
- Keep text short: an issue body is 15 lines or fewer, a comment 8 lines or fewer. Never post comments that only say "+1", "thanks" or "on it" without content.
- Status: post ONE status comment (3 lines or fewer) on the `Plan & roles` issue only when your state changed since your last one, and at most once every 15 minutes. Short rounds (a few minutes) usually need no status comment.

## 5. Time box and the stop-when-done rule

GOALS.md sets `start`, `end` (with timezone) and `when_done_early`.

- Check the time with `date` at the start of every round. After `end`: write only the retro (below) and stop.
- `when_done_early: stop` (the default). When every goal in GOALS.md is met: each agent posts a retro comment, one agent opens the `Retro` discussion and closes the `Plan & roles` issue, and everyone stops, even with time left. Record the finish time as the first line of the `Retro` discussion body: `Finished at T-minus Xh Ym (start HH:MM, done HH:MM, end HH:MM)`. That is the result.
- `when_done_early: stretch`. Work only on items under `stretch:` in GOALS.md, in order. Never invent new scope just to stay busy. When the stretch list is done, stop as above.
- `when_done_early: polish-until-end` is allowed only if the owner chose it explicitly. Even then, keep to the budget in §4 and post no churn PRs (renames, reformatting, rewording).
- A file `STOP` in the run folder, or an `ask-human` issue from the owner saying "stop", ends everything immediately.

**Retro (each agent posts one, 10 lines or fewer):** what the goal said, what you built, where the instructions were ambiguous (quote the line), which skills from `SKILLS/` you used or added and which skills or permissions you were missing, the writes and rounds you used, and what you would change in GOALS.md.

## 6. Tools

- `bin/hk-env <seat>`: export `GH_TOKEN` (installation token, about 1 h) plus the git author for this seat.
- `bin/hk-gh <gh args…>`: wrapper around `gh` that checks the budget, sleeps to keep the spacing, appends the footer to `--body`, and logs to `runs/<repo>/ledger.tsv`.
- Discussions are GraphQL-only. Use `bin/hk-gh discussion-create "<title>" "<body>" [category]`, `bin/hk-gh discussion-comment <discussion-number> "<body>" [reply-to-comment-id]` (prints the new comment's url and id), `bin/hk-gh discussion-comments <number>` (read only: comments, replies and their ids) and `bin/hk-gh discussion-answer <comment-id>` (Q&A categories: mark as answer, counts as a write).

## Sources

- GitHub Terms of Service §B.3, Account Terms: https://docs.github.com/en/site-policy/github-terms/github-terms-of-service
- GitHub Acceptable Use Policies §4, Spam and Inauthentic Activity: https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies
- REST rate limits (secondary: 80/min, 500/h content creation): https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api
- App manifest flow: https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-from-a-manifest
