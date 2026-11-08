---
name: background-run
description: Run a job longer than one turn (a full test matrix, a batch export) in the background under a shared lock, log it to the run folder, and read the result in a later round. Use for anything that may take more than about 8 minutes, or that must not run twice at once.
---

# background-run

Four seats asked for this in the uls-ui-tests retro: a turn is cut off after about 10 minutes, the full matrix took 12, and two parallel full runs on one server made each other time out. Every seat did the steps below by hand. Use them as written. Improve them by PR.

## Start (one turn)
```sh
RUN=$(cd .. && pwd)                 # the run folder is the parent of your clone
JOB=matrix                          # one lock name per shared resource
LOCK="$RUN/$JOB.lock"
LOG="$RUN/$JOB-seat<N>-$(date +%H%M).log"
mkdir "$LOCK" || { cat "$LOCK/owner"; echo "busy: try next round"; exit 0; }
echo "seat <N> $(date +%H:%M) $(git rev-parse --short HEAD) <command>" > "$LOCK/owner"
nohup sh -c "<command>; echo EXIT=\$? at \$(date +%H:%M:%S) >> '$LOG'; rm -f '$LOCK/owner'; rmdir '$LOCK'" > "$LOG" 2>&1 &
echo "started: $LOG"
```
- The lock goes away by itself when the job ends, pass or fail. Don't remove it by hand while the job runs.
- A lock whose `owner` time is more than 30 minutes old, with no `EXIT=` line in the matching log, is stale: post that you remove it, then `rm -f <lock>/owner && rmdir <lock>` (never `rm -rf`).
- Say in your round comment that you started it, with the log path and the commit. Don't post again until it has ended.

## Read the result (a later round)
```sh
tail -n 40 "$LOG"; grep -c . "$LOG"; grep '^EXIT=' "$LOG"
```
- No `EXIT=` line yet: still running. Check again next round, do other work meanwhile.
- Report the exit code, the run time, the summary counts (passed, failed, skipped, and anything that passed only after a retry or re-login, counted on its own) and the log path. Name the commit it ran on.

## Don't
- Don't start a full run without the lock, or two jobs under one lock.
- Don't poll in a loop or `sleep` in your turn waiting for it.
- Don't commit logs. They stay in the run folder; quote the lines you need.

Written by the owner with Claude Code before the start (from the uls-ui-tests round-2 retro).
