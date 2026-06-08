import { useEffect, useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BarChart3,
  BookOpen,
  ChevronRight,
  Download,
  Home,
  Medal,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Timer,
  Trophy,
  UserRoundPen,
  Zap,
} from "lucide-react";
import {
  badges,
  categories,
  LEADERBOARD_KEY,
  levels,
  PROGRESS_KEY,
  questionBank,
  quizModes,
  seededLeaderboard,
  USER_NAME_KEY,
} from "./data";
import questLogo from "./assets/quest.png";

const initialProgress = {
  xp: 0,
  quizzesCompleted: 0,
  totalCorrect: 0,
  totalAnswered: 0,
  totalScore: 0,
  streak: 0,
  badges: [],
};

const pageMotion = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
  transition: { duration: 0.28, ease: "easeOut" },
};

function loadJson(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    if (!stored) return fallback;

    const parsed = JSON.parse(stored);
    return Array.isArray(fallback) ? parsed : { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

function getStoredName() {
  return localStorage.getItem(USER_NAME_KEY) || "";
}

function getLevelInfo(xp) {
  const currentIndex = levels.reduce((match, level, index) => (xp >= level.xp ? index : match), 0);
  const current = levels[currentIndex];
  const next = levels[currentIndex + 1] || null;
  const progress = next ? Math.min(100, ((xp - current.xp) / (next.xp - current.xp)) * 100) : 100;

  return {
    current,
    next,
    progress,
    required: next ? Math.max(0, next.xp - xp) : 0,
  };
}

function shuffle(items) {
  return [...items]
    .map((item) => ({ item, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ item }) => item);
}

function pickQuestions(modeId, categoryId) {
  const mode = quizModes.find((item) => item.id === modeId) || quizModes[0];
  const pool = mode.id === "mock" || categoryId === "mixed"
    ? questionBank
    : questionBank.filter((question) => question.category === categoryId);

  return shuffle(pool).slice(0, Math.min(mode.questionCount, pool.length));
}

function calculateBadges({ categoryId, modeId, previousProgress, quizCorrect, quizTotal, articleCorrect, xp }) {
  const unlocked = new Set(previousProgress.badges);
  const newlyUnlocked = [];

  const unlock = (id, condition) => {
    if (condition && !unlocked.has(id)) {
      unlocked.add(id);
      newlyUnlocked.push(id);
    }
  };

  unlock("first_quiz", previousProgress.quizzesCompleted + 1 >= 1);
  unlock("rights_defender", categoryId === "rights" && quizCorrect / quizTotal >= 0.7);
  unlock("article_master", articleCorrect >= 3);
  unlock("constitutional_warrior", xp >= 800);
  unlock("quiz_streak", previousProgress.streak + 1 >= 5);
  unlock("perfect_score", quizCorrect === quizTotal);
  unlock("speed_master", modeId === "rapid" && quizCorrect / quizTotal >= 0.8);
  unlock("knowledge_seeker", previousProgress.badges.includes("knowledge_seeker"));

  return { all: [...unlocked], newlyUnlocked };
}

function getBadgeMeta(id) {
  return badges.find((badge) => badge.id === id);
}

export default function SamvidhanQuest() {
  const [splash, setSplash] = useState(true);
  const [userName, setUserName] = useState(getStoredName);
  const [screen, setScreen] = useState(userName ? "home" : "entry");
  const [progress, setProgress] = useState(() => loadJson(PROGRESS_KEY, initialProgress));
  const [leaderboard, setLeaderboard] = useState(() => loadJson(LEADERBOARD_KEY, seededLeaderboard));
  const [selectedMode, setSelectedMode] = useState("practice");
  const [selectedCategory, setSelectedCategory] = useState("rights");
  const [quiz, setQuiz] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [timeLeft, setTimeLeft] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [celebration, setCelebration] = useState(null);

  const levelInfo = useMemo(() => getLevelInfo(progress.xp), [progress.xp]);
  const accuracy = progress.totalAnswered ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) : 0;
  const currentMode = quizModes.find((mode) => mode.id === selectedMode) || quizModes[0];
  const currentQuestion = quiz[currentIndex];
  const currentCategory = categories.find((category) => category.id === selectedCategory);
  const modeTimer = currentMode.timer;

  useEffect(() => {
    const timer = window.setTimeout(() => setSplash(false), 1450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  }, [progress]);

  useEffect(() => {
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(leaderboard));
  }, [leaderboard]);

  useEffect(() => {
    if (screen !== "quiz" || !modeTimer || showFeedback || !currentQuestion) return undefined;

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          window.clearInterval(interval);
          setSelectedOption(null);
          setShowFeedback(true);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [currentIndex, currentQuestion, modeTimer, screen, showFeedback]);

  const handleNameSubmit = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;

    localStorage.setItem(USER_NAME_KEY, trimmed);
    setUserName(trimmed);
    setScreen("home");
  };

  const handleChangeName = () => {
    localStorage.removeItem(USER_NAME_KEY);
    setUserName("");
    setScreen("entry");
  };

  const navigate = (target) => {
    if (target === "learn") {
      setProgress((prev) => ({
        ...prev,
        badges: prev.badges.includes("knowledge_seeker") ? prev.badges : [...prev.badges, "knowledge_seeker"],
      }));
    }

    setScreen(target);
  };

  const startQuiz = (modeId, categoryId = "mixed") => {
    const questions = pickQuestions(modeId, categoryId);

    setSelectedMode(modeId);
    setSelectedCategory(categoryId);
    setQuiz(questions);
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowFeedback(false);
    setAnswers([]);
    setTimeLeft(quizModes.find((mode) => mode.id === modeId)?.timer ?? null);
    setScreen("quiz");
  };

  const answerQuestion = (option) => {
    if (showFeedback) return;
    setSelectedOption(option);
    setShowFeedback(true);
  };

  const continueQuiz = () => {
    const isCorrect = selectedOption === currentQuestion.answer;
    const answer = {
      questionId: currentQuestion.id,
      category: currentQuestion.category,
      isCorrect,
      tags: currentQuestion.tags || [],
    };
    const nextAnswers = [...answers, answer];

    if (currentIndex < quiz.length - 1) {
      setAnswers(nextAnswers);
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setShowFeedback(false);
      setTimeLeft(currentMode.timer ?? null);
      return;
    }

    finishQuiz(nextAnswers);
  };

  const finishQuiz = (finalAnswers) => {
    const correct = finalAnswers.filter((answer) => answer.isCorrect).length;
    const articleCorrect = finalAnswers.filter((answer) => answer.isCorrect && answer.tags.includes("article")).length;
    const total = quiz.length;
    const score = correct * 100;
    const xpGain = correct * 20 + Math.round((correct / Math.max(total, 1)) * 60) + (currentMode.id === "mock" ? 100 : 30);
    const oldLevel = getLevelInfo(progress.xp).current.name;
    const nextXp = progress.xp + xpGain;
    const newLevel = getLevelInfo(nextXp).current.name;
    const badgeResult = calculateBadges({
      articleCorrect,
      categoryId: selectedCategory,
      modeId: currentMode.id,
      previousProgress: progress,
      quizCorrect: correct,
      quizTotal: total,
      xp: nextXp,
    });
    const nextProgress = {
      ...progress,
      xp: nextXp,
      quizzesCompleted: progress.quizzesCompleted + 1,
      totalCorrect: progress.totalCorrect + correct,
      totalAnswered: progress.totalAnswered + total,
      totalScore: progress.totalScore + score,
      streak: progress.streak + 1,
      badges: badgeResult.all,
    };

    const result = {
      mode: currentMode.title,
      category: currentCategory?.title || "Mixed Constitution",
      score,
      correct,
      total,
      accuracy: Math.round((correct / Math.max(total, 1)) * 100),
      xpGain,
      level: newLevel,
      badgeEarned: badgeResult.newlyUnlocked[0] || nextProgress.badges.at(-1) || "first_quiz",
      newBadges: badgeResult.newlyUnlocked,
      date: new Date().toISOString(),
    };

    setProgress(nextProgress);
    setLastResult(result);
    setLeaderboard((prev) => {
      const entry = {
        name: userName,
        score: nextProgress.totalScore,
        level: newLevel,
        badgeCount: nextProgress.badges.length,
      };
      const withoutCurrent = prev.filter((player) => player.name !== userName);
      return [entry, ...withoutCurrent].sort((a, b) => b.score - a.score).slice(0, 10);
    });
    setCelebration({
      xpGain,
      levelUp: oldLevel !== newLevel ? newLevel : null,
      badges: badgeResult.newlyUnlocked,
    });
    setScreen("result");
  };

  if (splash) return <SplashScreen />;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#050816] text-white">
      <AnimatedBackground />
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        {screen !== "entry" && (
          <Navbar
            levelInfo={levelInfo}
            onChangeName={handleChangeName}
            onNavigate={navigate}
            userName={userName}
            xp={progress.xp}
          />
        )}

        <AnimatePresence mode="wait">
          {screen === "entry" && <EntryScreen key="entry" onSubmit={handleNameSubmit} />}
          {screen === "home" && (
            <Dashboard
              key="home"
              accuracy={accuracy}
              levelInfo={levelInfo}
              leaderboard={leaderboard}
              onNavigate={navigate}
              progress={progress}
              startQuiz={startQuiz}
              userName={userName}
            />
          )}
          {screen === "profile" && (
            <ProfileDashboard
              key="profile"
              accuracy={accuracy}
              levelInfo={levelInfo}
              progress={progress}
              userName={userName}
            />
          )}
          {screen === "modes" && <Modes key="modes" onStart={startQuiz} />}
          {screen === "learn" && <LearnMode key="learn" onStart={startQuiz} />}
          {screen === "leaderboard" && <LeaderboardPage key="leaderboard" leaderboard={leaderboard} />}
          {screen === "quiz" && currentQuestion && (
            <Quiz
              key="quiz"
              currentIndex={currentIndex}
              currentMode={currentMode}
              currentQuestion={currentQuestion}
              onAnswer={answerQuestion}
              onContinue={continueQuiz}
              progress={(currentIndex / quiz.length) * 100}
              quizLength={quiz.length}
              selectedOption={selectedOption}
              showFeedback={showFeedback}
              timeLeft={timeLeft}
            />
          )}
          {screen === "result" && lastResult && (
            <Result
              key="result"
              celebration={celebration}
              leaderboard={leaderboard}
              onCertificate={() => setScreen("certificate")}
              onHome={() => navigate("home")}
              onRetry={() => startQuiz(selectedMode, selectedCategory)}
              result={lastResult}
            />
          )}
          {screen === "certificate" && lastResult && (
            <Certificate
              key="certificate"
              badge={getBadgeMeta(lastResult.badgeEarned)?.title || lastResult.level}
              date={new Date(lastResult.date)}
              name={userName}
              onBack={() => setScreen("result")}
              result={lastResult}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

function SplashScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] text-white">
      <AnimatedBackground />
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} className="relative text-center">
        <motion.div
          animate={{
            boxShadow: [
              "0 0 26px rgba(245, 158, 11, 0.18)",
              "0 0 62px rgba(245, 158, 11, 0.42)",
              "0 0 26px rgba(245, 158, 11, 0.18)",
            ],
          }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          className="mx-auto rounded-[2rem] border border-amber-200/20 bg-white/[0.06] p-5 backdrop-blur-xl"
        >
          <motion.img
            src={questLogo}
            alt="Samvidhan Quest"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="h-24 w-auto object-contain sm:h-32"
          />
        </motion.div>
        <p className="mt-3 text-sm uppercase tracking-[0.3em] text-emerald-200">Loading civic missions</p>
        <div className="mx-auto mt-6 h-2 w-64 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-orange-500 via-white to-emerald-500" initial={{ x: "-100%" }} animate={{ x: "100%" }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }} />
        </div>
      </motion.div>
    </main>
  );
}

function AnimatedBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-white to-emerald-500" />
      <div className="absolute -left-24 top-16 h-80 w-80 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="absolute right-[-8rem] top-1/3 h-96 w-96 rounded-full bg-emerald-500/20 blur-3xl" />
      <div className="absolute bottom-[-10rem] left-1/3 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      {Array.from({ length: 26 }, (_, index) => (
        <motion.span
          key={index}
          className="absolute h-1.5 w-1.5 rounded-full bg-white/25"
          style={{
            left: `${(index * 37) % 100}%`,
            top: `${(index * 19) % 100}%`,
          }}
          animate={{ y: [0, -18, 0], opacity: [0.2, 0.8, 0.2] }}
          transition={{ duration: 3 + (index % 5), repeat: Infinity, delay: index * 0.12 }}
        />
      ))}
    </div>
  );
}

function EntryScreen({ onSubmit }) {
  const [name, setName] = useState("");

  return (
    <motion.section {...pageMotion} className="mx-auto flex min-h-screen w-full max-w-5xl items-center py-10">
      <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] shadow-2xl backdrop-blur-xl lg:grid-cols-[1fr_.85fr]">
        <div className="p-7 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/20 bg-orange-500/10 px-3 py-1 text-sm font-bold text-orange-100">
            <Sparkles className="h-4 w-4" /> No login. Just your name.
          </div>
          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">Start your Constitution learning streak.</h1>
          <p className="mt-5 max-w-xl text-lg text-slate-300">Personalize your dashboard, XP, badges, leaderboard, and certificate in one lightweight local profile.</p>
          <form
            className="mt-8"
            onSubmit={(event) => {
              event.preventDefault();
              onSubmit(name);
            }}
          >
            <label htmlFor="name" className="text-sm font-bold text-slate-200">Your name</label>
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              <input
                id="name"
                autoFocus
                value={name}
                maxLength={32}
                onChange={(event) => setName(event.target.value)}
                placeholder="Enter your name"
                className="min-h-14 flex-1 rounded-2xl border border-white/15 bg-slate-950/70 px-4 text-white outline-none placeholder:text-slate-500 focus:border-orange-300"
              />
              <PrimaryButton type="submit" icon={Play}>Enter Quest</PrimaryButton>
            </div>
          </form>
        </div>
        <div className="relative min-h-80 overflow-hidden bg-gradient-to-br from-orange-500/20 via-blue-600/10 to-emerald-500/20 p-7">
          <motion.div animate={{ y: [0, -12, 0] }} transition={{ duration: 4, repeat: Infinity }} className="rounded-[2rem] border border-white/15 bg-slate-950/60 p-6 shadow-2xl backdrop-blur">
            <ShieldCheck className="h-12 w-12 text-orange-200" />
            <h2 className="mt-5 text-2xl font-black">Gamified civic learning</h2>
            <div className="mt-6 grid gap-3">
              {["XP progression", "Badges and streaks", "Mock tests", "Downloadable certificate"].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 text-sm font-bold">
                  <Star className="h-4 w-4 text-emerald-200" /> {item}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}

function Navbar({ levelInfo, onChangeName, onNavigate, userName, xp }) {
  const links = [
    ["home", "Home", Home],
    ["profile", "Profile", BarChart3],
    ["learn", "Learn", BookOpen],
    ["leaderboard", "Leaderboard", Trophy],
  ];

  return (
    <nav className="sticky top-4 z-30 mb-8 rounded-[1.7rem] border border-white/10 bg-slate-950/65 px-4 py-3 shadow-2xl backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <button onClick={() => onNavigate("home")} className="flex items-center gap-3 text-left">
          <img src={questLogo} alt="Samvidhan Quest" className="h-11 w-auto object-contain sm:h-[60px]" />
          <span>
            <span className="text-xs text-slate-400">Welcome, {userName}</span>
          </span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          {links.map(([id, label, Icon]) => (
            <button key={id} onClick={() => onNavigate(id)} className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-bold text-slate-200 transition hover:-translate-y-0.5 hover:bg-white/10">
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-white/10 px-3 py-2 text-sm font-bold">{xp} XP</span>
          <span className="rounded-full bg-emerald-500/15 px-3 py-2 text-sm font-bold text-emerald-100">{levelInfo.current.name}</span>
          <button onClick={onChangeName} className="flex items-center gap-2 rounded-full border border-orange-300/20 px-3 py-2 text-sm font-bold text-orange-100 transition hover:bg-orange-500/10">
            <UserRoundPen className="h-4 w-4" /> Change Name
          </button>
        </div>
      </div>
    </nav>
  );
}

function Dashboard({ accuracy, leaderboard, levelInfo, onNavigate, progress, startQuiz, userName }) {
  return (
    <motion.section {...pageMotion} className="grid gap-6 xl:grid-cols-[1.5fr_.8fr]">
      <div className="space-y-6">
        <Hero userName={userName} onStart={() => onNavigate("modes")} onLearn={() => onNavigate("learn")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Zap} label="XP" value={progress.xp} accent="text-orange-200" />
          <MetricCard icon={Trophy} label="Quizzes" value={progress.quizzesCompleted} accent="text-emerald-200" />
          <MetricCard icon={Target} label="Accuracy" value={`${accuracy}%`} accent="text-cyan-200" />
          <MetricCard icon={Award} label="Badges" value={progress.badges.length} accent="text-yellow-200" />
        </div>
        <ProgressPanel levelInfo={levelInfo} xp={progress.xp} />
        <ModePreview startQuiz={startQuiz} />
      </div>

      <aside className="space-y-6">
        <ProfileMini accuracy={accuracy} levelInfo={levelInfo} progress={progress} userName={userName} />
        <LeaderboardCard players={leaderboard.slice(0, 5)} />
        <BadgeShelf unlocked={progress.badges} />
      </aside>
    </motion.section>
  );
}

function Hero({ onLearn, onStart, userName }) {
  return (
    <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-9">
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute right-8 top-8 hidden rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-2xl lg:block">
        <Medal className="h-16 w-16 text-orange-200" />
      </motion.div>
      <div className="max-w-3xl">
        <p className="inline-flex rounded-full border border-emerald-300/20 bg-emerald-500/10 px-3 py-1 text-sm font-bold text-emerald-100">Welcome, {userName}</p>
        <h1 className="mt-5 text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
          Master the Indian Constitution like a game.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">Quests, mock tests, timed challenges, XP, badges, and certificates designed for college-ready civic learning.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <PrimaryButton onClick={onStart} icon={Play}>Start Quest</PrimaryButton>
          <SecondaryButton onClick={onLearn} icon={BookOpen}>Learn Mode</SecondaryButton>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ accent, icon: Icon, label, value }) {
  return (
    <motion.div whileHover={{ y: -4 }} className="rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
      <Icon className={`h-6 w-6 ${accent}`} />
      <p className="mt-4 text-3xl font-black">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
    </motion.div>
  );
}

function ProgressPanel({ levelInfo, xp }) {
  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Level Progress</p>
          <h2 className="mt-1 text-2xl font-black">{levelInfo.current.name}</h2>
        </div>
        <p className="text-sm font-bold text-emerald-100">{levelInfo.next ? `${levelInfo.required} XP to ${levelInfo.next.name}` : "Max level reached"}</p>
      </div>
      <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/10">
        <motion.div className="h-full rounded-full bg-gradient-to-r from-orange-500 via-white to-emerald-500" initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }} transition={{ duration: 0.8 }} />
      </div>
      <div className="mt-3 flex justify-between text-xs text-slate-400">
        <span>{levelInfo.current.xp} XP</span>
        <span>{xp} XP</span>
        <span>{levelInfo.next?.xp || xp} XP</span>
      </div>
    </div>
  );
}

function ModePreview({ startQuiz }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {quizModes.map((mode) => (
        <motion.button
          key={mode.id}
          whileHover={{ y: -4 }}
          onClick={() => startQuiz(mode.id, mode.id === "mock" ? "mixed" : "rights")}
          className="group rounded-[1.5rem] border border-white/10 bg-white/[0.08] p-5 text-left shadow-xl backdrop-blur transition hover:bg-white/[0.12]"
        >
          <mode.icon className="h-8 w-8 text-orange-200" />
          <h3 className="mt-4 text-xl font-black">{mode.title}</h3>
          <p className="mt-2 text-sm text-slate-400">{mode.description}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-emerald-100">Launch <ChevronRight className="h-4 w-4 transition group-hover:translate-x-1" /></span>
        </motion.button>
      ))}
    </div>
  );
}

function ProfileMini({ accuracy, levelInfo, progress, userName }) {
  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
      <div className="flex items-center gap-4">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-orange-500 to-emerald-500 text-xl font-black">{userName.slice(0, 1).toUpperCase()}</div>
        <div>
          <h3 className="text-xl font-black">{userName}</h3>
          <p className="text-sm text-slate-400">{levelInfo.current.name}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <MiniStat label="Accuracy" value={`${accuracy}%`} />
        <MiniStat label="Total Score" value={progress.totalScore} />
        <MiniStat label="Streak" value={progress.streak} />
        <MiniStat label="Badges" value={progress.badges.length} />
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="font-black">{value}</p>
      <p className="text-xs text-slate-400">{label}</p>
    </div>
  );
}

function ProfileDashboard({ accuracy, levelInfo, progress, userName }) {
  return (
    <motion.section {...pageMotion} className="space-y-6">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 shadow-2xl backdrop-blur-xl sm:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 place-items-center rounded-[1.7rem] bg-gradient-to-br from-orange-500 via-blue-500 to-emerald-500 text-3xl font-black">{userName.slice(0, 1).toUpperCase()}</div>
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">Profile Dashboard</p>
              <h1 className="text-4xl font-black">{userName}</h1>
              <p className="text-emerald-100">{levelInfo.current.name}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white/10 px-5 py-4 text-right">
            <p className="text-3xl font-black">{progress.xp}</p>
            <p className="text-sm text-slate-400">Total XP</p>
          </div>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard icon={Award} label="Badges earned" value={progress.badges.length} accent="text-yellow-200" />
        <MetricCard icon={Trophy} label="Quizzes completed" value={progress.quizzesCompleted} accent="text-orange-200" />
        <MetricCard icon={Target} label="Accuracy" value={`${accuracy}%`} accent="text-emerald-200" />
        <MetricCard icon={BarChart3} label="Total score" value={progress.totalScore} accent="text-blue-200" />
      </div>
      <ProgressPanel levelInfo={levelInfo} xp={progress.xp} />
      <BadgeShelf unlocked={progress.badges} expanded />
    </motion.section>
  );
}

function Modes({ onStart }) {
  return (
    <motion.section {...pageMotion} className="space-y-6">
      <SectionHeading label="Quiz Modes" title="Choose your mission style" subtitle="Pick a mode and a topic. Mock Test automatically mixes the full Constitution question bank." />
      <div className="grid gap-5 lg:grid-cols-2">
        {quizModes.map((mode) => (
          <div key={mode.id} className="rounded-[1.7rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-white/10 p-3"><mode.icon className="h-7 w-7 text-orange-200" /></div>
              <div>
                <h3 className="text-2xl font-black">{mode.title}</h3>
                <p className="mt-1 text-sm text-slate-400">{mode.description}</p>
              </div>
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {(mode.id === "mock" ? [{ id: "mixed", title: "Mixed Constitution", icon: Sparkles }] : categories).map((category) => (
                <button key={category.id} onClick={() => onStart(mode.id, category.id)} className="rounded-2xl border border-white/10 bg-slate-950/40 p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/10">
                  <div className="flex items-center gap-2 font-bold">
                    <category.icon className="h-4 w-4 text-emerald-200" /> {category.title}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

function LearnMode({ onStart }) {
  return (
    <motion.section {...pageMotion} className="space-y-6">
      <SectionHeading label="Learn Mode" title="Revision cards for every Constitution topic" subtitle="Short notes, important Articles, and quick facts before you jump into practice." />
      <div className="grid gap-5 lg:grid-cols-2">
        {categories.map((category) => (
          <motion.article key={category.id} whileHover={{ y: -4 }} className="overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.08] shadow-xl backdrop-blur">
            <div className={`h-2 bg-gradient-to-r ${category.accent}`} />
            <div className="p-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-white/10 p-3"><category.icon className="h-8 w-8 text-orange-200" /></div>
                <div>
                  <h3 className="text-2xl font-black">{category.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{category.description}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <RevisionBlock title="Short Notes" items={category.notes} />
                <RevisionBlock title="Important Articles" items={category.articles} compact />
              </div>
              <RevisionBlock title="Key Facts" items={category.facts} />
              <button onClick={() => onStart("practice", category.id)} className="mt-5 rounded-2xl bg-white px-5 py-3 font-black text-slate-950 transition hover:-translate-y-0.5">Practice this topic</button>
            </div>
          </motion.article>
        ))}
      </div>
    </motion.section>
  );
}

function RevisionBlock({ compact, items, title }) {
  return (
    <div className="mt-4 rounded-2xl bg-slate-950/45 p-4">
      <h4 className="font-black text-emerald-100">{title}</h4>
      <div className={`mt-3 ${compact ? "flex flex-wrap gap-2" : "space-y-2"}`}>
        {items.map((item) => compact ? (
          <span key={item} className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">{item}</span>
        ) : (
          <p key={item} className="text-sm leading-6 text-slate-300">{item}</p>
        ))}
      </div>
    </div>
  );
}

function Quiz({ currentIndex, currentMode, currentQuestion, onAnswer, onContinue, progress, quizLength, selectedOption, showFeedback, timeLeft }) {
  const isCorrect = selectedOption === currentQuestion.answer;
  const timedOut = showFeedback && selectedOption === null;

  return (
    <motion.section {...pageMotion} className="mx-auto w-full max-w-4xl">
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-5 shadow-2xl backdrop-blur-xl sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400">{currentMode.title}</p>
            <h2 className="text-2xl font-black">Question {currentIndex + 1} of {quizLength}</h2>
          </div>
          {currentMode.timer ? (
            <div className={`flex items-center gap-2 rounded-full px-4 py-2 font-black ${(timeLeft ?? currentMode.timer) <= 5 ? "bg-red-500/20 text-red-100" : "bg-white/10 text-orange-100"}`}>
              <Timer className="h-5 w-5" /> {timeLeft ?? currentMode.timer}s
            </div>
          ) : (
            <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-sm font-bold text-emerald-100">No timer</span>
          )}
        </div>
        <div className="mt-6 h-4 overflow-hidden rounded-full bg-white/10">
          <motion.div className="h-full rounded-full bg-gradient-to-r from-orange-500 via-white to-emerald-500" animate={{ width: `${progress}%` }} />
        </div>

        <div className="mt-8 rounded-[1.5rem] bg-slate-950/50 p-5">
          <h1 className="text-2xl font-black leading-snug sm:text-3xl">{currentQuestion.question}</h1>
        </div>

        <div className="mt-5 grid gap-3">
          {currentQuestion.options.map((option) => {
            const correct = option === currentQuestion.answer;
            const selected = option === selectedOption;
            const state = showFeedback && correct
              ? "border-emerald-300 bg-emerald-500/25"
              : showFeedback && selected
                ? "border-red-300 bg-red-500/25"
                : "border-white/10 bg-white/[0.07] hover:bg-white/[0.12]";

            return (
              <motion.button
                key={option}
                whileHover={!showFeedback ? { x: 5 } : undefined}
                onClick={() => onAnswer(option)}
                className={`rounded-2xl border p-4 text-left font-bold transition ${state}`}
              >
                {option}
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {showFeedback && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-[1.5rem] border border-white/10 bg-slate-950/70 p-5">
              <p className="text-xl font-black">{timedOut ? "Time up." : isCorrect ? "Correct answer." : "Not quite."}</p>
              <p className="mt-2 text-slate-300">{currentQuestion.explanation}</p>
              <button onClick={onContinue} className="mt-5 rounded-2xl bg-white px-5 py-3 font-black text-slate-950">{currentIndex === quizLength - 1 ? "Finish Quiz" : "Continue"}</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  );
}

function Result({ celebration, leaderboard, onCertificate, onHome, onRetry, result }) {
  return (
    <motion.section {...pageMotion} className="mx-auto w-full max-w-5xl space-y-6">
      <Celebration celebration={celebration} />
      <div className="rounded-[2rem] border border-white/10 bg-white/[0.08] p-6 text-center shadow-2xl backdrop-blur-xl sm:p-8">
        <Trophy className="mx-auto h-16 w-16 text-orange-200" />
        <h1 className="mt-4 text-4xl font-black">Quest Complete</h1>
        <p className="mt-2 text-slate-300">{result.mode} - {result.category}</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-4">
          <MiniStat label="Score" value={result.score} />
          <MiniStat label="Correct" value={`${result.correct}/${result.total}`} />
          <MiniStat label="Accuracy" value={`${result.accuracy}%`} />
          <MiniStat label="XP gained" value={`+${result.xpGain}`} />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <PrimaryButton onClick={onCertificate} icon={Medal}>Generate Certificate</PrimaryButton>
          <SecondaryButton onClick={onRetry} icon={RotateCcw}>Retry</SecondaryButton>
          <SecondaryButton onClick={onHome} icon={Home}>Home</SecondaryButton>
        </div>
      </div>
      <LeaderboardCard players={leaderboard.slice(0, 5)} />
    </motion.section>
  );
}

function Celebration({ celebration }) {
  if (!celebration) return null;

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-orange-300/20 bg-orange-500/10 p-4 font-black text-orange-100">
        +{celebration.xpGain} XP earned
      </motion.div>
      {celebration.levelUp && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 p-4 font-black text-emerald-100">
          Level up: {celebration.levelUp}
        </motion.div>
      )}
      {celebration.badges.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-yellow-300/20 bg-yellow-500/10 p-4 font-black text-yellow-100">
          Badge unlocked: {getBadgeMeta(celebration.badges[0])?.title}
        </motion.div>
      )}
    </div>
  );
}

function Certificate({ badge, date, name, onBack, result }) {
  const certificateRef = useRef(null);
  const formattedDate = date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  const downloadCertificate = async () => {
    if (!certificateRef.current) return;

    const canvas = await html2canvas(certificateRef.current, {
      backgroundColor: "#ffffff",
      scale: 2,
    });
    const link = document.createElement("a");
    link.download = `samvidhan-quest-certificate-${name.replace(/\s+/g, "-").toLowerCase()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <motion.section {...pageMotion} className="mx-auto w-full max-w-6xl">
      <div className="mb-4 flex flex-wrap justify-center gap-3 print:hidden">
        <SecondaryButton onClick={onBack} icon={ChevronRight}>Back to Result</SecondaryButton>
        <PrimaryButton onClick={downloadCertificate} icon={Download}>Download Certificate</PrimaryButton>
      </div>
      <div ref={certificateRef} className="certificate mx-auto bg-white p-4 text-slate-950 shadow-2xl sm:p-6">
        <div className="flex min-h-[650px] flex-col border-[10px] border-double border-orange-500 p-6 text-center sm:p-10">
          <div className="mx-auto h-2 w-72 rounded-full bg-gradient-to-r from-orange-500 via-blue-700 to-emerald-600" />
          <ShieldCheck className="mx-auto mt-8 h-16 w-16 text-orange-500" />
          <p className="mt-5 text-sm font-black uppercase tracking-[0.35em] text-blue-950">Samvidhan Quest</p>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-6xl">Certificate of Achievement</h1>
          <p className="mt-9 text-lg text-slate-600">This certificate is proudly awarded to</p>
          <p className="mt-3 break-words text-4xl font-black text-blue-950 sm:text-6xl">{name}</p>
          <p className="mx-auto mt-8 max-w-3xl text-lg text-slate-600">for completing a Samvidhan Quest challenge and demonstrating commitment to learning the Indian Constitution.</p>
          <div className="mt-10 grid gap-4 text-left sm:grid-cols-4">
            <CertificateMetric label="Score" value={`${result.correct}/${result.total}`} />
            <CertificateMetric label="Level" value={result.level} />
            <CertificateMetric label="Badge earned" value={badge} />
            <CertificateMetric label="Date" value={formattedDate} />
          </div>
          <div className="mt-auto flex flex-wrap items-end justify-between gap-5 border-t border-slate-200 pt-7 text-left">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-slate-500">Project</p>
              <p className="mt-1 text-xl font-black text-slate-950">Samvidhan Quest</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-black text-slate-950">Civic Learning MVP</p>
              <p className="text-sm text-slate-500">Digitally generated certificate</p>
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function CertificateMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-black text-slate-950">{value}</p>
    </div>
  );
}

function LeaderboardPage({ leaderboard }) {
  return (
    <motion.section {...pageMotion} className="space-y-6">
      <SectionHeading label="Leaderboard" title="Top civic learners" subtitle="Stored locally in this browser with rank, score, level, and badge count." />
      <LeaderboardCard players={leaderboard} large />
    </motion.section>
  );
}

function LeaderboardCard({ large, players }) {
  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-xl font-black"><Trophy className="h-5 w-5 text-orange-200" /> Leaderboard</h3>
        <span className="text-sm text-slate-400">{players.length} learners</span>
      </div>
      <div className="space-y-3">
        {players.map((player, index) => (
          <motion.div key={`${player.name}-${index}`} whileHover={{ x: 4 }} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 p-3">
            <div className={`grid h-10 w-10 place-items-center rounded-xl font-black ${index === 0 ? "bg-orange-500 text-white" : "bg-white/10"}`}>{index + 1}</div>
            <div>
              <p className="font-black">{player.name}</p>
              <p className="text-xs text-slate-400">{player.level} - {player.badgeCount} badges</p>
            </div>
            <p className={`${large ? "text-2xl" : "text-lg"} font-black text-emerald-100`}>{player.score}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function BadgeShelf({ expanded, unlocked }) {
  return (
    <div className="rounded-[1.7rem] border border-white/10 bg-white/[0.08] p-5 shadow-xl backdrop-blur">
      <h3 className="mb-4 flex items-center gap-2 text-xl font-black"><Award className="h-5 w-5 text-yellow-200" /> Badges</h3>
      <div className={`grid gap-3 ${expanded ? "sm:grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`}>
        {badges.map((badge) => {
          const isUnlocked = unlocked.includes(badge.id);

          return (
            <motion.div key={badge.id} whileHover={{ y: -3 }} className={`rounded-2xl border p-4 ${isUnlocked ? "border-yellow-300/25 bg-yellow-500/10" : "border-white/10 bg-slate-950/45 opacity-55"}`}>
              <badge.icon className={`h-7 w-7 ${isUnlocked ? "text-yellow-200" : "text-slate-500"}`} />
              <p className="mt-3 font-black">{badge.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">{badge.description}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeading({ label, subtitle, title }) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-200">{label}</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-3xl text-slate-300">{subtitle}</p>
    </div>
  );
}

function PrimaryButton({ children, icon: Icon, ...props }) {
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 font-black text-slate-950 shadow-lg shadow-white/10" {...props}>
      <Icon className="h-5 w-5" /> {children}
    </motion.button>
  );
}

function SecondaryButton({ children, icon: Icon, ...props }) {
  return (
    <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.98 }} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.06] px-5 py-3 font-black text-white backdrop-blur transition hover:bg-white/[0.1]" {...props}>
      <Icon className="h-5 w-5" /> {children}
    </motion.button>
  );
}
