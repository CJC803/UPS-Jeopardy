import { useEffect, useMemo, useState, useRef } from "react";

/** ---------------------------------------
 *  Small CSS animation helper (no framer-motion dep)
 *  -------------------------------------- */
function useInjectJeopardyStyles() {
  useEffect(() => {
    if (typeof document === "undefined") return;
    const id = "jeopardy-fade-scale-style";
    if (document.getElementById(id)) return;

    const style = document.createElement("style");
    style.id = id;
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
  }, []);
}

/** ---------------------------------------
 *  Audio helpers (optional files in /public/sounds/)
 *  -------------------------------------- */
const makeAudio = (src: string, opts?: { loop?: boolean }) => {
  if (typeof Audio === "undefined") return null as unknown as HTMLAudioElement;
  const a = new Audio(src);
  if (opts?.loop) a.loop = true;
  return a;
};

const safePlay = (a: HTMLAudioElement | null | undefined) => {
  try {
    a?.play?.();
  } catch {
    // ignore autoplay / load errors
  }
};

const safeStop = (a: HTMLAudioElement | null | undefined) => {
  try {
    if (!a) return;
    a.pause();
    a.currentTime = 0;
  } catch {
    // ignore
  }
};

// Replace these with your real files if you want audio.
const sounds = {
  dailyDouble: makeAudio("/sounds/daily_double.mp3"),
  revealQuestion: makeAudio("/sounds/reveal_question.mp3"),
  revealAnswer: makeAudio("/sounds/reveal_answer.mp3"),
  correct: makeAudio("/sounds/correct.mp3"),
  incorrect: makeAudio("/sounds/incorrect.mp3"),
  finalThink: makeAudio("/sounds/final_think.mp3", { loop: true }),
  timerBeep: makeAudio("/sounds/timer_beep.mp3"),
};

/** ---------------------------------------
 *  Types + pure helpers
 *  -------------------------------------- */
type TeamResult = { team: number; score: number };
type RankedTeam = TeamResult & { rank: number };

function applyFinalWagers(scores: number[], wagers: number[], results: boolean[]) {
  return scores.map((score, i) => (results[i] ? score + (wagers[i] ?? 0) : score - (wagers[i] ?? 0)));
}

function rankTeams(scores: number[]): TeamResult[] {
  return scores
    .map((score, idx) => ({ team: idx + 1, score }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Option A: ties share the same rank (two #1s). If there’s a tie for #1, next rank shown can be #3.
 * Returns up to 3 entries for a “podium”.
 */
function computePodiumWithTies(ranked: TeamResult[]): RankedTeam[] {
  if (ranked.length === 0) return [];

  const withRanks: RankedTeam[] = [];
  let currentRank = 1;

  for (let i = 0; i < ranked.length; i++) {
    if (i > 0 && ranked[i].score < ranked[i - 1].score) currentRank = i + 1;
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

type QA = Record<string, { q: string; a: string }>;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** ---------------------------------------
 *  Main component
 *  -------------------------------------- */
export default function JeopardyBoard() {
  useInjectJeopardyStyles();

  // Board data
  const categories = ["Now Showing: Holiday Classics", "Miscellane-AI", "UPS Through the Years", "Cold Hard Facts"];
  const values = [100, 200, 300, 400, 500];

  // Key format: `${col}-${value}` e.g. "1-400"
  const getKey = (col: number, rowVal: number) => `${col}-${rowVal}`;

  const qa: QA = {
    "0-100": { q: "This movie features Buddy, a human raised by elves at the North Pole.", a: "What is Elf?" },
    "0-200": { q: "“Keep the change, ya filthy animal!” comes from this holiday movie.", a: "What is Home Alone?" },
    "0-300": { q: "This actor plays Clark Griswold in National Lampoon’s Christmas Vacation.", a: "Who is Chevy Chase?" },
    "0-400": { q: "In A Christmas Story, Ralphie desperately wants this brand-named gift.", a: "What is Red Ryder BB Gun?" },
    "0-500": { q: "This Hallmark movie reveals that an entire town is secretly helping Santa Claus.", a: "What is Christmas Under Wraps?" },

    "1-100": { q: "This AI assistant helped Iron man manage his suits, systems, and sarcasm.", a: "Who is Jarvis?" },
    "1-200": { q: "This is what everyone should do when given an AI generated response to ensure validity.", a: "What is fact check or audit?" },
    "1-300": { q: "This phrase describes asking AI very specific questions to get better results—a skill many learned in 2025.", a: "What is prompting?" },
    "1-400": { q: "The acronym GPT stands for this, Generative Pre-trained ____________", a: "What is Transformer?" },
    "1-500": { q: "This droid is fluent in millions of languages and space flight. Assists the Rebel Alliance..", a: "Who is C-3PO?" },

    "2-100": { q: "UPS was founded as ___________ in Seattle with a $100 loan by Jim Casey and changed its name to United Parcel Service in 1919.", a: "What is American Messenger Company?" },
    "2-200": { q: "This country was the first country UPS offered its service to outside of the USA, expanding it into the international space.", a: "What is Canada?" },
    "2-300": { q: "UPS became the first package delivery company to do this in 1975 increasing access to its service.", a: "What is serving every issues?" },
    "2-400": { q: "This retail company was acquired in 2001 by UPS and rebranded as The UPS Store.", a: "Wat is Mail Boxes Etc.?" },
    "2-500": { q: "UPS had a color specific precursor in the early 1950's to today's Air products called this.", a: "What is Blue Label Air?" },

    "3-100": { q: "This phenomenon causes roads to appear wet when they're actually dangerously icy.", a: "What is Black Ice?" },
    "3-200": { q: "This region is known as the coldest inhabited place on Earth.", a: "What is Siberia?" },
    "3-300": { q: "This December holiday celebrates the shortest day and longest night of the year.", a: "What is the Winter Solstice?" },
    "3-400": { q: "The day after Christmas is known as this in the United Kingdom.", a: "What is Boxing Day" },
    "3-500": { q: "My true love gave me this many birds in the 'Twelve Days of Christmas'.", a: "What is 23?" },
  };

  /** ---------------------------------------
   *  Core state
   *  -------------------------------------- */
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [showAnswer, setShowAnswer] = useState<Record<string, boolean>>({});
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const [presentationMode, setPresentationMode] = useState(false);
  const [activeRow, setActiveRow] = useState(0); // index into values
  const [activeCol, setActiveCol] = useState(0); // index into categories

  const [teamScores, setTeamScores] = useState<number[]>([0, 0, 0, 0]);
  const [selectedTeam, setSelectedTeam] = useState<number | null>(null); // 0..3
  const [lockedOutTeams, setLockedOutTeams] = useState<Record<string, number[]>>({}); // tileKey -> teamIdx[]
  const activeKey = getKey(activeCol, values[activeRow]);
  const activeLockedTeams = lockedOutTeams[activeKey] ?? [];

  // Daily Doubles
  const [dailyDoubles, setDailyDoubles] = useState<string[]>([]);
  const [showDDAnimation, setShowDDAnimation] = useState(false);

  // Wagers per tile
  const [ddWagers, setDdWagers] = useState<Record<string, number>>({});
  const [wagerModal, setWagerModal] = useState<{
    key: string;
    teamIdx: number; // 0..3
    min: number;
    max: number;
  } | null>(null);

  // Final Jeopardy
  const [finalJeopardy, setFinalJeopardy] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const [finalCategory] = useState("Legendary Final Category");
  const [finalQuestion] = useState('Andy Azula used this iconic tool in 48 different UPS commercials since 2007 with the commercials ending with the phrase,"What can Brown do for you?"');
  const [finalAnswer] = useState("What is a whiteboard?");

  const [finalWagers, setFinalWagers] = useState<number[]>([0, 0, 0, 0]);
  const [finalResults, setFinalResults] = useState<boolean[]>([true, true, true, true]);
  const [finalRevealQuestion, setFinalRevealQuestion] = useState(false);

  const [finalTimerEnabled, setFinalTimerEnabled] = useState(false);
  const [finalCountdown, setFinalCountdown] = useState(45);
  const [finalApplied, setFinalApplied] = useState(false);
  const [finalAnswerRevealed, setFinalAnswerRevealed] = useState(false);

  const finalTimerId = useRef<number | null>(null);

  /** ---------------------------------------
   *  Init Daily Doubles (2 random tiles)
   *  -------------------------------------- */
  useEffect(() => {
    const allKeys = Object.keys(qa);
    const picked: string[] = [];
    while (picked.length < 2 && allKeys.length >= 2) {
      const r = allKeys[Math.floor(Math.random() * allKeys.length)];
      if (!picked.includes(r)) picked.push(r);
    }
    setDailyDoubles(picked);
  }, []);

  /** ---------------------------------------
   *  Reset helpers
   *  -------------------------------------- */
  const resetBoard = () => {
    setRevealed({});
    setShowAnswer({});
    setCompleted({});
    setTeamScores([0, 0, 0, 0]);
    setLockedOutTeams({});
    setSelectedTeam(null);
    setDdWagers({});
    setWagerModal(null);
    setPresentationMode(false);
    setActiveRow(0);
    setActiveCol(0);

    // Re-roll Daily Doubles on reset
    const allKeys = Object.keys(qa);
    const picked: string[] = [];
    while (picked.length < 2 && allKeys.length >= 2) {
      const r = allKeys[Math.floor(Math.random() * allKeys.length)];
      if (!picked.includes(r)) picked.push(r);
    }
    setDailyDoubles(picked);
  };

  const resetFinalJeopardy = () => {
    setFinalJeopardy(false);
    setFinalAnswerRevealed(false);
    setShowLeaderboard(false);
    setFinalApplied(false);
    setFinalWagers([0, 0, 0, 0]);
    setFinalResults([true, true, true, true]);
    setFinalRevealQuestion(false);
    setFinalTimerEnabled(false);
    setFinalCountdown(45);
    if (finalTimerId.current != null) window.clearInterval(finalTimerId.current);
    finalTimerId.current = null;
    safeStop(sounds.finalThink);
  };

  const finalizeTile = (key: string) => {
    setCompleted((p) => ({ ...p, [key]: true }));
    setRevealed((p) => ({ ...p, [key]: false }));
    setShowAnswer((p) => ({ ...p, [key]: false }));
    setLockedOutTeams((p) => ({ ...p, [key]: [] }));
    setSelectedTeam(null);
  };

  /** ---------------------------------------
   *  Final Jeopardy countdown
   *  -------------------------------------- */
  useEffect(() => {
    if (!finalJeopardy || !finalTimerEnabled || !finalRevealQuestion) return;

    if (finalTimerId.current != null) window.clearInterval(finalTimerId.current);

    finalTimerId.current = window.setInterval(() => {
      setFinalCountdown((c) => {
        const next = c > 0 ? c - 1 : 0;
        if (next === 0) safeStop(sounds.finalThink);
        return next;
      });
    }, 1000);

    return () => {
      if (finalTimerId.current != null) window.clearInterval(finalTimerId.current);
      finalTimerId.current = null;
    };
  }, [finalJeopardy, finalTimerEnabled, finalRevealQuestion]);

  /** ---------------------------------------
   *  Keyboard controls (presentation mode)
   *  -------------------------------------- */
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!presentationMode) return;
      if (finalJeopardy || wagerModal) return;

      const key = getKey(activeCol, values[activeRow]);
      const isDone = !!completed[key];
      const isDD = dailyDoubles.includes(key);
      const val = values[activeRow];
      const award = isDD ? (ddWagers[key] ?? val) : val;

      // Navigation
      if (e.key === "ArrowUp") return setActiveRow((r) => Math.max(0, r - 1));
      if (e.key === "ArrowDown") return setActiveRow((r) => Math.min(values.length - 1, r + 1));
      if (e.key === "ArrowLeft") return setActiveCol((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") return setActiveCol((c) => Math.min(categories.length - 1, c + 1));

      // Team select 1-4
      if (["1", "2", "3", "4"].includes(e.key)) {
        setSelectedTeam(Number(e.key) - 1);
        return;
      }

      // Exit presentation
      if (e.key === "Escape") {
        setPresentationMode(false);
        return;
      }

      if (isDone) return;

      const questionShowing = !!revealed[key] && !showAnswer[key];
      const answerShowing = !!revealed[key] && !!showAnswer[key];
    

      // SPACE progression:
      // hidden -> question (or DD wager first)
      // answerShowing -> finalize
      if (e.key === " ") {
        e.preventDefault();

        // DD: only when going hidden -> open wager modal (team is chosen in modal)
        if (isDD && !revealed[key] && !showAnswer[key]) {
          const min = 5;
        
          // default team for the dropdown (if none selected yet, default to Team 1)
          const teamIdx = selectedTeam ?? 0;
          const max = Math.max(0, teamScores[teamIdx] ?? 0);
        
          safePlay(sounds.dailyDouble);
          setShowDDAnimation(true);
          window.setTimeout(() => {
            setShowDDAnimation(false);
            setWagerModal({ key, teamIdx, min, max });
          }, 1200);
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

        // Daily Double: once revealed, Space always clears it (silent)
        if (isDD && revealed[key]) {
          finalizeTile(key);
          return;
        }
        
        // Normal question: Space only clears AFTER answer is shown (silent)
        if (answerShowing) {
          finalizeTile(key);
          return;
        }

        // questionShowing but not answered: do nothing (judge with Enter/W)
        return;
      }

      const locked = lockedOutTeams[key] ?? [];

      // ENTER = correct (only when question showing)
      if (e.key === "Enter" && questionShowing) {
        if (selectedTeam == null) return;
        if (locked.includes(selectedTeam)) return;

        setTeamScores((ts) => ts.map((v, i) => (i === selectedTeam ? v + award : v)));
        safePlay(sounds.correct);

        safePlay(sounds.revealAnswer);
        setShowAnswer((p) => ({ ...p, [key]: true }));
        return;
      }

      // W = wrong (only when question showing)
      if (e.key.toLowerCase() === "w" && questionShowing) {
        if (selectedTeam == null) return;
        if (locked.includes(selectedTeam)) return;

        setTeamScores((ts) => ts.map((v, i) => (i === selectedTeam ? v - award : v)));
        safePlay(sounds.incorrect);

        const updatedLocked = [...locked, selectedTeam];
        setLockedOutTeams((p) => ({ ...p, [key]: updatedLocked }));

        // If all teams locked out, reveal + finalize
        if ([0, 1, 2, 3].every((t) => updatedLocked.includes(t))) {
          safePlay(sounds.revealAnswer);
          setShowAnswer((p) => ({ ...p, [key]: true }));
          finalizeTile(key);
        }

        return;
      }
    };

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [
    presentationMode,
    finalJeopardy,
    wagerModal,
    activeCol,
    activeRow,
    categories.length,
    values,
    revealed,
    showAnswer,
    completed,
    dailyDoubles,
    ddWagers,
    lockedOutTeams,
    selectedTeam,
    teamScores,
  ]);

  /** ---------------------------------------
   *  Mouse click behavior (host mode)
   *  -------------------------------------- */
  const handleClickTile = (col: number, rowIndex: number) => {
    if (presentationMode || finalJeopardy) return;

    const val = values[rowIndex];
    const key = getKey(col, val);
    if (completed[key]) return;

    const isDD = dailyDoubles.includes(key);

    // DD from hidden -> open wager modal
    if (isDD && !revealed[key] && !showAnswer[key]) {
      // In host mode, let them pick the team in the modal (default to Team 1)
      const teamIdx = selectedTeam ?? 0;
      const min = 5;
      const max = Math.max(0, teamScores[teamIdx] ?? 0);

      safePlay(sounds.dailyDouble);
      setShowDDAnimation(true);
      window.setTimeout(() => {
        setShowDDAnimation(false);
        setWagerModal({ key, teamIdx, min, max });
      }, 1200);
      return;
    }

    // hidden -> question
    if (!revealed[key]) {
      safePlay(sounds.revealQuestion);
      setRevealed((p) => ({ ...p, [key]: true }));
      setLockedOutTeams((p) => ({ ...p, [key]: [] }));
      return;
    }

    // question -> answer
    if (!showAnswer[key]) {
      safePlay(sounds.revealAnswer);
      setShowAnswer((p) => ({ ...p, [key]: true }));
      return;
    }

    // answer -> finalize
    safePlay(sounds.incorrect);
    finalizeTile(key);
  };

  /** ---------------------------------------
   *  Derived data
   *  -------------------------------------- */
  const ranked = useMemo(() => rankTeams(teamScores), [teamScores]);

  /** ---------------------------------------
   *  Leaderboard / Podium screen
   *  -------------------------------------- */
  if (showLeaderboard) {
    const podium = computePodiumWithTies(ranked);

    return (
      <div className="min-h-screen bg-[#351C15] w-full flex flex-col items-center justify-center text-white gap-10 p-8">
        <h1 className="text-6xl font-bold text-[#FFB500]">FINAL PODIUM</h1>

        <div className="flex items-end gap-8 flex-wrap justify-center">
          {podium.map((r, i) => (
            <div
              key={r.team}
              className={[
                "flex flex-col items-center justify-end rounded-xl font-bold shadow-xl px-6 py-4",
                i === 1 ? "bg-[#FFB500] text-[#351C15] h-64" : i === 0 ? "bg-[#4B2E1F] text-[#FFB500] h-52" : "bg-[#4B2E1F]/80 text-[#FFB500] h-44",
              ].join(" ")}
            >
              <div className="text-4xl mb-2">#{r.rank}</div>
              <div className="text-2xl">Team {r.team}</div>
              <div className="text-3xl">${r.score}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-4 flex-wrap justify-center">
          <button onClick={resetFinalJeopardy} className="mt-8 bg-red-600 text-white px-8 py-4 rounded font-bold text-xl">
            Reset Game
          </button>
          <button
            onClick={() => setShowLeaderboard(false)}
            className="mt-8 bg-[#4B2E1F] text-[#FFB500] px-8 py-4 rounded font-bold text-xl border border-[#FFB500]"
          >
            Back to Board
          </button>
        </div>
      </div>
    );
  }

  /** ---------------------------------------
   *  Final Jeopardy screen
   *  -------------------------------------- */
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
                  setFinalWagers((w) =>
                    w.map((x, idx) => (idx === i ? clamp(v, 0, Math.max(0, s)) : x))
                  );
                }}
              />
            </div>
          ))}

          <button
            onClick={() => setFinalRevealQuestion(true)}
            className="bg-amber-800 text-white py-2 rounded font-bold"
          >
            Lock Wagers & Reveal Question
          </button>

          <p className="text-xs text-center text-gray-600 mt-1">
            Timer starts when you press “Start 45s Timer” after the question is revealed.
          </p>
        </div>
      )}

      {finalRevealQuestion && (
        <div className="flex flex-col items-center gap-6 max-w-2xl text-center w-full">
          <p className="text-2xl">{finalQuestion}</p>

          <div className="bg-white text-black p-5 rounded-xl shadow-xl w-full max-w-2xl">
            <h3 className="text-xl font-bold mb-3">Mark Results</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamScores.map((s, i) => (
                <div key={i} className="flex items-center justify-between border rounded-lg px-3 py-2">
                  <div className="text-left">
                    <div className="font-bold">Team {i + 1}</div>
                    <div className="text-sm text-gray-600">
                      Score: ${s} • Wager: ${finalWagers[i]}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFinalResults((r) => r.map((v, idx) => (idx === i ? true : v)))}
                      className={[
                        "px-3 py-1 rounded font-bold border",
                        finalResults[i]
                          ? "bg-green-600 text-white border-green-700"
                          : "bg-white text-green-700 border-green-700",
                      ].join(" ")}
                    >
                      ✓ Correct
                    </button>

                    <button
                      type="button"
                      onClick={() => setFinalResults((r) => r.map((v, idx) => (idx === i ? false : v)))}
                      className={[
                        "px-3 py-1 rounded font-bold border",
                        !finalResults[i]
                          ? "bg-red-600 text-white border-red-700"
                          : "bg-white text-red-700 border-red-700",
                      ].join(" ")}
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

          {/* Buttons row */}
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
                if (!finalApplied) {
                  setTeamScores((scores) => applyFinalWagers(scores, finalWagers, finalResults));
                  setFinalApplied(true);
                }
                setFinalAnswerRevealed(true);
                safeStop(sounds.finalThink);
              }}
              className="bg-green-400 text-blue-900 px-6 py-3 rounded font-bold text-xl"
            >
              Reveal Correct Answer
            </button>

            <button
              onClick={() => setShowLeaderboard(true)}
              disabled={!finalApplied}
              className={[
                "px-6 py-3 rounded font-bold text-xl",
                finalApplied
                  ? "bg-[#4B2E1F] text-[#FFB500] border border-[#FFB500]"
                  : "bg-gray-500 text-gray-200 cursor-not-allowed",
              ].join(" ")}
            >
              Show Final Podium
            </button>
          </div>

          {/* Answer panel */}
          {finalAnswerRevealed && (
            <div className="bg-[#4B2E1F] border border-[#FFB500] text-[#FFB500] rounded-xl p-4 max-w-2xl w-full">
              <div className="text-sm opacity-90 mb-1">Answer</div>
              <div className="text-xl font-bold">{finalAnswer}</div>
              {!finalApplied && (
                <div className="text-xs opacity-80 mt-2">
                  (Scores update when you reveal the answer.)
                </div>
              )}
              {finalApplied && (
                <div className="text-xs opacity-80 mt-2">
                  (Final wagers applied. Leaderboard is ready.)
                </div>
              )}
            </div>
          )}

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


  /** ---------------------------------------
   *  Main board screen
   *  -------------------------------------- */
  return (
    <div className="min-h-screen bg-[#351C15] flex items-start justify-center p-4 relative overflow-hidden">
      <div className="flex w-full max-w-6xl gap-6">
        {/* Host controls (hidden in presentation mode) */}
        {!presentationMode && (
          <div className="w-64 bg-gray-800 text-white p-4 rounded-lg flex flex-col gap-3 h-fit sticky top-4">
            <h2 className="text-xl font-bold mb-1">Host Controls</h2>

            <button onClick={resetBoard} className="bg-green-600 py-2 px-3 rounded hover:bg-green-500 text-sm font-semibold">
              Reset Board
            </button>

            <button
              onClick={() => {
                setRevealed({});
                setShowAnswer({});
              }}
              className="bg-amber-700 py-2 px-3 rounded hover:bg-amber-600 text-sm font-semibold"
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
              setFinalAnswerRevealed(false); // 👈 add this
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

            {/* Team picker (useful for DD wager default in host mode) */}
            <div className="mt-2 p-3 bg-gray-700 rounded-lg">
              <div className="text-sm font-semibold mb-2">Selected Team (for DD)</div>
              <div className="grid grid-cols-2 gap-2">
                {[0, 1, 2, 3].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSelectedTeam(t)}
                    className={[
                      "py-1 rounded text-sm font-bold border",
                      selectedTeam === t ? "bg-white text-gray-900 border-white" : "bg-gray-600 text-white border-gray-500",
                    ].join(" ")}
                  >
                    Team {t + 1}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound test */}
            <div className="mt-3 p-3 bg-gray-700 rounded-lg flex flex-col gap-2">
              <h3 className="font-bold text-lg">Sound Test</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <button type="button" onClick={() => safePlay(sounds.dailyDouble)} className="bg-gray-600 py-1 rounded">
                  Daily Double
                </button>
                <button type="button" onClick={() => safePlay(sounds.revealQuestion)} className="bg-gray-600 py-1 rounded">
                  Reveal Q
                </button>
                <button type="button" onClick={() => safePlay(sounds.revealAnswer)} className="bg-gray-600 py-1 rounded">
                  Reveal A
                </button>
                <button type="button" onClick={() => safePlay(sounds.correct)} className="bg-gray-600 py-1 rounded">
                  Correct
                </button>
                <button type="button" onClick={() => safePlay(sounds.incorrect)} className="bg-gray-600 py-1 rounded">
                  Incorrect
                </button>
                <button type="button" onClick={() => safePlay(sounds.finalThink)} className="bg-gray-600 py-1 rounded">
                  Final Think
                </button>
                <button type="button" onClick={() => safeStop(sounds.finalThink)} className="bg-gray-600 py-1 rounded">
                  Stop Think
                </button>
                <button type="button" onClick={() => safePlay(sounds.timerBeep)} className="bg-gray-600 py-1 rounded">
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

          {/* Tiles */}
          <div className="grid grid-cols-4 w-full max-w-4xl gap-3 mt-4">
            {values.map((val, row) =>
              categories.map((_, col) => {
                const key = getKey(col, val);
                const isActive = presentationMode && row === activeRow && col === activeCol;
                const isDone = !!completed[key];

                return (
                  <div
                    key={key}
                    onClick={() => handleClickTile(col, row)}
                    className={[
                      "h-24 flex items-center justify-center rounded text-3xl font-bold cursor-pointer select-none transition-transform",
                      isDone ? "bg-gray-600 text-gray-400" : "bg-[#4B2E1F] text-[#FFB500]",
                      isActive ? "ring-4 ring-[#FFB500] scale-105" : "",
                    ].join(" ")}
                  >
                    {!revealed[key] && !isDone && <span>${val}</span>}
                    {revealed[key] && !showAnswer[key] && !isDone && (
                      <span className="px-2 text-base text-white">{qa[key]?.q ?? "Missing question"}</span>
                    )}
                    {showAnswer[key] && !isDone && (
                      <span className="px-2 text-lg italic text-green-200">{qa[key]?.a ?? "Missing answer"}</span>
                    )}
                    {isDone && <span className="text-xl">—</span>}
                  </div>
                );
              })
            )}
          </div>

          {/* Presentation HUD */}
          {presentationMode && (
            <div className="mt-4 text-yellow-200 text-sm flex flex-col items-center gap-1">
              <div>
                Active:{" "}
                <span className="font-bold">
                  {categories[activeCol]} ${values[activeRow]}
                </span>
              </div>
              <div>
                Selected Team:{" "}
                {selectedTeam != null ? <span className="font-bold">Team {selectedTeam + 1}</span> : <span className="italic">None</span>}
              </div>
              <div>
                Locked Out:{" "}
                {activeLockedTeams.length ? activeLockedTeams.map((t) => `Team ${t + 1}`).join(", ") : <span className="italic">None</span>}
              </div>
              <div className="text-[11px] text-[#FFB500]/80">
                Arrows = move • Space = question/finish • 1–4 select team • Enter = correct • W = wrong • Esc = exit
              </div>
            </div>
          )}

          {/* Daily Double overlay */}
          {showDDAnimation && (
            <div className="fixed inset-0 flex items-center justify-center text-6xl text-[#FFB500] font-bold bg-black/80 z-50 animate-fadeScaleIn">
              DAILY DOUBLE!
            </div>
          )}

          {/* Wager modal */}
          {wagerModal && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-white text-black p-6 rounded-xl w-96 flex flex-col gap-3">
                <h2 className="text-xl font-bold text-center">Daily Double Wager</h2>

                <div className="text-sm">
                  Choose team and wager.
                  <div className="text-xs text-gray-600 mt-1">Min $5, max current team score.</div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold">Team</label>
                  <select
                    className="border rounded p-2"
                    value={wagerModal.teamIdx}
                    onChange={(e) => {
                      const teamIdx = clamp(Number(e.target.value), 0, 3);
                      const max = Math.max(0, teamScores[teamIdx] ?? 0);
                      setWagerModal((m) => (m ? { ...m, teamIdx, max } : m));
                      setSelectedTeam(teamIdx);
                    }}
                  >
                    {[0, 1, 2, 3].map((t) => (
                      <option key={t} value={t}>
                        Team {t + 1} (${teamScores[t]})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-semibold">Wager</label>
                  <input
                    type="number"
                    min={wagerModal.min}
                    max={wagerModal.max}
                    className="border p-2 rounded w-40"
                    value={ddWagers[wagerModal.key] ?? wagerModal.min}
                    onChange={(e) => {
                      const raw = Number(e.target.value);
                      const v = clamp(isNaN(raw) ? wagerModal.min : raw, wagerModal.min, wagerModal.max);
                      setDdWagers((p) => ({ ...p, [wagerModal.key]: v }));
                    }}
                  />
                </div>

                <button
                  onClick={() => {
                    const chosen = wagerModal;
                    const wager = clamp(ddWagers[chosen.key] ?? chosen.min, chosen.min, chosen.max);
                    setDdWagers((p) => ({ ...p, [chosen.key]: wager }));
                    setWagerModal(null);

                    // Reveal question after wager locks
                    safePlay(sounds.revealQuestion);
                    setRevealed((p) => ({ ...p, [chosen.key]: true }));
                    setShowAnswer((p) => ({ ...p, [chosen.key]: false }));
                    setLockedOutTeams((p) => ({ ...p, [chosen.key]: [] }));
                  }}
                  className="bg-[#4B2E1F] text-white py-2 rounded font-bold"
                >
                  Lock Wager & Reveal Question
                </button>

                <button
                  onClick={() => setWagerModal(null)}
                  className="bg-gray-200 text-gray-900 py-2 rounded font-semibold"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Scoreboard */}
          <div className="mt-8 flex gap-6 justify-center w-full flex-wrap">
            {teamScores.map((s, i) => (
              <div
                key={i}
                className={[
                  "px-4 py-2 rounded-xl shadow-lg border-2 bg-[#4B2E1F] text-[#FFB500] text-center min-w-[120px] transition-transform",
                  selectedTeam === i ? "border-white scale-105" : "border-[#FFB500]",
                ].join(" ")}
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
