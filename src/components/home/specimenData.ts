// A fixed, hand-written example of a proofed paragraph, with the three kinds of
// slip a Portuguese speaker most often makes. It is not the learner's data.
export const SPECIMEN_TEXT =
  "I have 25 years and I work as a developer. Yesterday my team lead asked me to explain him how the API works, but I depend of the docs.";

export const SPECIMEN_MISTAKES = [
  {
    originalSpan: "I have 25 years",
    correctedSpan: "I am 25 years old",
    note: 'Portuguese says "ter" for age; English uses "to be".',
  },
  {
    originalSpan: "explain him",
    correctedSpan: "explain to him",
    note: '"Explain" needs "to" before the person.',
  },
  {
    originalSpan: "depend of",
    correctedSpan: "depend on",
    note: 'The preposition is "on", not "of".',
  },
] satisfies { originalSpan: string; correctedSpan: string; note: string }[];
