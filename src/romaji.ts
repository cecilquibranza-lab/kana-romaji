export type SentencePart = { text: string; reading?: string };
export type Sentence = {
  id: string;
  japanese: string;
  parts: SentencePart[];
  romaji: string;
  romajiWords: string[];
  english: string;
  length: "short" | "medium" | "long";
  difficulty: string;
  grammar: string;
};

type JapaneseWordSegment = { segment: string; isWordLike?: boolean };
type JapaneseSegmenter = {
  segment(value: string): Iterable<JapaneseWordSegment>;
};
type JapaneseSegmenterConstructor = new (
  locales?: string | string[],
  options?: { granularity: "word" },
) => JapaneseSegmenter;
type WordToken = { text: string; start: number; end: number };
type PartSpan = SentencePart & { start: number; end: number };
type ReadingSegment = { text: string; romaji: string };

const JapaneseSegmenterClass = (
  Intl as typeof Intl & { Segmenter?: JapaneseSegmenterConstructor }
).Segmenter;
const japaneseWordSegmenter = JapaneseSegmenterClass
  ? new JapaneseSegmenterClass("ja", { granularity: "word" })
  : null;

const ROMAJI_MAP: Record<string, string> = {
  あ: "a", い: "i", う: "u", え: "e", お: "o",
  か: "ka", き: "ki", く: "ku", け: "ke", こ: "ko",
  さ: "sa", し: "shi", す: "su", せ: "se", そ: "so",
  た: "ta", ち: "chi", つ: "tsu", て: "te", と: "to",
  な: "na", に: "ni", ぬ: "nu", ね: "ne", の: "no",
  は: "ha", ひ: "hi", ふ: "fu", へ: "he", ほ: "ho",
  ま: "ma", み: "mi", む: "mu", め: "me", も: "mo",
  や: "ya", ゆ: "yu", よ: "yo", ら: "ra", り: "ri",
  る: "ru", れ: "re", ろ: "ro", わ: "wa", を: "o", ん: "n",
  が: "ga", ぎ: "gi", ぐ: "gu", げ: "ge", ご: "go",
  ざ: "za", じ: "ji", ず: "zu", ぜ: "ze", ぞ: "zo",
  だ: "da", ぢ: "ji", づ: "zu", で: "de", ど: "do",
  ば: "ba", び: "bi", ぶ: "bu", べ: "be", ぼ: "bo",
  ぱ: "pa", ぴ: "pi", ぷ: "pu", ぺ: "pe", ぽ: "po",
  ぁ: "a", ぃ: "i", ぅ: "u", ぇ: "e", ぉ: "o",
  ゔ: "vu", ゃ: "ya", ゅ: "yu", ょ: "yo",
};

const ROMAJI_COMBOS: Record<string, string> = {
  きゃ: "kya", きゅ: "kyu", きょ: "kyo", ぎゃ: "gya", ぎゅ: "gyu", ぎょ: "gyo",
  しゃ: "sha", しゅ: "shu", しょ: "sho", じゃ: "ja", じゅ: "ju", じょ: "jo",
  ちゃ: "cha", ちゅ: "chu", ちょ: "cho", にゃ: "nya", にゅ: "nyu", にょ: "nyo",
  ひゃ: "hya", ひゅ: "hyu", ひょ: "hyo", びゃ: "bya", びゅ: "byu", びょ: "byo",
  ぴゃ: "pya", ぴゅ: "pyu", ぴょ: "pyo", みゃ: "mya", みゅ: "myu", みょ: "myo",
  りゃ: "rya", りゅ: "ryu", りょ: "ryo", てぃ: "ti", でぃ: "di", ふぁ: "fa",
  ふぃ: "fi", ふぇ: "fe", ふぉ: "fo", うぃ: "wi", うぇ: "we", うぉ: "wo",
};

const KANJI_PATTERN = /[\p{Script=Han}々〆]/u;
const IRREGULAR_ROMAJI_PATTERN = /[^a-z0-9]/i;
const MASU_ENDINGS = new Set(["ます", "まし", "ました", "ません", "ませんでした", "ましょう"]);
// Native Japanese word boundaries remain authoritative; these only rejoin common inflection pieces.
const INFLECTIONAL_ENDINGS = new Set([
  "て", "んで", "た", "った", "って", "たら", "たか", "たり", "だり",
  "っ", "ん", "ない", "なかった",
]);
const QUESTION_WORDS = new Set(["何", "なに", "誰", "だれ", "どこ", "いつ", "どれ", "どちら"]);
const PARTICLE_TOKENS = new Set(["は", "が", "を", "に", "で", "と", "へ", "も", "の"]);

function toHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60),
  );
}

export function kanaToRomaji(value: string): string {
  const characters = Array.from(toHiragana(value));
  let result = "";

  for (let index = 0; index < characters.length; index += 1) {
    const pair = characters.slice(index, index + 2).join("");
    if (ROMAJI_COMBOS[pair]) {
      result += ROMAJI_COMBOS[pair];
      index += 1;
      continue;
    }

    const character = characters[index];
    if (character === "っ") {
      const nextPair = characters.slice(index + 1, index + 3).join("");
      const nextRomaji = ROMAJI_COMBOS[nextPair] ?? ROMAJI_MAP[characters[index + 1]] ?? "";
      result += nextRomaji.charAt(0);
    } else if (character === "ん") {
      const next = characters[index + 1] ?? "";
      result += /^[あいうえおやゆよぁぃぅぇぉゃゅょ]$/u.test(next) ? "n'" : "n";
    } else if (character === "ー") {
      result += result.at(-1) ?? "";
    } else {
      result += ROMAJI_MAP[character] ?? character;
    }
  }

  return result;
}

export function splitReadingIntoSegments(value: string): ReadingSegment[] {
  const characters = Array.from(toHiragana(value));
  const segments: ReadingSegment[] = [];

  for (let index = 0; index < characters.length; index += 1) {
    const pair = characters.slice(index, index + 2).join("");
    if (ROMAJI_COMBOS[pair]) {
      segments.push({ text: pair, romaji: ROMAJI_COMBOS[pair] });
      index += 1;
      continue;
    }

    const character = characters[index];
    if (character === "っ") {
      const nextPair = characters.slice(index + 1, index + 3).join("");
      const nextRomaji = ROMAJI_COMBOS[nextPair] ?? ROMAJI_MAP[characters[index + 1]] ?? "";
      segments.push({ text: character, romaji: nextRomaji.charAt(0) });
    } else if (character === "ー") {
      segments.push({ text: character, romaji: segments.at(-1)?.romaji.at(-1) ?? "" });
    } else {
      segments.push({ text: character, romaji: ROMAJI_MAP[character] ?? character });
    }
  }

  return segments;
}

export function normalizeAnswer(value: string): string {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]/gu, "");
}

export function parseFurigana(value: string): SentencePart[] {
  const parts: SentencePart[] = [];
  const pattern = /\{([^|{}]+)\|([^|{}]+)\}/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > cursor) parts.push({ text: value.slice(cursor, match.index) });
    parts.push({ text: match[1], reading: match[2] });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) parts.push({ text: value.slice(cursor) });

  return parts.length ? parts : [{ text: value }];
}

function resolveReading(parts: SentencePart[]): string | null {
  let reading = "";
  for (const part of parts) {
    const partReading = part.reading ?? part.text;
    if (KANJI_PATTERN.test(partReading)) return null;
    reading += partReading;
  }
  return reading;
}

function getWordTokens(surface: string): WordToken[] | null {
  if (!japaneseWordSegmenter) return null;

  const tokens: WordToken[] = [];
  let offset = 0;
  for (const segment of japaneseWordSegmenter.segment(surface)) {
    const start = offset;
    offset += segment.segment.length;
    if (segment.isWordLike) tokens.push({ text: segment.segment, start, end: offset });
  }

  return tokens.flatMap((token, index) => {
    const previous = tokens[index - 1];
    if (
      previous &&
      QUESTION_WORDS.has(previous.text) &&
      token.text.startsWith("に") &&
      token.text.length > 1 &&
      previous.end === token.start
    ) {
      return [
        { text: "に", start: token.start, end: token.start + 1 },
        { text: token.text.slice(1), start: token.start + 1, end: token.end },
      ];
    }
    return [token];
  });
}

function mergeWordTokens(tokens: WordToken[], partSpans: PartSpan[]): WordToken[] {
  const mergedAnnotations = tokens.reduce<WordToken[]>((groups, token) => {
    const previous = groups.at(-1);
    const joinsAnnotatedPart = previous !== undefined && partSpans.some(
      (part) => part.reading !== undefined &&
        previous.end > part.start && previous.end < part.end,
    );
    if (joinsAnnotatedPart && previous) {
      previous.text += token.text;
      previous.end = token.end;
    } else {
      groups.push({ ...token });
    }
    return groups;
  }, []);

  const result: WordToken[] = [];
  for (let index = 0; index < mergedAnnotations.length; index += 1) {
    const token = mergedAnnotations[index];
    const next = mergedAnnotations[index + 1];
    const contiguous = next !== undefined && token.end === next.start;

    if (contiguous && token.text === "し" && next.text === "ます") {
      result.push({ text: "します", start: token.start, end: next.end });
      index += 1;
      continue;
    }

    if (contiguous && token.text === "しま" && next.text === "した") {
      result.push({ text: "しました", start: token.start, end: next.end });
      index += 1;
      continue;
    }

    if (contiguous && token.text === "し" && ["ま", "まし"].includes(next.text)) {
      const ending = mergedAnnotations[index + 2];
      if (ending && next.end === ending.start &&
        ["す", "した", "せん", "ょう", "た"].includes(ending.text)) {
        result.push({
          text: token.text + next.text + ending.text,
          start: token.start,
          end: ending.end,
        });
        index += 2;
        continue;
      }
    }

    if (contiguous && ["ま", "まし"].includes(token.text) &&
      ["す", "した", "せん", "ょう", "た"].includes(next.text)) {
      const suffix = token.text + next.text;
      const previous = result.at(-1);
      if (previous && previous.end === token.start) {
        previous.text += suffix;
        previous.end = next.end;
      } else {
        result.push({ text: suffix, start: token.start, end: next.end });
      }
      index += 1;
      continue;
    }

    const previous = result.at(-1);
    if (
      previous &&
      previous.end === token.start &&
      !(token.text === "ない" && PARTICLE_TOKENS.has(previous.text)) &&
      (MASU_ENDINGS.has(token.text) || INFLECTIONAL_ENDINGS.has(token.text))
    ) {
      previous.text += token.text;
      previous.end = token.end;
      continue;
    }

    result.push({ ...token });
  }

  return result;
}

function wordReading(word: WordToken, parts: PartSpan[]): string | null {
  let reading = "";
  for (const part of parts) {
    const start = Math.max(word.start, part.start);
    const end = Math.min(word.end, part.end);
    if (start >= end) continue;

    if (part.reading !== undefined) {
      if (start !== part.start || end !== part.end) return null;
      reading += part.reading;
      continue;
    }

    const surface = part.text.slice(start - part.start, end - part.start);
    if (KANJI_PATTERN.test(surface)) return null;
    reading += surface;
  }
  return reading;
}

function lengthFor(reading: string): Sentence["length"] {
  const count = [...normalizeAnswer(kanaToRomaji(reading))].length;
  return count < 16 ? "short" : count < 34 ? "medium" : "long";
}

function normalizeReadingToRomaji(reading: string): string | null {
  if (KANJI_PATTERN.test(reading)) return null;
  const romaji = normalizeAnswer(kanaToRomaji(reading));
  return romaji && !IRREGULAR_ROMAJI_PATTERN.test(romaji) ? romaji : null;
}

export function createSentence(
  id: string,
  japanese: string,
  english: string,
  grammar: string,
  furigana = japanese,
  difficulty = "N5",
): Sentence | null {
  const parts = parseFurigana(furigana);
  const surface = parts.map((part) => part.text).join("");
  if (surface !== japanese) return null;

  const reading = resolveReading(parts);
  if (reading === null) return null;

  const partSpans: PartSpan[] = [];
  let offset = 0;
  for (const part of parts) {
    partSpans.push({ ...part, start: offset, end: offset + part.text.length });
    offset += part.text.length;
  }

  const tokens = getWordTokens(surface);
  const wordTokens = tokens
    ? mergeWordTokens(tokens, partSpans)
    : [{ text: surface, start: 0, end: surface.length }];
  const convertedWords = wordTokens.map((word) => {
    const wordReadingValue = wordReading(word, partSpans);
    if (!wordReadingValue) return null;
    const pronunciation = word.text === "は" ? "わ" : word.text === "へ" ? "え" : wordReadingValue;
    return normalizeReadingToRomaji(pronunciation);
  });

  const conversionFailed = !convertedWords.length || convertedWords.some((word) => word === null);
  const fallbackRomaji = conversionFailed ? normalizeReadingToRomaji(reading) : null;
  if (conversionFailed && !fallbackRomaji) return null;
  const romajiWords = fallbackRomaji
    ? [fallbackRomaji]
    : convertedWords.filter((word): word is string => word !== null);

  return {
    id,
    japanese,
    parts,
    romaji: romajiWords.join(""),
    romajiWords,
    english,
    length: lengthFor(reading),
    difficulty,
    grammar,
  };
}
