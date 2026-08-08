import { supabase } from "@/integrations/supabase/client";

export type TriviaRound = {
  id: string;
  room_id: string;
  question: string;
  answer: string;
  choices: string[];
  started_by: string;
  winner_id: string | null;
  answered_at: string | null;
  created_at: string;
};

const COLS =
  "id, room_id, question, answer, choices, started_by, winner_id, answered_at, created_at";

type Question = { q: string; a: string; wrong: [string, string, string] };

/** Small built-in question bank so the bot needs no external service. */
export const TRIVIA_QUESTIONS: Question[] = [
  { q: "Which planet is known as the Red Planet?", a: "Mars", wrong: ["Venus", "Jupiter", "Mercury"] },
  { q: "How many continents are there on Earth?", a: "7", wrong: ["5", "6", "8"] },
  { q: "What is the largest ocean on Earth?", a: "Pacific", wrong: ["Atlantic", "Indian", "Arctic"] },
  { q: "What gas do plants absorb from the air?", a: "Carbon dioxide", wrong: ["Oxygen", "Nitrogen", "Helium"] },
  { q: "Who painted the Mona Lisa?", a: "Leonardo da Vinci", wrong: ["Michelangelo", "Raphael", "Van Gogh"] },
  { q: "What is the capital of Japan?", a: "Tokyo", wrong: ["Kyoto", "Osaka", "Seoul"] },
  { q: "How many strings does a standard guitar have?", a: "6", wrong: ["4", "5", "7"] },
  { q: "Which animal is the largest living mammal?", a: "Blue whale", wrong: ["Elephant", "Giraffe", "Orca"] },
  { q: "What does HTTP stand for?", a: "HyperText Transfer Protocol", wrong: ["High Transfer Text Protocol", "Hyperlink Text Transit Path", "Host Transfer Type Protocol"] },
  { q: "In which country would you find the Eiffel Tower?", a: "France", wrong: ["Italy", "Belgium", "Spain"] },
  { q: "What is the freezing point of water in Fahrenheit?", a: "32°F", wrong: ["0°F", "12°F", "48°F"] },
  { q: "Which element has the chemical symbol 'Fe'?", a: "Iron", wrong: ["Gold", "Fluorine", "Lead"] },
  { q: "How many minutes are in a full day?", a: "1440", wrong: ["720", "1200", "2400"] },
  { q: "Who wrote “Romeo and Juliet”?", a: "William Shakespeare", wrong: ["Charles Dickens", "Jane Austen", "Mark Twain"] },
  { q: "What is the tallest mountain above sea level?", a: "Mount Everest", wrong: ["K2", "Denali", "Kilimanjaro"] },
  { q: "Which sport uses a shuttlecock?", a: "Badminton", wrong: ["Tennis", "Squash", "Cricket"] },
  { q: "What is the smallest prime number?", a: "2", wrong: ["0", "1", "3"] },
  { q: "Which ocean creature has eight arms?", a: "Octopus", wrong: ["Squid", "Jellyfish", "Starfish"] },
  { q: "What language has the most native speakers?", a: "Mandarin Chinese", wrong: ["English", "Spanish", "Hindi"] },
  { q: "How many sides does a hexagon have?", a: "6", wrong: ["5", "7", "8"] },
  { q: "Which country gifted the Statue of Liberty to the USA?", a: "France", wrong: ["England", "Spain", "Italy"] },
  { q: "What is the main ingredient in guacamole?", a: "Avocado", wrong: ["Cucumber", "Pea", "Zucchini"] },
  { q: "Which planet has the most moons?", a: "Saturn", wrong: ["Jupiter", "Neptune", "Uranus"] },
  { q: "What year did the first human land on the Moon?", a: "1969", wrong: ["1959", "1972", "1965"] },
];

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function pickQuestion(avoid: string[] = []) {
  const pool = TRIVIA_QUESTIONS.filter((q) => !avoid.includes(q.q));
  const source = pool.length ? pool : TRIVIA_QUESTIONS;
  const picked = source[Math.floor(Math.random() * source.length)];
  return { question: picked.q, answer: picked.a, choices: shuffle([picked.a, ...picked.wrong]) };
}

export async function setRoomTrivia(roomId: string, enabled: boolean) {
  const { error } = await supabase.from("rooms").update({ trivia_enabled: enabled }).eq("id", roomId);
  if (error) throw error;
}

export async function fetchTriviaRounds(roomId: string): Promise<TriviaRound[]> {
  const { data, error } = await supabase
    .from("trivia_rounds")
    .select(COLS)
    .eq("room_id", roomId)
    .order("created_at", { ascending: false })
    .limit(8);
  if (error) throw error;
  return (data ?? []) as TriviaRound[];
}

export async function startTriviaRound(roomId: string, meId: string, recentQuestions: string[]) {
  const picked = pickQuestion(recentQuestions);
  const { error } = await supabase.from("trivia_rounds").insert({
    room_id: roomId,
    started_by: meId,
    question: picked.question,
    answer: picked.answer,
    choices: picked.choices,
  });
  if (error) throw error;
}

/** Marks the round solved. Returns true when this call recorded the win. */
export async function answerTriviaRound(round: TriviaRound, meId: string, choice: string) {
  if (choice !== round.answer) return false;
  const { data, error } = await supabase
    .from("trivia_rounds")
    .update({ winner_id: meId, answered_at: new Date().toISOString() })
    .eq("id", round.id)
    .is("winner_id", null)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
