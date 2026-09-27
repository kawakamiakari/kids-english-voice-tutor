/**
 * Original (not reproduced-from-the-real-test) practice content for the EIKEN
 * Grade 3 (英検3級) secondary/speaking test, which is the first grade that adds
 * a face-to-face interview. Structure mirrors the real format: read a short
 * passage aloud, answer a question about it, describe a picture and predict
 * what happens next, then answer two personal questions.
 */

export type EikenPassage = {
  id: string;
  text: string;
  question: string;
};

export type EikenPicture = {
  id: string;
  /** Key into the illustration registry, see components/eiken/illustrations.tsx. */
  illustrationId: string;
  descriptionPrompt: string;
  followUpPrompt: string;
  /** Hidden ground truth, only sent to the model for the end-of-session feedback - never shown to the child. */
  factCaption: string;
};

export const EIKEN3_PASSAGES: EikenPassage[] = [
  {
    id: "p1",
    text: "Yuki likes animals very much. Every Saturday, she goes to the park near her house. She feeds the birds there. Yesterday, she saw a new dog at the park.",
    question: "Why did Yuki go to the park?",
  },
  {
    id: "p2",
    text: "Tom's family went camping last weekend. They set up a tent by the lake. At night, they cooked dinner over a fire. Tom saw many stars in the sky.",
    question: "What did Tom's family do at night?",
  },
  {
    id: "p3",
    text: "Mika wants to be a good swimmer. She practices at the pool every Sunday. Her coach teaches her new ways to swim faster. Mika hopes to join a swimming contest next year.",
    question: "What does Mika want to do next year?",
  },
];

export const EIKEN3_PICTURES: EikenPicture[] = [
  {
    id: "pic1",
    illustrationId: "readingUnderTree",
    descriptionPrompt: "Please look at the picture. What is the boy doing?",
    followUpPrompt: "What do you think the boy will do after this?",
    factCaption: "A boy is reading a book under a tree. A dog is sleeping next to him.",
  },
  {
    id: "pic2",
    illustrationId: "wateringGarden",
    descriptionPrompt: "Please look at the picture. What is the girl doing?",
    followUpPrompt: "What do you think will happen to the flowers?",
    factCaption: "A girl is watering flowers in a sunny garden.",
  },
  {
    id: "pic3",
    illustrationId: "picnicFamily",
    descriptionPrompt: "Please look at the picture. What are the people doing?",
    followUpPrompt: "What do you think they will do after lunch?",
    factCaption: "A family is having a picnic in the park and eating sandwiches.",
  },
  {
    id: "pic4",
    illustrationId: "bikeInRain",
    descriptionPrompt: "Please look at the picture. What is the boy doing?",
    followUpPrompt: "How do you think the boy feels?",
    factCaption: "A boy is riding his bicycle in the rain, wearing a red raincoat.",
  },
];

export const EIKEN3_PERSONAL_QUESTIONS: string[] = [
  "What did you do last weekend?",
  "Do you like reading books? Why or why not?",
  "What is your favorite season, and why?",
  "What do you usually do after school?",
  "Do you have any pets? Tell me about them.",
];

export function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

export function pickTwoDistinct<T>(items: readonly T[]): [T, T] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return [shuffled[0], shuffled[1]];
}
