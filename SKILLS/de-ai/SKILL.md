---
name: de-ai
description: Remove "AI tone" from user-facing English text (seed pages, README, UI labels, docs) without changing its facts. Detect with the script, fix with minimal edits, re-check. Use for goal pack (e) "plain-language writing" and when reviewing any PR that changes user-facing text.
---

# de-ai (English) — hackathon edition

The owner's own writing rules, shared with the agents (adapted from the owner's personal skill: the "wait for the user" step is replaced by agent self-checks). Idea credit: lieflat-less-ai-tone (CC BY-NC 4.0, Chinese-only); the rules and patterns here are our own, for English.

## Steps
1. **Detect.** Save the text to a temp file (outside the repo) and run
   `python3 -I SKILLS/de-ai/scripts/detect.py <file>`.
   Then read the text yourself: the script only catches surface patterns.
2. **List the problems.** For each: quote the passage, name the issue, give the specific fix.
   - FIX: usually worth changing (stock words, filler openers, chatbot voice, empty wrap-ups, "plays a key role", stacked hedges).
   - NOTE: fingerprints, judge in context (em-dash density, "not X but Y", bold-label bullets, triads, same-length sentences).
   Never write "make it more natural" without the exact change.
3. **Rewrite with minimal edits.** Keep every fact, number, link and name. Don't add facts you don't have.
4. **Re-check.** Run the detector again; put the before/after counts in the PR body.
5. **Reviewers:** on PRs that change user-facing text, run the detector on the changed text and quote any FIX hits.

## Rules (honesty first)
- A pattern hit is not proof. Keep a phrase when it is the clearest way to say it.
- Don't delete useful restatements, list intros, or hedges that carry real uncertainty.
- Em-dashes: flag density, replace some with commas/periods/colons, don't ban them.
- Shorter usually wins: cut openers, praise, summaries that repeat, and offers ("feel free to…").
- Prefer plain verbs: use (not leverage), show (not showcase), help (not empower), key/main (not pivotal/crucial).
- Name things for what they do: "Your pages stay in this browser", not "Local Sovereignty".
- Never apply this to quotes, code, logs or other people's words.
