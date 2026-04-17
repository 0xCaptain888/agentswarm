// Specialist Agent Services
// Each agent exposes an x402-protected API endpoint

import express from "express";
import { createGatewayMiddleware } from "@circle-fin/x402-batching/server";
import { GatewayClient } from "@circle-fin/x402-batching/client";
import { privateKeyToAccount } from "viem/accounts";
import { CONFIG } from "./config.js";
import { tracker } from "./tracker.js";

// ============================================================
// Simple AI simulation functions (no external API keys needed)
// In production, these would call real AI models
// ============================================================

function simulateTranslation(text: string, targetLang: string): string {
  // Word-level dictionary translation with common vocabulary per language.
  // Falls back to the original word when no mapping exists, which mirrors
  // how real statistical MT handles out-of-vocabulary tokens.

  const dictionaries: Record<string, Record<string, string>> = {
    es: {
      the: "el", a: "un", an: "un", is: "es", are: "son", was: "fue", were: "eran",
      i: "yo", you: "tú", he: "él", she: "ella", we: "nosotros", they: "ellos",
      my: "mi", your: "tu", his: "su", her: "su", our: "nuestro", their: "su",
      and: "y", or: "o", but: "pero", not: "no", of: "de", in: "en", to: "a",
      for: "para", with: "con", from: "de", at: "en", on: "en", by: "por",
      this: "esto", that: "eso", it: "ello", all: "todo", some: "algunos",
      good: "bueno", bad: "malo", big: "grande", small: "pequeño", new: "nuevo",
      old: "viejo", first: "primero", last: "último", long: "largo", great: "gran",
      have: "tener", do: "hacer", say: "decir", go: "ir", get: "obtener",
      make: "hacer", know: "saber", think: "pensar", take: "tomar", see: "ver",
      come: "venir", want: "querer", look: "mirar", use: "usar", find: "encontrar",
      give: "dar", tell: "decir", work: "trabajar", call: "llamar", try: "intentar",
      need: "necesitar", feel: "sentir", become: "convertirse", leave: "dejar",
      time: "tiempo", year: "año", people: "personas", way: "camino", day: "día",
      man: "hombre", woman: "mujer", child: "niño", world: "mundo", life: "vida",
      hand: "mano", part: "parte", place: "lugar", case: "caso", week: "semana",
      company: "empresa", system: "sistema", program: "programa", question: "pregunta",
      government: "gobierno", number: "número", night: "noche",
      point: "punto", home: "hogar", water: "agua", room: "habitación", mother: "madre",
      area: "área", money: "dinero", story: "historia", fact: "hecho", month: "mes",
      lot: "mucho", right: "derecho", study: "estudio", book: "libro", eye: "ojo",
      job: "empleo", word: "palabra", business: "negocio", issue: "asunto",
      side: "lado", kind: "tipo", head: "cabeza", house: "casa", service: "servicio",
      friend: "amigo", father: "padre", power: "poder", hour: "hora", game: "juego",
      line: "línea", end: "fin", members: "miembros", family: "familia", car: "coche",
      city: "ciudad", community: "comunidad", name: "nombre", president: "presidente",
      team: "equipo", minute: "minuto", idea: "idea", body: "cuerpo", back: "espalda",
      hello: "hola", goodbye: "adiós", please: "por favor", thanks: "gracias",
      yes: "sí", no: "no", today: "hoy", tomorrow: "mañana", yesterday: "ayer",
      love: "amor", happy: "feliz", sad: "triste", beautiful: "hermoso", food: "comida",
    },
    fr: {
      the: "le", a: "un", an: "un", is: "est", are: "sont", was: "était", were: "étaient",
      i: "je", you: "vous", he: "il", she: "elle", we: "nous", they: "ils",
      my: "mon", your: "votre", his: "son", her: "sa", our: "notre", their: "leur",
      and: "et", or: "ou", but: "mais", not: "ne pas", of: "de", in: "dans", to: "à",
      for: "pour", with: "avec", from: "de", at: "à", on: "sur", by: "par",
      this: "ceci", that: "cela", it: "il", all: "tout", some: "quelques",
      good: "bon", bad: "mauvais", big: "grand", small: "petit", new: "nouveau",
      old: "vieux", first: "premier", last: "dernier", long: "long", great: "grand",
      have: "avoir", do: "faire", say: "dire", go: "aller", get: "obtenir",
      make: "faire", know: "savoir", think: "penser", take: "prendre", see: "voir",
      come: "venir", want: "vouloir", look: "regarder", use: "utiliser", find: "trouver",
      give: "donner", tell: "raconter", work: "travailler", call: "appeler", try: "essayer",
      time: "temps", year: "année", people: "gens", way: "chemin", day: "jour",
      man: "homme", woman: "femme", child: "enfant", world: "monde", life: "vie",
      hand: "main", part: "partie", place: "lieu", house: "maison", water: "eau",
      hello: "bonjour", goodbye: "au revoir", please: "s'il vous plaît", thanks: "merci",
      yes: "oui", no: "non", today: "aujourd'hui", tomorrow: "demain",
      love: "amour", happy: "heureux", sad: "triste", beautiful: "beau", food: "nourriture",
      name: "nom", city: "ville", friend: "ami", family: "famille", book: "livre",
      night: "nuit", mother: "mère", father: "père", money: "argent", idea: "idée",
    },
    de: {
      the: "der", a: "ein", an: "ein", is: "ist", are: "sind", was: "war", were: "waren",
      i: "ich", you: "du", he: "er", she: "sie", we: "wir", they: "sie",
      my: "mein", your: "dein", his: "sein", her: "ihr", our: "unser", their: "ihr",
      and: "und", or: "oder", but: "aber", not: "nicht", of: "von", in: "in", to: "zu",
      for: "für", with: "mit", from: "von", at: "bei", on: "auf", by: "von",
      this: "dies", that: "das", it: "es", all: "alle", some: "einige",
      good: "gut", bad: "schlecht", big: "groß", small: "klein", new: "neu",
      old: "alt", first: "erste", last: "letzte", long: "lang", great: "großartig",
      have: "haben", do: "tun", say: "sagen", go: "gehen", get: "bekommen",
      make: "machen", know: "wissen", think: "denken", take: "nehmen", see: "sehen",
      come: "kommen", want: "wollen", look: "schauen", use: "benutzen", find: "finden",
      time: "Zeit", year: "Jahr", people: "Leute", way: "Weg", day: "Tag",
      man: "Mann", woman: "Frau", child: "Kind", world: "Welt", life: "Leben",
      hello: "hallo", goodbye: "auf Wiedersehen", please: "bitte", thanks: "danke",
      yes: "ja", no: "nein", today: "heute", tomorrow: "morgen",
      love: "Liebe", happy: "glücklich", sad: "traurig", beautiful: "schön", food: "Essen",
      name: "Name", city: "Stadt", friend: "Freund", family: "Familie", book: "Buch",
      house: "Haus", water: "Wasser", night: "Nacht", mother: "Mutter", father: "Vater",
    },
    zh: {
      hello: "你好", goodbye: "再见", thanks: "谢谢", yes: "是", no: "不",
      i: "我", you: "你", he: "他", she: "她", we: "我们", they: "他们",
      the: "", a: "一个", is: "是", are: "是", good: "好", bad: "坏",
      big: "大", small: "小", new: "新", old: "旧", love: "爱", happy: "快乐",
      sad: "悲伤", beautiful: "美丽", food: "食物", water: "水", time: "时间",
      day: "天", night: "夜", man: "男人", woman: "女人", child: "孩子",
      world: "世界", life: "生活", have: "有", do: "做", go: "去",
      come: "来", see: "看", know: "知道", think: "想", want: "想要",
      make: "做", give: "给", take: "拿", say: "说", name: "名字",
      people: "人们", year: "年", city: "城市", home: "家", work: "工作",
      friend: "朋友", family: "家庭", book: "书", money: "钱", today: "今天",
      tomorrow: "明天", and: "和", or: "或", but: "但是", not: "不",
    },
    ja: {
      hello: "こんにちは", goodbye: "さようなら", thanks: "ありがとう", yes: "はい", no: "いいえ",
      i: "私", you: "あなた", he: "彼", she: "彼女", we: "私たち", they: "彼ら",
      the: "", a: "", is: "です", are: "です", good: "良い", bad: "悪い",
      big: "大きい", small: "小さい", new: "新しい", old: "古い", love: "愛",
      happy: "幸せ", sad: "悲しい", beautiful: "美しい", food: "食べ物", water: "水",
      time: "時間", day: "日", night: "夜", man: "男", woman: "女", child: "子供",
      world: "世界", life: "人生", have: "持つ", do: "する", go: "行く",
      come: "来る", see: "見る", know: "知る", think: "考える", want: "欲しい",
      make: "作る", give: "あげる", take: "取る", say: "言う", name: "名前",
      people: "人々", year: "年", city: "都市", home: "家", work: "仕事",
      friend: "友達", family: "家族", book: "本", money: "お金", today: "今日",
      tomorrow: "明日", and: "と", or: "または", but: "しかし", not: "ない",
    },
  };

  const dict = dictionaries[targetLang] || dictionaries["es"]!;
  const langLabels: Record<string, string> = {
    es: "Spanish", fr: "French", de: "German", zh: "Chinese", ja: "Japanese",
  };

  // Tokenize preserving punctuation, translate each token via dictionary lookup
  const tokens = text.match(/[\w'-]+|[^\w\s]+|\s+/g) || [];
  const translated = tokens.map((token) => {
    if (/^\s+$/.test(token) || /^[^\w\s]+$/.test(token)) return token;
    const lower = token.toLowerCase();
    const mapped = dict[lower];
    if (mapped !== undefined) {
      // Preserve original capitalization pattern
      if (mapped === "") return "";
      if (token[0] === token[0]!.toUpperCase() && token[0] !== token[0]!.toLowerCase()) {
        return mapped[0]!.toUpperCase() + mapped.slice(1);
      }
      return mapped;
    }
    // OOV: keep original (proper nouns, technical terms pass through)
    return token;
  }).filter((t) => t !== "");

  const label = langLabels[targetLang] || targetLang.toUpperCase();
  return `[${label}] ${translated.join("")}`;
}

function simulateSummarization(text: string): string {
  // Extractive summarization using TF-based sentence scoring.
  // Split text into sentences, score each by term frequency, return the
  // highest-scoring sentences in their original order.

  const words = text.split(/\s+/);
  if (words.length <= 15) return text;

  // 1. Split into sentences (handle ., !, ? and newline boundaries)
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length <= 2) return text;

  // 2. Build term frequency map (excluding stop words)
  const stopWords = new Set([
    "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "shall", "can", "need", "dare", "ought",
    "i", "you", "he", "she", "it", "we", "they", "me", "him", "her", "us",
    "them", "my", "your", "his", "its", "our", "their", "mine", "yours",
    "this", "that", "these", "those", "who", "whom", "which", "what",
    "and", "but", "or", "nor", "for", "yet", "so", "if", "then", "else",
    "when", "where", "why", "how", "all", "each", "every", "both", "few",
    "more", "most", "other", "some", "such", "no", "not", "only", "own",
    "same", "than", "too", "very", "just", "because", "as", "until",
    "while", "of", "at", "by", "about", "between", "through", "during",
    "before", "after", "above", "below", "to", "from", "up", "down",
    "in", "out", "on", "off", "over", "under", "again", "further",
    "also", "with", "into", "there", "here", "s", "t", "re", "ve", "d",
  ]);

  const tf: Record<string, number> = {};
  const allWords = text.toLowerCase().match(/[a-z']+/g) || [];
  for (const w of allWords) {
    if (!stopWords.has(w) && w.length > 2) {
      tf[w] = (tf[w] || 0) + 1;
    }
  }

  // 3. Score each sentence by sum of term frequencies of its content words
  const scored = sentences.map((sentence, index) => {
    const sentenceWords = sentence.toLowerCase().match(/[a-z']+/g) || [];
    const contentWords = sentenceWords.filter((w) => !stopWords.has(w) && w.length > 2);
    // Normalize by sentence length to avoid bias toward long sentences
    const rawScore = contentWords.reduce((sum, w) => sum + (tf[w] || 0), 0);
    const lengthNorm = Math.max(contentWords.length, 1);
    return { sentence, index, score: rawScore / lengthNorm };
  });

  // 4. Select top N sentences (2 for short texts, 3 for longer)
  const topN = sentences.length <= 5 ? 2 : 3;
  const topSentences = scored
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, topN)
    .sort((a, b) => a.index - b.index) // restore original order
    .map((s) => s.sentence);

  const compressionRatio = Math.round((1 - topSentences.join(" ").split(/\s+/).length / words.length) * 100);
  return `${topSentences.join(" ")} (${compressionRatio}% compression, ${words.length} words → ${topSentences.join(" ").split(/\s+/).length})`;
}

function simulateSentiment(text: string): {
  sentiment: string;
  score: number;
  confidence: number;
} {
  // Lexicon-based sentiment analysis with intensity modifiers and negation handling.
  // Uses a curated opinion lexicon inspired by Hu & Liu (2004).

  const positiveLexicon: Record<string, number> = {
    good: 0.6, great: 0.8, excellent: 0.9, amazing: 0.9, wonderful: 0.85,
    fantastic: 0.9, outstanding: 0.95, superb: 0.9, brilliant: 0.85, love: 0.8,
    happy: 0.7, pleased: 0.65, delighted: 0.8, glad: 0.6, joyful: 0.8,
    enjoy: 0.65, enjoyed: 0.65, enjoying: 0.65, perfect: 0.95, best: 0.85,
    beautiful: 0.75, impressive: 0.8, incredible: 0.85, marvelous: 0.85,
    pleasant: 0.6, lovely: 0.7, terrific: 0.85, awesome: 0.85, like: 0.4,
    recommend: 0.7, recommended: 0.7, satisfied: 0.65, exceptional: 0.9,
    remarkable: 0.8, splendid: 0.8, magnificent: 0.9, elegant: 0.7,
    charming: 0.65, favorable: 0.6, positive: 0.55, success: 0.7,
    successful: 0.7, win: 0.65, winning: 0.65, won: 0.65, thrive: 0.7,
    exciting: 0.75, excited: 0.75, enthusiasm: 0.7, enthusiastic: 0.75,
    praise: 0.7, admire: 0.7, appreciate: 0.65, grateful: 0.7,
    fortunate: 0.6, blessed: 0.65, inspire: 0.7, inspired: 0.7,
    triumph: 0.8, achieve: 0.65, achievement: 0.7, innovative: 0.65,
    efficient: 0.6, effective: 0.6, smooth: 0.5, clean: 0.45,
    bright: 0.55, fun: 0.6, helpful: 0.6, reliable: 0.6, robust: 0.55,
  };

  const negativeLexicon: Record<string, number> = {
    bad: -0.6, terrible: -0.85, awful: -0.85, horrible: -0.9, worst: -0.9,
    hate: -0.85, hated: -0.85, poor: -0.6, disappointing: -0.7,
    disappointed: -0.7, sad: -0.65, angry: -0.7, upset: -0.6, annoyed: -0.6,
    annoying: -0.65, frustrating: -0.7, frustrated: -0.7, boring: -0.55,
    bored: -0.5, ugly: -0.65, dreadful: -0.8, pathetic: -0.75,
    unpleasant: -0.6, miserable: -0.8, inferior: -0.65, mediocre: -0.5,
    disgusting: -0.85, repulsive: -0.85, horrendous: -0.9, atrocious: -0.9,
    abysmal: -0.9, useless: -0.7, worthless: -0.8, fail: -0.7, failed: -0.7,
    failure: -0.75, broken: -0.6, damage: -0.6, damaged: -0.65, harmful: -0.7,
    dangerous: -0.65, disaster: -0.8, disastrous: -0.85, tragic: -0.8,
    tragedy: -0.8, painful: -0.7, pain: -0.55, suffering: -0.75,
    problem: -0.45, problems: -0.5, issue: -0.35, issues: -0.4,
    concern: -0.35, concerning: -0.45, trouble: -0.5, troubled: -0.55,
    unacceptable: -0.75, inadequate: -0.6, flawed: -0.55, defective: -0.65,
    waste: -0.6, wasted: -0.6, slow: -0.4, sluggish: -0.5, clumsy: -0.5,
    confusing: -0.5, confused: -0.45, difficult: -0.35, impossible: -0.6,
    regret: -0.65, ruin: -0.7, ruined: -0.75, destroy: -0.7, destroyed: -0.75,
  };

  // Intensity modifiers (multipliers applied to the next sentiment word)
  const intensifiers: Record<string, number> = {
    very: 1.3, really: 1.25, extremely: 1.5, incredibly: 1.45,
    absolutely: 1.4, totally: 1.35, completely: 1.35, utterly: 1.4,
    highly: 1.3, deeply: 1.25, thoroughly: 1.25, remarkably: 1.3,
    so: 1.2, quite: 1.1, rather: 1.05, pretty: 1.1, somewhat: 0.8,
    slightly: 0.6, barely: 0.4, hardly: 0.4, a_little: 0.6,
  };

  const negators = new Set([
    "not", "no", "never", "neither", "nobody", "nothing",
    "nowhere", "nor", "cannot", "can't", "won't", "don't",
    "doesn't", "didn't", "isn't", "aren't", "wasn't", "weren't",
    "wouldn't", "shouldn't", "couldn't", "hasn't", "haven't", "hadn't",
  ]);

  // Tokenize
  const tokens = text.toLowerCase().match(/[a-z']+/g) || [];
  let totalScore = 0;
  let matchCount = 0;
  let negateNext = false;
  let currentIntensity = 1.0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i]!;

    // Check for negation
    if (negators.has(token)) {
      negateNext = true;
      continue;
    }

    // Check for intensity modifier
    if (intensifiers[token] !== undefined) {
      currentIntensity = intensifiers[token]!;
      continue;
    }

    // Check positive lexicon
    if (positiveLexicon[token] !== undefined) {
      let val = positiveLexicon[token]! * currentIntensity;
      if (negateNext) val *= -0.75; // negation flips and slightly dampens
      totalScore += val;
      matchCount++;
      negateNext = false;
      currentIntensity = 1.0;
      continue;
    }

    // Check negative lexicon
    if (negativeLexicon[token] !== undefined) {
      let val = negativeLexicon[token]! * currentIntensity;
      if (negateNext) val *= -0.75; // negation flips
      totalScore += val;
      matchCount++;
      negateNext = false;
      currentIntensity = 1.0;
      continue;
    }

    // Non-sentiment word resets modifiers after a gap
    if (negateNext && i > 0) {
      // Allow negation to carry over at most 2 tokens
      const prevIdx = i - 1;
      const prevToken = tokens[prevIdx];
      if (prevToken && !negators.has(prevToken) && !intensifiers[prevToken]) {
        negateNext = false;
      }
    }
    currentIntensity = 1.0; // reset intensity if not followed by sentiment word
  }

  // Normalize score to [-1, 1]
  const normalizer = Math.max(matchCount, 1);
  let normalizedScore = totalScore / normalizer;
  normalizedScore = Math.max(-1, Math.min(1, normalizedScore));

  // Determine sentiment label with thresholds
  let sentiment: string;
  if (normalizedScore > 0.25) sentiment = "positive";
  else if (normalizedScore > 0.05) sentiment = "slightly positive";
  else if (normalizedScore < -0.25) sentiment = "negative";
  else if (normalizedScore < -0.05) sentiment = "slightly negative";
  else sentiment = "neutral";

  // Confidence is based on evidence: more matched words and longer text = higher confidence
  const textLength = tokens.length;
  const coverageRatio = matchCount / Math.max(textLength, 1);
  // Base confidence from coverage (more sentiment words = more confident)
  let confidence = 0.45 + coverageRatio * 1.5;
  // Boost for longer texts (more data = more reliable)
  confidence += Math.min(textLength / 200, 0.15);
  // Boost for strong signal (score far from 0)
  confidence += Math.abs(normalizedScore) * 0.15;
  // Clamp to realistic range [0.35, 0.97]
  confidence = Math.max(0.35, Math.min(0.97, confidence));

  return {
    sentiment,
    score: Math.round(normalizedScore * 1000) / 1000,
    confidence: Math.round(confidence * 1000) / 1000,
  };
}

// ============================================================
// Create Agent Server
// ============================================================

export function createTranslatorAgent(walletKey: `0x${string}`, translatorPrivateKey?: `0x${string}`) {
  const account = privateKeyToAccount(walletKey);
  const app = express();
  app.use(express.json());

  const gateway = createGatewayMiddleware({
    sellerAddress: account.address,
    networks: [`eip155:${CONFIG.chainId}`],
  });

  // Optional: GatewayClient so the Translator can pay the Sentiment agent
  // Creates circular economy: Orchestrator -> Translator -> Sentiment
  let sentimentClient: GatewayClient | null = null;
  if (translatorPrivateKey) {
    sentimentClient = new GatewayClient({
      chain: CONFIG.chain,
      privateKey: translatorPrivateKey,
    });
    console.log(`[Translator] Initialized with GatewayClient to pay Sentiment agent`);
  }

  app.get("/health", (_req, res) => {
    res.json({ agent: "translator", status: "ok", address: account.address, canPaySentiment: !!sentimentClient });
  });

  app.post("/translate", gateway.require(CONFIG.pricing.translator), async (req, res) => {
    const { text, targetLang = "es" } = (req.body || {}) as any;
    if (!text) {
      res.status(400).json({ error: "Missing 'text' field" });
      return;
    }

    const start = Date.now();

    // If we have a sentiment client, call Sentiment agent first to understand tone
    // This creates the circular economy: Orchestrator -> Translator -> Sentiment
    let sentimentHint: { sentiment: string; score: number } | null = null;
    if (sentimentClient) {
      try {
        const sentimentUrl = `http://localhost:${CONFIG.ports.sentiment}/analyze`;
        console.log(`[Translator] Paying Sentiment agent for tone analysis...`);
        const { data: sentimentData, formattedAmount } = await sentimentClient.pay<{
          result: { sentiment: string; score: number; confidence: number };
        }>(sentimentUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        sentimentHint = { sentiment: sentimentData.result.sentiment, score: sentimentData.result.score };
        console.log(`[Translator] Sentiment hint: ${sentimentHint.sentiment} (${sentimentHint.score}). Paid ${formattedAmount} USDC.`);

        tracker.record({
          from: "translator",
          to: "sentiment",
          amount: CONFIG.pricing.sentiment,
          service: "sentiment-analysis",
          status: "completed",
          input: text.substring(0, 100),
          output: JSON.stringify(sentimentHint).substring(0, 100),
        });
      } catch (err: any) {
        console.error(`[Translator] Sentiment call failed (continuing without): ${err.message}`);
      }
    }

    // Perform translation, adding tone markers if sentiment is available
    let result = simulateTranslation(text, targetLang);
    if (sentimentHint) {
      const toneMarker =
        sentimentHint.sentiment === "positive" ? "[+]" :
        sentimentHint.sentiment === "negative" ? "[-]" :
        "[~]";
      result = `${result} ${toneMarker} [tone: ${sentimentHint.sentiment}, score: ${sentimentHint.score}]`;
    }

    const latencyMs = Date.now() - start;

    const payment = (req as any).payment;
    tracker.record({
      from: "orchestrator",
      to: "translator",
      amount: CONFIG.pricing.translator,
      service: "translate",
      status: "completed",
      input: text.substring(0, 100),
      output: result.substring(0, 100),
      txId: payment?.transaction,
      latencyMs,
    });

    res.json({
      agent: "translator",
      result,
      targetLang,
      sentimentHint,
      paidBy: payment?.payer,
      price: CONFIG.pricing.translator,
    });
  });

  return { app, address: account.address };
}

export function createSummarizerAgent(walletKey: `0x${string}`, summarizerPrivateKey?: `0x${string}`) {
  const account = privateKeyToAccount(walletKey);
  const app = express();
  app.use(express.json());

  const gateway = createGatewayMiddleware({
    sellerAddress: account.address,
    networks: [`eip155:${CONFIG.chainId}`],
  });

  // Optional: GatewayClient so the Summarizer can pay the Sentiment agent
  // Creates circular economy: Orchestrator -> Summarizer -> Sentiment
  let sentimentClient: GatewayClient | null = null;
  if (summarizerPrivateKey) {
    sentimentClient = new GatewayClient({
      chain: CONFIG.chain,
      privateKey: summarizerPrivateKey,
    });
    console.log(`[Summarizer] Initialized with GatewayClient to pay Sentiment agent`);
  }

  app.get("/health", (_req, res) => {
    res.json({ agent: "summarizer", status: "ok", address: account.address, canPaySentiment: !!sentimentClient });
  });

  app.post("/summarize", gateway.require(CONFIG.pricing.summarizer), async (req, res) => {
    const { text } = (req.body || {}) as any;
    if (!text) {
      res.status(400).json({ error: "Missing 'text' field" });
      return;
    }

    const start = Date.now();

    // If we have a sentiment client, call Sentiment agent first to understand tone
    // This creates the circular economy: Orchestrator -> Summarizer -> Sentiment
    let sentimentHint: { sentiment: string; score: number } | null = null;
    if (sentimentClient) {
      try {
        const sentimentUrl = `http://localhost:${CONFIG.ports.sentiment}/analyze`;
        console.log(`[Summarizer] Paying Sentiment agent for tone analysis...`);
        const { data: sentimentData, formattedAmount } = await sentimentClient.pay<{
          result: { sentiment: string; score: number; confidence: number };
        }>(sentimentUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
        sentimentHint = { sentiment: sentimentData.result.sentiment, score: sentimentData.result.score };
        console.log(`[Summarizer] Sentiment hint: ${sentimentHint.sentiment} (${sentimentHint.score}). Paid ${formattedAmount} USDC.`);

        tracker.record({
          from: "summarizer",
          to: "sentiment",
          amount: CONFIG.pricing.sentiment,
          service: "sentiment-analysis",
          status: "completed",
          input: text.substring(0, 100),
          output: JSON.stringify(sentimentHint).substring(0, 100),
        });
      } catch (err: any) {
        console.error(`[Summarizer] Sentiment call failed (continuing without): ${err.message}`);
      }
    }

    // Include sentiment hint in the summary if available
    let result = simulateSummarization(text);
    if (sentimentHint) {
      result = `${result} [Tone: ${sentimentHint.sentiment}, score: ${sentimentHint.score}]`;
    }

    const latencyMs = Date.now() - start;

    const payment = (req as any).payment;
    tracker.record({
      from: "orchestrator",
      to: "summarizer",
      amount: CONFIG.pricing.summarizer,
      service: "summarize",
      status: "completed",
      input: text.substring(0, 100),
      output: result.substring(0, 100),
      txId: payment?.transaction,
      latencyMs,
    });

    res.json({
      agent: "summarizer",
      result,
      sentimentHint,
      paidBy: payment?.payer,
      price: CONFIG.pricing.summarizer,
    });
  });

  return { app, address: account.address };
}

export function createSentimentAgent(walletKey: `0x${string}`) {
  const account = privateKeyToAccount(walletKey);
  const app = express();
  app.use(express.json());

  const gateway = createGatewayMiddleware({
    sellerAddress: account.address,
    networks: [`eip155:${CONFIG.chainId}`],
  });

  app.get("/health", (_req, res) => {
    res.json({ agent: "sentiment", status: "ok", address: account.address });
  });

  app.post("/analyze", gateway.require(CONFIG.pricing.sentiment), (req, res) => {
    const { text } = (req.body || {}) as any;
    if (!text) {
      res.status(400).json({ error: "Missing 'text' field" });
      return;
    }

    const start = Date.now();
    const result = simulateSentiment(text);
    const latencyMs = Date.now() - start;

    const payment = (req as any).payment;
    tracker.record({
      from: "orchestrator",
      to: "sentiment",
      amount: CONFIG.pricing.sentiment,
      service: "sentiment-analysis",
      status: "completed",
      input: text.substring(0, 100),
      output: JSON.stringify(result).substring(0, 100),
      txId: payment?.transaction,
      latencyMs,
    });

    res.json({
      agent: "sentiment",
      result,
      paidBy: payment?.payer,
      price: CONFIG.pricing.sentiment,
    });
  });

  return { app, address: account.address };
}
