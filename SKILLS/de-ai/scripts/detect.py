#!/usr/bin/env python3
"""English "AI tone" detector. Report only; it never rewrites.
Usage: detect.py FILE   (or pipe text on stdin)
Two levels: FIX = usually worth changing; NOTE = fingerprint, judge in context.
Idea credit: lieflat-less-ai-tone (CC BY-NC 4.0), patterns here are our own, for English.
"""
import re, sys, statistics

FIX = [
 ("stock word", r"\b(delve[sd]?|tapestry|testament to|pivotal|seamless(?:ly)?|leverag(?:e|es|ed|ing)|vibrant|intricate|realm|embark(?:s|ed)?|unlock(?:s|ed)? the|holistic|game[- ]changer|elevate[sd]?|underscore[sd]?|showcas(?:e|es|ed|ing)|meticulous(?:ly)?|bustling|ever[- ]evolving|navigat(?:e|ing) the (?:complex|landscape)|robust|streamlin(?:e|ed|ing))\b",
  "use the plain word (use, show, key, careful, strong) or cut it"),
 ("filler opener", r"\b(it'?s (?:important|worth|crucial) (?:to note|noting|to remember)|it should be noted|in today'?s (?:fast-paced|digital|modern) (?:world|landscape|age)|let'?s dive in|without further ado|at the end of the day|in the (?:world|realm) of)\b",
  "delete it and start with the point"),
 ("chatbot voice", r"\b(great question|certainly!|absolutely!|i hope this helps|feel free to|happy to help|let me know if you (?:have any|need any)|i'?d be happy to)\b",
  "delete; say the next concrete step instead, or nothing"),
 ("empty wrap-up", r"(?:^|\n)\s*(in conclusion|in summary|overall|ultimately|to sum up)\b,?",
  "cut the summary if it repeats the text; keep only a new decision/ask"),
 ("plays a role", r"\b(plays? an? (?:crucial|key|vital|important|pivotal) role|serves as an?)\b",
  "say what it actually does"),
 ("stacked hedge", r"\b(may potentially|could possibly|might perhaps|may possibly|potentially could)\b",
  "keep one hedge, or state it plainly if you know"),
 ("whether-you're", r"\bwhether you'?re (?:a|an) [^.,]{1,40},? or\b",
  "name the actual reader"),
]
NOTE = [
 ("not X but Y", r"\b(not (?:just|only|merely) [^.]{1,60}?,? but(?: also)?|isn'?t (?:just )?about [^.]{1,60}?[;,—-]+ it'?s about|it'?s not [^.]{1,40}?[,;—-]+ it'?s)\b",
  "fine if you really contrast two things; cut if the 'not' half is a straw man"),
 ("bold-label bullet", r"(?m)^\s*[-*]\s+\*\*[^*]{1,40}:?\*\*:?",
  "OK in docs; in a comment or chat, write a sentence"),
 ("emoji heading", r"(?m)^\s*(?:#+\s*)?[\U0001F300-\U0001FAFF☀-➿]",
  "drop emoji from headings in work text"),
]

def lines_of(text, start):
    return text.count("\n", 0, start) + 1

def main():
    text = open(sys.argv[1], encoding="utf-8").read() if len(sys.argv) > 1 else sys.stdin.read()
    hits = []
    for level, rules in (("FIX", FIX), ("NOTE", NOTE)):
        for name, pat, tip in rules:
            for m in re.finditer(pat, text, re.I):
                lead = len(m.group(0)) - len(m.group(0).lstrip())
                hits.append((lines_of(text, m.start() + lead), level, name, m.group(0).strip(), tip))
    words = len(re.findall(r"[A-Za-z']+", text)) or 1
    dashes = text.count("—") + len(re.findall(r" -- ", text))
    per1k = dashes * 1000 / words
    sents = [s for s in re.split(r"(?<=[.!?])\s+", re.sub(r"\s+", " ", text)) if len(s.split()) > 2]
    lens = [len(s.split()) for s in sents]
    triads = len(re.findall(r"\b\w+(?: \w+)?, \w+(?: \w+)?,? and \w+", text))

    for ln, level, name, quote, tip in sorted(hits):
        print(f"L{ln:<3} {level:<4} {name}: \"{quote}\" -> {tip}")
    print("---")
    print(f"words {words} | FIX {sum(h[1]=='FIX' for h in hits)} | NOTE {sum(h[1]=='NOTE' for h in hits)}")
    print(f"em-dashes {dashes} ({per1k:.1f}/1k words; NOTE if >5)")
    if len(lens) >= 4:
        sd = statistics.pstdev(lens)
        print(f"sentence length avg {statistics.mean(lens):.0f}, spread {sd:.1f} (NOTE if spread <4: every sentence the same size)")
    print(f"'X, Y and Z' triads {triads} (NOTE if more than ~1 per 150 words)")

if __name__ == "__main__":
    main()
