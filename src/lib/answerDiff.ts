export type DiffSegment = { text: string; kind: "same" | "removed" | "added" };

function tokenize(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

// Words compare case- and punctuation-insensitively, the same leniency the
// grader applies to whole answers ("Done." vs "done").
function wordKey(word: string): string {
  return word.toLowerCase().replace(/[.,!?;:"]/g, "");
}

// Longest-common-subsequence table over word keys; both the edit distance and
// the diff walk read from it.
function lcsTable(a: string[], b: string[]): number[][] {
  const table = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      table[i][j] =
        wordKey(a[i]) === wordKey(b[j]) ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
    }
  }
  return table;
}

function wordDistance(a: string[], b: string[]): number {
  return a.length + b.length - 2 * lcsTable(a, b)[0][0];
}

// Picks the acceptable answer needing the fewest word insertions/deletions to
// reach from the user's answer, so a near-miss is compared against the version
// it was actually close to.
// Ties keep the generator's order.
export function findClosestAnswer(userAnswer: string, acceptableAnswers: string[]): string | null {
  const userWords = tokenize(userAnswer);
  let best: { answer: string; distance: number } | null = null;
  for (const answer of acceptableAnswers) {
    const distance = wordDistance(userWords, tokenize(answer));
    if (!best || distance < best.distance) best = { answer, distance };
  }
  return best?.answer ?? null;
}

// Word-level diff from the user's answer to the expected one: "removed" words
// were in the user's answer but not expected, "added" words were missing.
// Adjacent words of the same kind are merged into one segment.
export function diffWords(userAnswer: string, expected: string): DiffSegment[] {
  const a = tokenize(userAnswer);
  const b = tokenize(expected);
  const table = lcsTable(a, b);
  const segments: DiffSegment[] = [];

  function push(kind: DiffSegment["kind"], word: string) {
    const last = segments[segments.length - 1];
    if (last?.kind === kind) last.text += ` ${word}`;
    else segments.push({ kind, text: word });
  }

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (wordKey(a[i]) === wordKey(b[j])) {
      push("same", b[j]);
      i++;
      j++;
    } else if (table[i + 1][j] >= table[i][j + 1]) {
      push("removed", a[i++]);
    } else {
      push("added", b[j++]);
    }
  }
  while (i < a.length) push("removed", a[i++]);
  while (j < b.length) push("added", b[j++]);
  return segments;
}
