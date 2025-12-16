import { useEffect, useMemo, useState } from "react";

// Stubbed framer-motion for Preview with a CSS-based animation
const MotionDiv = (props: any) => {
  const { className = '', ...rest } = props;
  return (
    <div
      className={
        className +
        ' transition-all duration-700 ease-out transform opacity-0 scale-75 animate-fadeScaleIn'
      }
      {...rest}
    />
  );
};

// Inject simple CSS keyframes for the fake animation (guarded for browser)
if (typeof document !== 'undefined') {
  const existing = document.getElementById('jeopardy-fade-scale-style');
  if (!existing) {
    const style = document.createElement('style');
    style.id = 'jeopardy-fade-scale-style';
    style.innerHTML = `
      @keyframes fadeScaleIn {
        0% { opacity: 0; transform: scale(0.6); }
        60% { opacity: 1; transform: scale(1.15); }
        100% { opacity: 1; transform: scale(1); }
      }
      .animate-fadeScaleIn {
        opacity: 1 !important;
        transform: scale(1) !important;
        animation: fadeScaleIn 0.9s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
  }
}

// --- Audio helpers ---
const makeAudio = (src: string, opts?: { loop?: boolean }) => {
  if (typeof Audio === 'undefined') return null as unknown as HTMLAudioElement;
  const a = new Audio(src);
  if (opts?.loop) a.loop = true;
  return a;
};

const safePlay = (a: HTMLAudioElement | null | undefined) => {
  try {
    a?.play?.();
  } catch {}
};
const safeStop = (a: HTMLAudioElement | null | undefined) => {
  try {
    if (!a) return;
    a.pause();
    a.currentTime = 0;
  } catch {}
};

// --- Sound placeholders (user will replace paths with real mp3 files) ---
const sounds = {
  dailyDouble: makeAudio('/sounds/daily_double.mp3'),
  revealQuestion: makeAudio('/sounds/reveal_question.mp3'),
  revealAnswer: makeAudio('/sounds/reveal_answer.mp3'),
  correct: makeAudio('/sounds/correct.mp3'),
  incorrect: makeAudio('/sounds/incorrect.mp3'),
  finalThink: makeAudio('/sounds/final_think.mp3', { loop: true }),
  timerBeep: makeAudio('/sounds/timer_beep.mp3'),
};

type TeamResult = { team: number; score: number };

type RankedTeam = TeamResult & { rank: number };

function applyFinalWagers(scores: number[], wagers: number[], results: boolean[]) {
  // Pure function for easy testing.
  return scores.map((score, i) =>
    results[i] ? score + (wagers[i] ?? 0) : score - (wagers[i] ?? 0),
  );
}

function rankTeams(scores: number[]): TeamResult[] {
  // Sort by score desc; preserve team number for tie handling
  return scores
    .map((score, idx) => ({ team: idx + 1, score }))
    .sort((a, b) => b.score - a.score);
}

function computePodiumWithTies(ranked: TeamResult[]): RankedTeam[] {
  // Option A: ties share the same rank (e.g., two #1s). Still show a #3 if possible.
  // Returns up to 3 entries, where each entry has an assigned shared rank.
  if (ranked.length === 0) return [];

  const withRanks: RankedTeam[] = [];
  let currentRank = 1;

  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].score < ranked[i - 1].score) {
      currentRank = i + 1;
    }
    withRanks.push({ ...ranked[i], rank: currentRank });
  }

  const ones = withRanks.filter((r) => r.rank === 1);
  const twos = withRanks.filter((r) => r.rank === 2);
  const threes = withRanks.filter((r) => r.rank === 3);

  const podium: RankedTeam[] = [];
  podium.push(...ones);
  if (podium.length < 3) podium.push(...twos);
  if (podium.length < 3 && threes.length) podium.push(threes[0]);

  return podium.slice(0, 3);
}

export default function JeopardyBoard() {
  const categories = ['AI Basics', 'AI in Everyday Life', 'Famous AI Milestones', 'Ethics & AI'];
  const values = [100, 200, 300, 400, 500];

  const qa: Record<string, { q: string; a: string }> = {
    '0-100': {
      q: 'This term refers to machines that mimic human intelligence.',
      a: 'What is Artificial Intelligence?',
    },
    '0-200': {
      q: 'The branch of AI focused on learning from data.',
      a: 'What is Machine Learning?',
    },
    '0-300': {
      q: 'The type of AI that can perform only one specific task.',
      a: 'What is Narrow AI?',
    },
    '0-400': {
      q: 'The year the term "Artificial Intelligence" was coined.',
      a: 'What is 1956?',
    },
    '0-500': {
      q: 'The test designed by Alan Turing to measure machine intelligence.',
      a: 'What is the Turing Test?',
    },

    '1-100': {
      q: 'This AI assistant was introduced by Apple in 2011.',
      a: 'What is Siri?',
    },
    '1-200': {
      q: 'Netflix uses this type of AI to recommend shows.',
      a: 'What is a Recommendation System?',
    },
    '1-300': {
      q: 'The AI behind self-driving cars relies heavily on this type of sensor.',
      a: 'What is Lidar?',
    },
    '1-400': {
      q: 'This AI model powers ChatGPT.',
      a: 'What is GPT?',
    },
    '1-500': {
      q: 'The company that created AlphaGo.',
      a: 'What is DeepMind?',
    },

    '2-100': {
      q: "IBM's AI that beat Garry Kasparov in chess.",
      a: 'What is Deep Blue?',
    },
    '2-200': {
      q: 'Year AlphaGo defeated a world champion in Go.',
      a: 'What is 2016?',
    },
    '2-300': {
      q: 'The AI that beat humans in Jeopardy.',
      a: 'What is Watson?',
    },
    '2-400': {
      q: 'The first chatbot created in the 1960s.',
      a: 'What is ELIZA?',
    },
    '2-500': {
      q: 'The AI that generated realistic images from text prompts in 2022.',
      a: 'What is DALL·E?',
    },

    '3-100': {
      q: 'The term for bias in AI systems.',
      a: 'What is Algorithmic Bias?',
    },
    '3-200': {
      q: 'This principle ensures AI decisions can be explained.',
      a: 'What is Explainability?',
    },
    '3-300': {
      q: "The EU's major AI regulation proposal.",
      a: 'What is the AI Act?',
    },
    '3-400': {
      q: 'The concept of AI behaving in a way that aligns with human values.',
      a: 'What is AI Alignment?',
    },
    '3-500': {
      q: 'The term for unintended harmful consequences of AI.',
      a: 'What is AI Risk?',
    },
  };

  // Core board state
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const [presentationMode, setPresentationMode] = useState(false);
  const [dailyDoubles, setDailyDoubles] = useState<string[]>([]);
  const [showDDAnimation, setShowDDAnimation] = useState(false);

  const [activeRow, setActiveRow] = useState(0); // index into values
  const [activeCol, setActiveCol] = useState(0); // index into categories

  // Team / scoring state
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null);
  const [lockedOutTeams, setLockedOutTeams] = useState<Record<string, number[]>>({});
  const [teamScores, setTeamScores] = useState([0, 0, 0, 0]);

  // Daily Double wagers keyed by tile key (e.g. "1-400")
  const [ddWagers, setDdWagers] = useState<Record<string, number>>({});
  const [wagerModal, setWagerModal] = useState<{ key: string } | null>(null);

  // Final Jeopardy state
  const [finalJeopardy, setFinalJeopardy] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [finalWagers, setFinalWagers] = useState([0, 0, 0, 0]);
  const [finalCategory] = useState('Legendary Final Category');
  const [finalQuestion] = useState(
    'This is a test Final Jeopardy question so you can verify wagers, timer, and reveal flow works.',
  );
  const [finalResults, setFinalResults] = useState([true, true, true, true]);
  const [finalAnswer] = useState('This is the test Final Jeopardy answer.');
  const [finalRevealQuestion, setFinalRevealQuestion] = useState(false);
  const [finalTimerEnabled, setFinalTimerEnabled] = useState(false);
  const [finalCountdown, setFinalCountdown] = useState(45);
  const [finalApplied, setFinalApplied] = useState(false);

  const getKey = (col: number, rowVal: number) => `${col}-${rowVal}`;

  const activeValue = values[activeRow];
  const activeKey = getKey(activeCol, activeValue);
  const activeLockedTeams = lockedOutTeams[activeKey] ?? [];

  // Lightweight runtime tests (opt-in): set window.__RUN_TESTS__ = true in DevTools.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).__RUN_TESTS__) return;

    // Existing tests
    {
      const scores = [100, 200, 300, 400];
      const wagers = [10, 20, 30, 40];
      const results = [true, false, true, false];
      const out = applyFinalWagers(scores, wagers, results);
      console.assert(out[0] === 110, 'Final wager apply: team1');
      console.assert(out[1] === 180, 'Final wager apply: team2');
      console.assert(out[2] === 330, 'Final wager apply: team3');
      console.assert(out[3] === 360, 'Final wager apply: team4');
    }

    {
      const ranked = rankTeams([0, 50, 10, 50]);
      console.assert(
        ranked[0].score === 50 && ranked[1].score === 50,
        'Ranking handles ties (stable not guaranteed)',
      );
    }

    // Added tests: tie podium behavior (Option A)
    {
      const ranked = rankTeams([400, 400, 250, 100]);
      const podium = computePodiumWithTies(ranked);
      console.assert(podium.length === 3, 'Podium returns 3 entries when possible');
      console.assert(podium[0].rank === 1 && podium[1].rank === 1, 'Two teams tied for #1 share rank 1');
      console.assert(podium[2].rank === 3, 'After a tie for #1, next place is #3');
    }

    {
      const ranked = rankTeams([500, 300, 300, 200]);
      const podium = computePodiumWithTies(ranked);
      console.assert(podium[0].rank === 1, 'Solo #1 is rank 1');
      console.assert(podium[1].rank === 2 && podium[2].rank === 2, 'Tie for #2 shares rank 2');
    }

    // Added tests: all tied
    {
      const ranked = rankTeams([100, 100, 100, 100]);
      const podium = computePodiumWithTies(ranked);
      console.assert(podium.length === 3, 'All tied returns first 3 as podium');
      console.assert(podium.every((p) => p.rank === 1), 'All tied share rank 1');
    }
  }, []);

  // Roll daily doubles once on mount
  useEffect(() => {
    const allKeys = Object.keys(qa);
    const randomKeys: string[] = [];
    while (randomKeys.length < 2) {
      const random = allKeys[Math.floor(Math.random() * allKeys.length)];
      if (!randomKeys.includes(random)) randomKeys.push(random);
    }
    setDailyDoubles(randomKeys);
  }, []);

  const resetBoard = () => {
    setRevealed({});
    setShowAnswer({});
    setCompleted({});
    setTeamScores([0, 0, 0, 0]);
    setDdWagers({});
    setWagerModal(null);
    setLockedOutTeams({});
    setSelectedTeam(null);
  };

  const resetFinalJeopardy = () => {
    setFinalJeopardy(false);
    setShowLeaderboard(false);
    setFinalApplied(false);
    setFinalWagers([0, 0, 0, 0]);
    setFinalResults([true, true, true, true]);
    setFinalRevealQuestion(false);
    setFinalTimerEnabled(false);
    setFinalCountdown(45);
    safeStop(sounds.finalThink);
  };

  // Helper to finalize a tile (hide everything, mark done)
  const finalizeTile = (key: string) => {
    setCompleted((p) => ({ ...p, [key]: true }));
    setRevealed((p) => ({ ...p, [key]: false }));
    setShowAnswer((p) => ({ ...p, [key]: false }));
    setLockedOutTeams((p) => ({ ...p, [key]: [] }));
    setSelectedTeam(null);
  };

  // Keyboard controls in presentation mode (navigation + reveal + scoring)
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if (finalJeopardy || wagerModal) return;
    if (!presentationMode) return;

    const key = getKey(activeCol, values[activeRow]);
    const isDD = dailyDoubles.includes(key);
    const val = values[activeRow];
    const award = isDD ? (ddWagers[key] ?? val) : val;

    // --- Tile navigation ---
    if (e.key === "ArrowUp") return setActiveRow((r) => Math.max(0, r - 1));
    if (e.key === "ArrowDown") return setActiveRow((r) => Math.min(values.length - 1, r + 1));
    if (e.key === "ArrowLeft") return setActiveCol((c) => Math.max(0, c - 1));
    if (e.key === "ArrowRight") return setActiveCol((c) => Math.min(categories.length - 1, c + 1));

    // --- Team selection (numbers 1–4) ---
    if (["1", "2", "3", "4"].includes(e.key)) {
      setSelectedTeam(Number(e.key) - 1);
      return;
    }

    // If tile is already completed, ignore reveal/judge keys
    if (completed[key]) {
      if (e.key === "Escape") setPresentationMode(false);
      return;
    }

    // SPACE = progression:
    // hidden -> reveal question
    // (if answer already revealed) -> finalize tile
    if (e.key === " ") {
      e.preventDefault();

      // Daily Double entry ONLY when going from hidden -> question
      if (isDD && !revealed[key] && !showAnswer[key]) {
        // Require a team selected before wagering (optional but recommended)
        if (selectedTeam == null) return;

        safePlay(sounds.dailyDouble);
        setShowDDAnimation(true);
        setTimeout(() => {
          setShowDDAnimation(false);
          setWagerModal({ key });
        }, 1500);
        return;
      }

      // hidden -> question
      if (!revealed[key]) {
        safePlay(sounds.revealQuestion);
        setRevealed((p) => ({ ...p, [key]: true }));
        setShowAnswer((p) => ({ ...p, [key]: false }));
        setLockedOutTeams((p) => ({ ...p, [key]: [] }));
        return;
      }

      // if answer is showing, SPACE finishes the tile
      if (showAnswer[key]) {
        safePlay(sounds.incorrect);
        finalizeTile(key);
        return;
      }

      // If question is showing but answer isn't, SPACE does nothing (judging happens via Enter/W)
      return;
    }

    const locked = lockedOutTeams[key] ?? [];
    const questionShowing = !!revealed[key] && !showAnswer[key];

    // ENTER = correct (ONLY when question is showing)
    // -> awards points, reveals answer, keeps tile open until SPACE finalizes
    if (e.key === "Enter" && questionShowing) {
      if (selectedTeam == null) return;
      if (locked.includes(selectedTeam)) return;

      setTeamScores((ts) => ts.map((v, i) => (i === selectedTeam ? v + award : v)));
      safePlay(sounds.correct);

      // Reveal the answer (do NOT finalize yet)
      safePlay(sounds.revealAnswer);
      setShowAnswer((p) => ({ ...p, [key]: true }));
      return;
    }

    // W = wrong (ONLY when question is showing)
    // -> deducts, locks that team out, allows selecting another team and trying again
    if (e.key.toLowerCase() === "w" && questionShowing) {
      if (selectedTeam == null) return;
      if (locked.includes(selectedTeam)) return;

      setTeamScores((ts) => ts.map((v, i) => (i === selectedTeam ? v - award : v)));
      setLockedOutTeams((p) => ({
        ...p,
        [key]: [...(p[key] ?? []), selectedTeam],
      }));
      safePlay(sounds.incorrect);

      const updatedLocked = [...locked, selectedTeam];

      // If all 4 teams are locked out, reveal answer + finalize immediately
      if ([0, 1, 2, 3].every((t) => updatedLocked.includes(t))) {
        safePlay(sounds.revealAnswer);
        setShowAnswer((p) => ({ ...p, [key]: true }));
        finalizeTile(key);
      }

      return;
    }

    // ESC exits presentation mode
    if (e.key === "Escape") {
      setPresentationMode(false);
      return;
    }
  };

  document.addEventListener("keydown", handleKey);
  return () => document.removeEventListener("keydown", handleKey);
}, [
  presentationMode,
  activeCol,
  activeRow,
  revealed,
  showAnswer,
  completed,
  dailyDoubles,
  wagerModal,
  finalJeopardy,
  ddWagers,
  lockedOutTeams,
  selectedTeam,
]);

  // Final Jeopardy countdown tick
  useEffect(() => {
    if (!finalJeopardy || !finalTimerEnabled || !finalRevealQuestion) return;
    if (finalCountdown <= 0) {
      safeStop(sounds.finalThink);
      return;
    }

    const id = window.setInterval(() => {
      setFinalCountdown((c) => {
        const next = c > 0 ? c - 1 : 0;
        if (next === 0) safeStop(sounds.finalThink);
        return next;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [finalJeopardy, finalTimerEnabled, finalRevealQuestion, finalCountdown]);

  // Mouse click behavior (host mode only)
  const handleClick = (col: number, rowIndex: number) => {
    if (presentationMode || finalJeopardy) return;

    const val = values[rowIndex];
    const key = getKey(col, val);
    if (completed[key]) return;

    // Daily Double via click: animation -> wager modal -> reveal question
    if (dailyDoubles.includes(key) && !revealed[key] && !showAnswer[key]) {
      safePlay(sounds.dailyDouble);
      setShowDDAnimation(true);
      setTimeout(() => {
        setShowDDAnimation(false);
        setWagerModal({ key });
      }, 1500);
      return;
    }

    if (!revealed[key]) {
      safePlay(sounds.revealQuestion);
      setRevealed((p) => ({ ...p, [key]: true }));
      setLockedOutTeams((p) => ({ ...p, [key]: [] }));
      return;
    }

    if (!showAnswer[key]) {
      safePlay(sounds.revealAnswer);
      setShowAnswer((p) => ({ ...p, [key]: true }));
      return;
    }

    // If answer already showing and no team was assigned, just complete
    safePlay(sounds.incorrect);
    finalizeTile(key);
  };

  const ranked = useMemo(() => rankTeams(teamScores), [teamScores]);

  // --- RENDER ---
  if (showLeaderboard) {
    const podium = computePodiumWithTies(ranked);

    return (
      <div className="min-h-screen bg-[#351C15] w-full flex flex-col items-center justify-center text-white gap-10 p-8">
        <h1 className="text-6xl font-bold text-[#FFB500]">FINAL PODIUM</h1>

        <div className="flex items-end gap-8">
          {podium.map((r, i) => (
            <div
              key={r.team}
              className={`flex flex-col items-center justify-end rounded-xl font-bold shadow-xl px-6 py-4 ${
                i === 1
                  ? 'bg-[#FFB500] text-[#351C15] h-64'
                  : i === 0
                    ? 'bg-[#4B2E1F] text-[#FFB500] h-52'
                    : 'bg-[#4B2E1F]/80 text-[#FFB500] h-44'
              }`}
            >
              <div className="text-4xl mb-2">#{r.rank}</div>
              <div className="text-2xl">Team {r.team}</div>
              <div className="text-3xl">${r.score}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={resetFinalJeopardy}
            className="mt-8 bg-red-600 text-white px-8 py-4 rounded font-bold text-xl"
          >
            Reset Game
          </button>
          <button
            onClick={() => {
              setShowLeaderboard(false);
            }}
            className="mt-8 bg-[#4B2E1F] text-[#FFB500] px-8 py-4 rounded font-bold text-xl border border-[#FFB500]"
          >
            Back to Board
          </button>
        </div>
      </div>
    );
  }

  if (finalJeopardy) {
    return (
      <div className="min-h-screen bg-[#351C15] w-full flex flex-col items-center justify-center text-white gap-6 p-8">
        <h1 className="text-5xl font-bold text-[#FFB500]">FINAL JEOPARDY</h1>
        <h2 className="text-3xl">{finalCategory}</h2>

        {!finalRevealQuestion && (
          <div className="bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-lg flex flex-col gap-4">
            <h3 className="text-2xl font-bold text-center">Enter Wagers</h3>
            {teamScores.map((s, i) => (
              <div key={i} className="flex justify-between items-center gap-3">
                <span className="font-bold">Team {i + 1} (${s})</span>
                <input
                  type="number"
                  min={0}
                  max={Math.max(0, s)}
                  className="border p-1 rounded w-24"
                  value={finalWagers[i]}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    // Wagers capped at current score (per your rule)
                    setFinalWagers((w) =>
                      w.map((x, idx) =>
                        idx === i ? Math.min(Math.max(v, 0), Math.max(0, s)) : x,
                      ),
                    );
                  }}
                />
              </div>
            ))}

            <button
              onClick={() => {
                setFinalRevealQuestion(true);
              }}
              className="bg-amber-800 text-white py-2 rounded font-bold"
            >
              Lock Wagers & Reveal Question
            </button>

            <p className="text-xs text-center text-gray-600 mt-1">
              Timer will start when you press "Start 45s Timer" after the question is revealed.
            </p>
          </div>
        )}

        {finalRevealQuestion && (
          <div className="flex flex-col items-center gap-6 max-w-2xl text-center">
            <p className="text-2xl">{finalQuestion}</p>

            <div className="bg-white text-black p-5 rounded-xl shadow-xl w-full max-w-2xl">
              <h3 className="text-xl font-bold mb-3">Mark Results</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teamScores.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border rounded-lg px-3 py-2"
                  >
                    <div className="text-left">
                      <div className="font-bold">Team {i + 1}</div>
                      <div className="text-sm text-gray-600">
                        Score: ${s} • Wager: ${finalWagers[i]}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setFinalResults((r) => r.map((v, idx) => (idx === i ? true : v)))
                        }
                        className={`px-3 py-1 rounded font-bold border ${
                          finalResults[i]
                            ? 'bg-green-600 text-white border-green-700'
                            : 'bg-white text-green-700 border-green-700'
                        }`}
                      >
                        ✓ Correct
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setFinalResults((r) => r.map((v, idx) => (idx === i ? false : v)))
                        }
                        className={`px-3 py-1 rounded font-bold border ${
                          !finalResults[i]
                            ? 'bg-red-600 text-white border-red-700'
                            : 'bg-white text-red-700 border-red-700'
                        }`}
                      >
                        ✕ Wrong
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {finalTimerEnabled && (
              <p className="text-4xl font-bold text-[#FFB500]">{finalCountdown}</p>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => {
                  safePlay(sounds.finalThink);
                  setFinalTimerEnabled(true);
                  setFinalCountdown(45);
                  safePlay(sounds.timerBeep);
                }}
                className="bg-yellow-300 text-blue-900 px-6 py-2 rounded font-bold"
              >
                Start 45s Timer
              </button>

              <button
                onClick={() => {
                  // Apply once; prevent accidental double-apply.
                  if (!finalApplied) {
                    setTeamScores((scores) => applyFinalWagers(scores, finalWagers, finalResults));
                    setFinalApplied(true);
                  }
                  setShowLeaderboard(true);
                  safeStop(sounds.finalThink);
                }}
                className="bg-green-400 text-blue-900 px-6 py-3 rounded font-bold text-xl"
              >
                Reveal Correct Answer
              </button>
            </div>

            <div className="bg-[#4B2E1F] border border-[#FFB500] text-[#FFB500] rounded-xl p-4 max-w-2xl w-full">
              <div className="text-sm opacity-90 mb-1">Answer</div>
              <div className="text-xl font-bold">{finalAnswer}</div>
              {!finalApplied && (
                <div className="text-xs opacity-80 mt-2">
                  (Scores will update when you reveal the answer.)
                </div>
              )}
              {finalApplied && (
                <div className="text-xs opacity-80 mt-2">
                  (Final wagers applied. Leaderboard is ready.)
                </div>
              )}
            </div>

            <button
              onClick={resetFinalJeopardy}
              className="mt-1 bg-red-600 text-white px-4 py-2 rounded"
            >
              Exit Final Jeopardy
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#351C15] flex items-start justify-center p-4 relative overflow-hidden">
      <div className="flex w-full max-w-6xl gap-6">
        {/* Host controls - hidden in presentation mode */}
        {!presentationMode && (
          <div className="w-64 bg-gray-800 text-white p-4 rounded-lg flex flex-col gap-3 h-fit sticky top-4">
            <h2 className="text-xl font-bold mb-1">Host Controls</h2>

            <button
              onClick={resetBoard}
              className="bg-green-600 py-2 px-3 rounded hover:bg-green-500 text-sm font-semibold"
            >
              Reset Board
            </button>

            <button
              onClick={() => {
                setRevealed({});
                setShowAnswer({});
              }}
              className="bg-amber-700 py-2 px-3 rounded hover:bg-blue-500 text-sm font-semibold"
            >
              Hide All
            </button>

            <button
              onClick={() => setPresentationMode(true)}
              className="bg-[#351C15] border border-[#FFB500] text-[#FFB500] py-2 px-3 rounded shadow-md hover:bg-[#4B2E1F] text-sm font-semibold"
            >
              Enter Presentation Mode
            </button>

            <button
              onClick={() => {
                setFinalJeopardy(true);
                setFinalApplied(false);
                setShowLeaderboard(false);
              }}
              className="bg-purple-700 py-2 px-3 rounded hover:bg-purple-600 text-sm font-semibold"
            >
              Start Final Jeopardy
            </button>

            <button
              onClick={() => setShowLeaderboard(true)}
              className="bg-[#4B2E1F] border border-[#FFB500] text-[#FFB500] py-2 px-3 rounded hover:bg-[#3f261a] text-sm font-semibold"
            >
              Show Leaderboard Now
            </button>

            {/* Sound Test Panel */}
            <div className="mt-4 p-3 bg-gray-700 rounded-lg flex flex-col gap-2">
              <h3 className="font-bold text-lg">Sound Test</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => safePlay(sounds.dailyDouble)}
                  className="bg-gray-600 py-1 rounded"
                >
                  Daily Double
                </button>
                <button
                  type="button"
                  onClick={() => safePlay(sounds.revealQuestion)}
                  className="bg-gray-600 py-1 rounded"
                >
                  Reveal Question
                </button>
                <button
                  type="button"
                  onClick={() => safePlay(sounds.revealAnswer)}
                  className="bg-gray-600 py-1 rounded"
                >
                  Reveal Answer
                </button>
                <button
                  type="button"
                  onClick={() => safePlay(sounds.correct)}
                  className="bg-gray-600 py-1 rounded"
                >
                  Correct
                </button>
                <button
                  type="button"
                  onClick={() => safePlay(sounds.incorrect)}
                  className="bg-gray-600 py-1 rounded"
                >
                  Incorrect
                </button>
                <button
                  type="button"
                  onClick={() => safePlay(sounds.finalThink)}
                  className="bg-gray-600 py-1 rounded"
                >
                  Final Think
                </button>
                <button
                  type="button"
                  onClick={() => safeStop(sounds.finalThink)}
                  className="bg-gray-600 py-1 rounded"
                >
                  Stop Think
                </button>
                <button
                  type="button"
                  onClick={() => safePlay(sounds.timerBeep)}
                  className="bg-gray-600 py-1 rounded"
                >
                  Timer Beep
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main board area */}
        <div className="flex-1 flex flex-col items-center gap-4">
          {/* Categories */}
          <div className="grid grid-cols-4 w-full max-w-4xl text-center text-2xl font-bold text-[#FFB500]">
            {categories.map((cat, i) => (
              <div key={i} className="py-3 border-b-2 border-[#FFB500]">
                {cat}
              </div>
            ))}
          </div>

          {/* Board tiles */}
          <div className="grid grid-cols-4 w-full max-w-4xl gap-3 mt-4">
            {values.map((val, row) =>
              categories.map((_, col) => {
                const key = getKey(col, val);
                const isActive = presentationMode && row === activeRow && col === activeCol;
                const isDone = completed[key];

                return (
                  <div
                    key={key}
                    onClick={() => handleClick(col, row)}
                    className={`h-24 flex items-center justify-center rounded text-3xl font-bold cursor-pointer select-none
                      ${isDone ? 'bg-gray-600 text-gray-400' : 'bg-[#4B2E1F] text-[#FFB500]'}
                      ${isActive ? 'ring-4 ring-[#FFB500] scale-105' : ''}`}
                  >
                    {!revealed[key] && !isDone && <span>${val}</span>}
                    {revealed[key] && !showAnswer[key] && !isDone && (
                      <span className="px-2 text-base text-white">{qa[key].q}</span>
                    )}
                    {showAnswer[key] && !isDone && (
                      <span className="px-2 text-lg italic text-green-200">{qa[key].a}</span>
                    )}
                    {isDone && <span className="text-xl">—</span>}
                  </div>
                );
              }),
            )}
          </div>

          {/* Presentation HUD */}
          {presentationMode && (
            <div className="mt-4 text-yellow-200 text-sm flex flex-col items-center gap-1">
              <div>
                Active:{' '}
                <span className="font-bold">
                  {categories[activeCol]} ${values[activeRow]}
                </span>
              </div>
              <div>
                Selected Team:{' '}
                {selectedTeam != null ? (
                  <span className="font-bold">Team {selectedTeam + 1}</span>
                ) : (
                  <span className="italic">None</span>
                )}
              </div>
              <div>
                Locked Out:{' '}
                {activeLockedTeams.length ? (
                  activeLockedTeams.map((t) => `Team ${t + 1}`).join(', ')
                ) : (
                  <span className="italic">None</span>
                )}
              </div>
              <div className="text-[11px] text-[#FFB500]/80">
                Arrows = move • Space = question/finish • 1–4 select team • Enter = correct • W = wrong
              </div>
            </div>
          )}

          {/* Daily Double animation */}
          {showDDAnimation && (
            <MotionDiv className="fixed inset-0 flex items-center justify-center text-6xl text-[#FFB500] font-bold bg-black/80 z-50">
              DAILY DOUBLE!
            </MotionDiv>
          )}

          {/* Wager modal */}
          {wagerModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-white text-black p-6 rounded-xl w-80 flex flex-col gap-3">
                <h2 className="text-xl font-bold text-center">Daily Double Wager</h2>
                <p className="text-sm">Team may wager minimum $5 up to their current score.</p>
                <input
                  type="number"
                  min={5}
                  max={Math.max(0, teamScores[selectedTeam ?? 0])}
                  className="border p-2 rounded"
                  onChange={(e) => {
                    const v = Math.max(5, Number(e.target.value));
                    setDdWagers((p) => ({
                      ...p,
                      [wagerModal.key]: Math.min(v, Math.max(0, teamScores[selectedTeam ?? 0])),
                    }));
                  }}
                />
                <button
                  onClick={() => {
                    setWagerModal(null);
                    setRevealed((p) => ({ ...p, [wagerModal.key]: true }));
                  }}
                  className="bg-[#4B2E1F] text-white py-2 rounded font-bold"
                >
                  Lock Wager & Reveal Q
                </button>
              </div>
            </div>
          )}

          {/* Scoreboard */}
          <div className="mt-8 flex gap-6 justify-center w-full flex-wrap">
            {teamScores.map((s, i) => (
              <div
                key={i}
                className={`px-4 py-2 rounded-xl shadow-lg border-2 ${
                  selectedTeam === i ? 'border-white scale-105' : 'border-[#FFB500]'
                } bg-[#4B2E1F] text-[#FFB500] text-center min-w-[120px]`}
              >
                <div className="font-bold text-xl">Team {i + 1}</div>
                <div className="text-2xl">${s}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
