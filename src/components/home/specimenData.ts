// Fixed, hand-written examples of proofed paragraphs, each with three of the
// slips a Portuguese speaker most often makes at work. Not the learner's data.
// Spans are listed in the order they appear in the text.
export type SpecimenMistake = {
  originalSpan: string;
  correctedSpan: string;
  note: string;
};

export type SpecimenScenario = {
  id: string;
  label: string;
  text: string;
  mistakes: SpecimenMistake[];
};

export const SPECIMEN_SCENARIOS: SpecimenScenario[] = [
  {
    id: "standup",
    label: "Standup update",
    text: "Yesterday I fixed the bug on the login page and today I will to work on the tests. I am waiting the review since Monday, so I did not receive any feedback yet.",
    mistakes: [
      {
        originalSpan: "will to work",
        correctedSpan: "will work",
        note: 'After "will" the verb comes bare, with no "to".',
      },
      {
        originalSpan: "waiting the review",
        correctedSpan: "waiting for the review",
        note: '"Wait" takes "for", unlike "esperar" in Portuguese.',
      },
      {
        originalSpan: "did not receive any feedback yet",
        correctedSpan: "have not received any feedback yet",
        note: 'With "yet", English uses the present perfect.',
      },
    ],
  },
  {
    id: "review",
    label: "Code review comment",
    text: "I think this function is doing too much things. Can you explain me why you used a loop here? Maybe we can make it more simple, but I am not sure for the performance.",
    mistakes: [
      {
        originalSpan: "too much things",
        correctedSpan: "too many things",
        note: '"Things" is countable, so it takes "many".',
      },
      {
        originalSpan: "explain me why",
        correctedSpan: "explain to me why",
        note: '"Explain" needs "to" before the person.',
      },
      {
        originalSpan: "not sure for the performance",
        correctedSpan: "not sure about the performance",
        note: 'The preposition after "sure" is "about".',
      },
    ],
  },
  {
    id: "email",
    label: "Email to a client",
    text: "Dear Mr. Smith, I am writing to inform that the invoice was already sent. Please, let me know if you have any doubt, and I will be available in the next week.",
    mistakes: [
      {
        originalSpan: "inform that",
        correctedSpan: "inform you that",
        note: '"Inform" needs its object: who is being informed.',
      },
      {
        originalSpan: "any doubt",
        correctedSpan: "any questions",
        note: 'Here "dúvida" is "question", not "doubt".',
      },
      {
        originalSpan: "in the next week",
        correctedSpan: "next week",
        note: 'Time words like "next week" take no preposition.',
      },
    ],
  },
];
