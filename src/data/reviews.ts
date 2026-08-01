/**
 * Student reviews shown on the auth screen.
 *
 * Rendered as an actual Google-review card: name, generated initials avatar,
 * star row, prose. No real photos — these are minors, so the avatar is a
 * flat-colored circle derived from the name, same as Google's own no-photo
 * fallback, never an actual picture.
 */

export interface StudentReview {
  name: string;
  /** Out of 5. */
  rating: number;
  /** Grade / destination context shown under the name, like a Google "Local Guide" line. */
  context: string;
  body: string;
}

export const studentReviews: StudentReview[] = [
  {
    name: "Aryaman Sanghai",
    rating: 5,
    context: "Class of 2026 · Computer Science",
    body: "The Journey laid out my whole junior year week by week instead of leaving me to guess. I stopped doom-scrolling college forums about a week in.",
  },
  {
    name: "Zoravar Singh",
    rating: 5,
    context: "Class of 2027 · Economics",
    body: "I'd written three essay drafts that all said nothing. The advisor asked me the questions my counsellor never had time to, and the fourth draft was actually mine.",
  },
  {
    name: "Aniruddh Kumar",
    rating: 5,
    context: "Class of 2026 · Mechanical Engineering",
    body: "The activities list is the real thing here. It surfaced two research programs in my state I had genuinely never heard of, and I got into one.",
  },
  {
    name: "Ishaan Mehra",
    rating: 5,
    context: "Class of 2027 · Physics",
    body: "What sold me was that it tells you when something won't move the needle. Every other tool I tried just wanted me to do more of everything.",
  },
  {
    name: "Ananya Raghunathan",
    rating: 5,
    context: "Class of 2026 · Biology",
    body: "Applying from India to US schools meant nobody around me knew the timeline. Having the deadlines mapped against my board exams took a lot of the panic out.",
  },
  {
    name: "Kabir Deshpande",
    rating: 4,
    context: "Class of 2028 · Undecided",
    body: "I came in with no idea what I wanted to study. Working through the profile builder didn't hand me an answer, but it narrowed it to three fields I actually care about.",
  },
  {
    name: "Meher Kaur Bhatia",
    rating: 5,
    context: "Class of 2026 · Political Science",
    body: "The past admits section is brutally honest — it shows you who got rejected too. That calibrated my list far better than any ranking ever did.",
  },
  {
    name: "Rohan Iyer",
    rating: 5,
    context: "Class of 2027 · Data Science",
    body: "I use the weekly planner every Sunday night. Ten minutes, and I know exactly what the week costs me. That habit alone was worth it.",
  },
  {
    name: "Tanvi Shah",
    rating: 5,
    context: "Class of 2026 · Architecture",
    body: "My school counsellor has four hundred students. This is the first thing that gave me feedback the same day I asked for it.",
  },
  {
    name: "Devansh Malhotra",
    rating: 4,
    context: "Class of 2027 · Business",
    body: "Took me a couple of sessions to trust the recommendations. Once I checked a few against what the colleges actually publish, they held up.",
  },
  {
    name: "Sara Qureshi",
    rating: 5,
    context: "Class of 2026 · Public Health",
    body: "The hearts system sounds gimmicky until you're four weeks behind and it's the only thing that made you notice.",
  },
  {
    name: "Vihaan Reddy",
    rating: 5,
    context: "Class of 2028 · Aerospace Engineering",
    body: "I'm a sophomore, so most advice aimed at me is 'just get good grades'. This gave me an actual two-year plan I can start on now.",
  },
];
