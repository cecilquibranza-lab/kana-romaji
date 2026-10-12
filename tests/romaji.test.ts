import assert from "node:assert/strict";
import test from "node:test";
import { createSentence, kanaToRomaji, normalizeAnswer } from "../src/romaji.ts";

function createTestSentence(japanese: string, furigana: string) {
  const sentence = createSentence("test", japanese, "", "test", furigana);
  assert.ok(sentence, `Expected a valid reading for: ${japanese}`);
  return sentence;
}

test("keeps Kyoto together and merges verb inflections", () => {
  const sentence = createTestSentence(
    "明日、京都へ行きます。",
    "{明日|あした}、{京|きょう}{都|と}へ{行|い}きます。",
  );

  assert.equal(sentence.romajiWords.join(" "), "ashita kyouto e ikimasu");
  assert.equal(sentence.romaji, "ashitakyoutoeikimasu");
});

test("separates particles and the suru verb from lexical words", () => {
  const sentence = createTestSentence(
    "私は日本語を勉強します。",
    "{私|わたし}は{日本語|にほんご}を{勉強|べんきょう}します。",
  );

  assert.equal(sentence.romajiWords.join(" "), "watashi wa nihongo o benkyou shimasu");
});

test("keeps interrogative particles and verbs in the correct words", () => {
  const sentence = createTestSentence(
    "飲み物は何にしますか。",
    "{飲み物|のみもの}は{何|なに}にしますか。",
  );

  assert.equal(sentence.romajiWords.join(" "), "nomimono wa nani ni shimasu ka");
});

test("does not merge a particle with the following adjective", () => {
  const sentence = createTestSentence(
    "今日はお金がない。",
    "{今日|きょう}は{お金|おかね}がない。",
  );

  assert.equal(sentence.romajiWords.join(" "), "kyou wa okane ga nai");
});

test("preserves small kana combinations and Japanese word boundaries", () => {
  const sentence = createTestSentence(
    "今日はいい天気です。",
    "{今日|きょう}はいい{天気|てんき}です。",
  );

  assert.equal(sentence.romajiWords.join(" "), "kyou wa ii tenki desu");
  assert.equal(kanaToRomaji("きょう"), "kyou");
  assert.equal(kanaToRomaji("ちっちゃい"), "chicchai");
  assert.equal(kanaToRomaji("しんよう"), "shin'you");
});

test("keeps the te-form together while spacing the auxiliary", () => {
  const sentence = createTestSentence(
    "東京に住んでいます。",
    "{東京|とうきょう}に{住|す}んでいます。",
  );

  assert.equal(sentence.romajiWords.join(" "), "toukyou ni sunde imasu");
});

test("merges past-tense verb suffixes", () => {
  const sentence = createTestSentence(
    "学校へ行きました。",
    "{学校|がっこう}へ{行|い}きました。",
  );

  assert.equal(sentence.romajiWords.join(" "), "gakkou e ikimashita");
});

test("rejects kanji when furigana is missing but accepts kana-only text", () => {
  assert.equal(createSentence("missing-reading", "京都へ行きます。", "", "test"), null);

  const kanaOnly = createSentence("kana-only", "きょう、ちっちゃい。", "", "test");
  assert.ok(kanaOnly);
  assert.equal(kanaOnly.romajiWords.join(" "), "kyou chicchai");
});

test("preserves katakana long-vowel spelling and ignores punctuation in answers", () => {
  const sentence = createTestSentence("スーパー！", "スーパー！");
  const spacedInput = normalizeAnswer("ashita kyouto e ikimasu");
  const unspacedInput = normalizeAnswer("ashitakyoutoeikimasu");

  assert.equal(sentence.romaji, "suupaa");
  assert.equal(spacedInput, unspacedInput);
  assert.equal(spacedInput, "ashitakyoutoeikimasu");
  assert.equal(normalizeAnswer("ashita, kyouto! e ikimasu。"), "ashitakyoutoeikimasu");
});
