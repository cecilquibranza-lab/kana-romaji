import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  createSentence,
  normalizeAnswer,
  splitReadingIntoSegments,
  type Sentence,
  type SentencePart,
} from "./romaji";

type ThemeName =
  | "sakura"
  | "night"
  | "forest"
  | "rain"
  | "sunset"
  | "ocean"
  | "minimal"
  | "space";
type Length = "short" | "medium" | "long" | "mixed";
type IconName =
  | "expand"
  | "settings"
  | "palette"
  | "arrow-left"
  | "check"
  | "clock"
  | "close"
  | "sparkle"
  | "volume";

type Settings = {
  timerEnabled: boolean;
  timerDuration: number;
  sentenceLength: Length;
  translationMode: "always" | "after";
  theme: ThemeName;
};

type OpenJlptRecord = {
  id?: unknown;
  level?: unknown;
  pattern?: unknown;
  examples?: unknown;
};

const themeInfo: { id: ThemeName; name: string; note: string }[] = [
  { id: "sakura", name: "Sakura", note: "Blossoms & spring air" },
  { id: "night", name: "Night", note: "Moonlit mountain village" },
  { id: "forest", name: "Forest", note: "Quiet green hills" },
  { id: "rain", name: "Rain", note: "Mist & gentle rainfall" },
  { id: "sunset", name: "Sunset", note: "Warm lavender dusk" },
  { id: "ocean", name: "Ocean", note: "Islands & open water" },
  { id: "minimal", name: "Minimal", note: "A calm, clear canvas" },
  { id: "space", name: "Space", note: "Stars & slow orbits" },
];

const defaultSettings: Settings = {
  timerEnabled: true,
  timerDuration: 60,
  sentenceLength: "mixed",
  translationMode: "always",
  theme: "sakura",
};

const soundEffects = {
  type: "/sfx/universfield-bubble-pop-02-293341.mp3",
  erase: "/sfx/universfield-bubble-pop-03-320977.mp3",
  correct: "/sfx/floraphonic-jug-pop-1-186886.mp3",
  incorrect: "/sfx/floraphonic-jug-pop-2-186887.mp3",
} as const;

function playSoundEffect(effect: keyof typeof soundEffects): void {
  const audio = new Audio(soundEffects[effect]);
  void audio.play().catch((error: unknown) => {
    console.warn(`Unable to play ${effect} sound effect:`, error);
  });
}

function createFallbackSentence(
  id: string,
  japanese: string,
  english: string,
  grammar: string,
  furigana: string,
): Sentence {
  const sentence = createSentence(id, japanese, english, grammar, furigana);
  if (!sentence) throw new Error(`Invalid fallback sentence reading: ${id}`);
  return sentence;
}

const fallbackSentences: Sentence[] = [
  createFallbackSentence("fallback-wa", "私は日本語を勉強します。", "I study Japanese.", "wa", "{私|わたし}は{日本語|にほんご}を{勉強|べんきょう}します。"),
  createFallbackSentence("fallback-neko", "猫が窓のそばで寝ています。", "The cat is sleeping by the window.", "ga-subject", "{猫|ねこ}が{窓|まど}のそばで{寝|ね}ています。"),
  createFallbackSentence("fallback-haru", "春が来ました。", "Spring has arrived.", "past-tense", "{春|はる}が{来|き}ました。"),
];

function shuffleSentences(items: Sentence[]): Sentence[] {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }
  return shuffled;
}

function validateRecord(record: OpenJlptRecord): { sentences: Sentence[]; skippedWithoutReading: number } {
  if (typeof record.id !== "string" || typeof record.level !== "string" || !Array.isArray(record.examples)) {
    return { sentences: [], skippedWithoutReading: 0 };
  }

  let skippedWithoutReading = 0;
  const sentences = record.examples.flatMap((example, index) => {
    if (!example || typeof example !== "object") return [];
    const item = example as { ja?: unknown; furigana?: unknown; en?: unknown };
    if (typeof item.ja !== "string" || typeof item.en !== "string" || !item.ja.trim() || !item.en.trim()) return [];
    const furigana = typeof item.furigana === "string" ? item.furigana : item.ja;
    const sentence = createSentence(`${record.id}-${index}`, item.ja, item.en, record.id, furigana, record.level);
    if (!sentence) {
      skippedWithoutReading += 1;
      return [];
    }
    return [sentence];
  });

  return { sentences, skippedWithoutReading };
}

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" /><path d="m3 8 5-5m8 0 5 5M3 16l5 5m8 0 5-5" /></>,
    settings: <><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" /></>,
    palette: <><path d="M12 3a9 9 0 0 0 0 18h1.5a1.7 1.7 0 0 0 1.2-2.9 1.7 1.7 0 0 1 1.2-2.9H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Z" /><circle cx="7.5" cy="11.5" r=".7" fill="currentColor" /><circle cx="9.5" cy="7.5" r=".7" fill="currentColor" /><circle cx="14" cy="6.8" r=".7" fill="currentColor" /><circle cx="17" cy="10" r=".7" fill="currentColor" /></>,
    "arrow-left": <path d="m15 18-6-6 6-6" />, check: <path d="m5 12 4 4L19 6" />, clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, close: <path d="M6 6l12 12M18 6 6 18" />, sparkle: <><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3Z" /><path d="m18.5 15 .7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7.7-2.1Z" /></>,
    volume: <><path d="M11 5 6.5 9H3v6h3.5L11 19V5Z" /><path d="M15.5 9.5a4 4 0 0 1 0 5M18 7a7.5 7.5 0 0 1 0 10" /></>,
  };
  return <svg aria-hidden="true" className="icon" fill="none" height={size} viewBox="0 0 24 24" width={size}><g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.7">{paths[name]}</g></svg>;
}

function Scene({ theme }: { theme: ThemeName }) {
  return <div aria-hidden="true" className={`scene scene-${theme}`}><div className="sky-glow" /><div className="celestial" /><div className="cloud cloud-one" /><div className="cloud cloud-two" /><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="mountain mountain-back" /><div className="mountain mountain-mid" /><div className="mountain mountain-front" /><div className="branch branch-left" /><div className="branch branch-right" /><div className="particles">{Array.from({ length: 18 }, (_, index) => <i className="particle" key={index} style={{ "--i": index } as React.CSSProperties} />)}</div></div>;
}

function JapaneseSentence({ sentence, typed }: { sentence: Sentence; typed: string }) {
  const normalizedTyped = normalizeAnswer(typed);
  const normalizedExpected = normalizeAnswer(sentence.romaji);
  let romajiPosition = 0;

  const isComplete = (end: number) =>
    normalizedTyped.length >= end &&
    normalizedTyped.slice(0, end) === normalizedExpected.slice(0, end);

  return (
    <div className="japanese" lang="ja">
      {sentence.parts.map((part, index) => {
        const segments = splitReadingIntoSegments(part.reading ?? part.text).map((segment) => {
          const particleRomaji = part.text === "は" ? "wa" : part.text === "へ" ? "e" : null;
          const romaji = particleRomaji ?? segment.romaji;
          romajiPosition += normalizeAnswer(romaji).length;
          return { ...segment, complete: isComplete(romajiPosition) };
        });
        const complete = segments.length > 0 && segments.every((segment) => segment.complete);

        if (part.reading) {
          return (
            <ruby key={`${part.text}-${index}`}>
              <span className={complete ? "kana-complete" : ""}>{part.text}</span>
              <rt>
                {segments.map((segment, segmentIndex) => (
                  <span className={segment.complete ? "kana-complete" : ""} key={`${segment.text}-${segmentIndex}`}>
                    {segment.text}
                  </span>
                ))}
              </rt>
            </ruby>
          );
        }

        return segments.map((segment, segmentIndex) => (
          <span className={segment.complete ? "kana-complete" : ""} key={`${segment.text}-${index}-${segmentIndex}`}>
            {segment.text}
          </span>
        ));
      })}
    </div>
  );
}

function RomajiSlots({ words, typed }: { words: string[]; typed: string }) {
  const normalizedTyped = normalizeAnswer(typed);
  let position = 0;

  return (
    <div aria-label="Romaji answer slots" className="romaji-slots" role="status">
      {words.map((word, wordIndex) => (
        <span className="romaji-word" key={`${word}-${wordIndex}`}>
          {word.split("").map((character) => {
            const index = position;
            position += 1;
            return (
              <span
                className={`romaji-slot ${index < normalizedTyped.length ? "filled" : ""} ${
                  normalizedTyped[index] && normalizedTyped[index] !== character ? "wrong" : ""
                }`}
                key={`${character}-${index}`}
              >
                {normalizedTyped[index] ?? "_"}
              </span>
            );
          })}
        </span>
      ))}
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return <button aria-label={`${label}: ${checked ? "on" : "off"}`} className={`toggle ${checked ? "active" : ""}`} onClick={onChange} type="button"><span /></button>;
}

function App() {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      return { ...defaultSettings, ...JSON.parse(localStorage.getItem("kanatype-settings") ?? "{}") } as Settings;
    } catch {
      return defaultSettings;
    }
  });
  const [sentences, setSentences] = useState<Sentence[]>(fallbackSentences);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [mistakes, setMistakes] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [isExpired, setIsExpired] = useState(false);
  const canSpeak = typeof window !== "undefined" && "speechSynthesis" in window;
  const filteredSentences = useMemo(() => {
    if (settings.sentenceLength === "mixed") return sentences;
    return sentences.filter((item) => item.length === settings.sentenceLength);
  }, [sentences, settings.sentenceLength]);
  const availableSentences = filteredSentences.length ? filteredSentences : sentences;
  const sentence = availableSentences[sentenceIndex % Math.max(availableSentences.length, 1)];
  const expected = sentence.romaji;
  const normalizedTyped = normalizeAnswer(typed);
  const normalizedExpected = normalizeAnswer(expected);
  const isCorrect = normalizedTyped === normalizedExpected;
  const progress = Math.min(100, (normalizedTyped.length / Math.max(normalizedExpected.length, 1)) * 100);
  const wpm = elapsed > 0 ? Math.round((correctCount * 5) / (elapsed / 60)) : 0;
  const accuracy = correctCount + mistakes > 0 ? Math.round((correctCount / (correctCount + mistakes)) * 100) : 100;
  const secondsLeft = Math.max(0, settings.timerDuration - elapsed);

  useEffect(() => {
    Promise.all(["n5", "n4", "n3", "n2", "n1"].map(async (level) => {
      const response = await fetch(`/data/openjlpt-${level}.json`);
      if (!response.ok) throw new Error(`${level.toUpperCase()} dataset unavailable`);
      return response.json() as Promise<OpenJlptRecord[]>;
    }))
      .then((datasets) => {
        const validated = datasets.flatMap((records) => records.map(validateRecord));
        const loaded = validated.flatMap((result) => result.sentences);
        const skipped = validated.reduce((count, result) => count + result.skippedWithoutReading, 0);
        if (skipped > 0) {
          console.warn(`Skipped ${skipped} OpenJLPT examples without a reliable kana reading.`);
        }
        if (loaded.length) setSentences(shuffleSentences(loaded));
      })
      .catch((error: unknown) => {
        console.error("Failed to load OpenJLPT datasets:", error);
      });
  }, []);

  useEffect(() => {
    localStorage.setItem("kanatype-settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (!settings.timerEnabled || isExpired) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [settings.timerEnabled, isExpired]);

  useEffect(() => {
    if (settings.timerEnabled && elapsed >= settings.timerDuration) setIsExpired(true);
  }, [elapsed, settings.timerDuration, settings.timerEnabled]);

  const nextSentence = useCallback(() => {
    setSentenceIndex((value) => (value + 1) % Math.max(availableSentences.length, 1));
    setTyped("");
    setCorrectCount((value) => value + 1);
    setIsExpired(false);
  }, [availableSentences.length]);

  const handleTypedValue = (value: string) => {
    setTyped(value);
    if (normalizeAnswer(value).length > 0 && !normalizedExpected.startsWith(normalizeAnswer(value))) {
      setMistakes((count) => count + 1);
      setIsShaking(true);
      window.setTimeout(() => setIsShaking(false), 260);
    }
  };

  const handleKeyDown = (event: globalThis.KeyboardEvent) => {
    if (isExpired || isSettingsOpen) return;
    if (
      event.target instanceof HTMLElement &&
      event.target.closest("button, input, textarea, select, [contenteditable='true']")
    ) {
      return;
    }
    if (event.key === "1") {
      event.preventDefault();
      playSentenceAudio();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      playSoundEffect(isCorrect ? "correct" : "incorrect");
      if (isCorrect) nextSentence();
      else {
        setMistakes((count) => count + 1);
        setIsShaking(true);
        window.setTimeout(() => setIsShaking(false), 260);
      }
    }
    if (event.key === "Backspace" && event.ctrlKey) {
      event.preventDefault();
      playSoundEffect("erase");
      setTyped("");
      return;
    }
    if (event.key === "Backspace") {
      event.preventDefault();
      playSoundEffect("erase");
      setTyped((value) => value.slice(0, -1));
      return;
    }
    if (/^[a-zA-Z]$/.test(event.key)) {
      event.preventDefault();
      playSoundEffect("type");
      handleTypedValue(`${typed}${event.key.toLowerCase()}`);
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const updateSetting = <K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    if (key === "timerDuration") {
      setElapsed(0);
      setIsExpired(false);
    }
  };

  const playSentenceAudio = useCallback(() => {
    if (!canSpeak) return;
    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(sentence.japanese);
    utterance.lang = "ja-JP";
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;
    synth.speak(utterance);
  }, [canSpeak, sentence.japanese]);

  useEffect(() => {
    return () => {
      if (canSpeak) {
        window.speechSynthesis.cancel();
      }
    };
  }, [canSpeak]);

  return (
    <div className={`app theme-${settings.theme} ${isFocusMode ? "focus-mode" : ""}`}>
      <Scene theme={settings.theme} />
      <div className="ambient-overlay" />
      <main className="app-shell">
        {!isFocusMode && <header className="topbar">
          <div className="brand"><span className="brand-mark">か</span><div><strong>KanaType</strong><span>Japanese reading practice</span></div></div>
          <div className="top-actions"><button className="icon-button" aria-label="Toggle focus mode" onClick={() => setIsFocusMode(true)} type="button"><Icon name="expand" /></button><button className="icon-button" aria-label="Open settings" onClick={() => setIsSettingsOpen(true)} type="button"><Icon name="settings" /></button></div>
        </header>}
        {isFocusMode && <button className="exit-focus focus-exit" onClick={() => setIsFocusMode(false)} type="button"><Icon name="close" /> Exit focus</button>}

        <section className="practice-layout">
          {!isFocusMode && <aside className="intro-panel"><p className="eyebrow">READ. TYPE. REMEMBER.</p><h1>Find your rhythm<br /><em>in Japanese.</em></h1><p className="intro-copy">Read the sentence, then type its romaji. Build speed one calm phrase at a time.</p><div className="tip-card"><Icon name="sparkle" /><span><strong>Quick tip</strong><br />Press <kbd>Enter</kbd> when your answer is ready.</span></div></aside>}
          <section className="practice-card">
            <div className="card-header"><div><span className="label">CURRENT PHRASE</span><span className="grammar-tag">{sentence.difficulty} · {sentence.grammar}</span></div><div className="card-header-actions"><button aria-label="Hear this sentence aloud (1)" className="sound-key-button" onClick={playSentenceAudio} title="Hear this sentence aloud (1)" type="button"><Icon name="volume" size={14} /><span>1</span></button><span className="phrase-count">{sentenceIndex + 1} <i>/ {availableSentences.length}</i></span></div></div>
            <div className={`phrase-stage ${isShaking ? "shake" : ""}`}><JapaneseSentence sentence={sentence} typed={typed} /><p className={`translation ${settings.translationMode === "after" && !isCorrect ? "hidden-translation" : ""}`}>{sentence.english}</p></div>
            <div className="typing-section"><div className="typing-header"><span>TYPE THE ROMAJI</span><span>{normalizedTyped.length} / {normalizedExpected.length}</span></div><div className="answer-row"><RomajiSlots words={sentence.romajiWords} typed={typed} /><span className="enter-hint">Enter ↵</span></div><div className="answer-progress"><span style={{ width: `${progress}%` }} /></div></div>
            {isExpired && <div className="expired-message"><strong>Time is up.</strong> The answer was <code>{expected}</code><button onClick={() => { setElapsed(0); setIsExpired(false); setTyped(""); }} type="button">Try again</button></div>}
            <div className="card-footer"><div className="source-note">OpenJLPT · {sentence.grammar}</div><div className="progress-dots">{Array.from({ length: Math.min(5, availableSentences.length) }, (_, index) => <span className={index === sentenceIndex % 5 ? "active" : ""} key={index} />)}</div><button className="next-button" disabled={!isCorrect || isExpired} onClick={nextSentence} type="button">Next phrase <Icon name="arrow-left" /></button></div>
          </section>
        </section>

        {!isFocusMode && <footer className="stats-bar"><div className="stat"><span>WPM</span><strong>{wpm}</strong></div><div className="stat"><span>ACCURACY</span><strong>{accuracy}<small>%</small></strong></div><div className="stat"><span>MISTAKES</span><strong>{mistakes}</strong></div><div className="timer-stat"><Icon name="clock" /><span>{settings.timerEnabled ? `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` : "Timer off"}</span></div></footer>}
      </main>

      {isSettingsOpen && <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}><section aria-label="Settings" className="settings-panel" onClick={(event) => event.stopPropagation()}><div className="settings-heading"><div><span className="eyebrow">PERSONALIZE</span><h2>Practice settings</h2></div><button className="icon-button" aria-label="Close settings" onClick={() => setIsSettingsOpen(false)} type="button"><Icon name="close" /></button></div><div className="setting-row"><div><strong>Timer</strong><span>Challenge yourself against the clock</span></div><Toggle checked={settings.timerEnabled} label="Timer" onChange={() => updateSetting("timerEnabled", !settings.timerEnabled)} /></div>{settings.timerEnabled && <label className="setting-control"><span>Duration</span><select onChange={(event) => updateSetting("timerDuration", Number(event.target.value))} value={settings.timerDuration}><option value={30}>30 seconds</option><option value={60}>60 seconds</option><option value={120}>2 minutes</option></select></label>}<label className="setting-control"><span>Sentence length</span><select onChange={(event) => updateSetting("sentenceLength", event.target.value as Length)} value={settings.sentenceLength}><option value="mixed">Mixed</option><option value="short">Short</option><option value="medium">Medium</option><option value="long">Long</option></select></label><label className="setting-control"><span>English translation</span><select onChange={(event) => updateSetting("translationMode", event.target.value as Settings["translationMode"])} value={settings.translationMode}><option value="always">Always visible</option><option value="after">Reveal after correct answer</option></select></label><div className="theme-heading"><Icon name="palette" /><strong>Atmosphere</strong></div><div className="theme-grid">{themeInfo.map((theme) => <button className={`theme-option ${settings.theme === theme.id ? "selected" : ""}`} key={theme.id} onClick={() => updateSetting("theme", theme.id)} type="button"><span className={`theme-swatch swatch-${theme.id}`} /><span><strong>{theme.name}</strong><small>{theme.note}</small></span></button>)}</div></section></div>}
    </div>
  );
}

export default App;
