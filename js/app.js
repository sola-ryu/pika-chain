/**
 * pika-chain.js — Browser-side Markov chain Pokémon text generator
 */
(function () {
  "use strict";

  const CORPUS_URLS = {
    pikachu: "corpus/pikachu.json",
    charmander: "corpus/charmander.json",
    jigglypuff: "corpus/jigglypuff.json",
  };

  let chain = {};
  let seeds = [];
  let order = 1;
  let currentSpecies = null;

  const CORPUS_NAMES = {
    pikachu: "⚡ Pikachu",
    charmander: "🔥 Charmander",
    jigglypuff: "🎈 Jigglypuff",
  };

  const translations = {
    pikachu: {
      // Single tokens — randomize to keep it fun
      Pika: ["Yeah!", "Nope.", "Sure.", "Absolutely."],
      pika: ["yeah!", "nope.", "sure.", "absolutely."],
      Pikachu: ["I'm Pikachu!", "Pikachu!"],
      pikachu: ["i'm pikachu!", "pikachu!"],
      Pikaaa: ["Yesss…", "This is fine…", "It's getting warm…"],
      pikaaa: ["yesss…", "this is fine…", "it's getting warm…"],
      Chu: ["*static crackles*", "That's what she said.", "*zap*"],
      chu: ["*static crackles*", "that's what she said.", "*zap*"],
      CHU: ["*electrical surge*", "*lightning bolt!*"],
      chuuu: ["*giggling uncontrollably*", "*sparks flying*"],
      Chuuu: ["*giggling uncontrollably*", "*sparks flying*"],
      PIKA: ["NOPE.", "ABSOLUTELY.", "NOT TODAY."],
      "Pika!": ["Yeah!", "Nope."],
      "chu.": ["pika.", "...really?"],
      "Pika~": ["Yeah~", "Mmmhmm~"],
      "Pikaa~": ["Yesss~", "This is fine~"],
      "Chuuu!": ["*sparks everywhere*", "*electric shock!*"],
      "chu! pika!": ["*zap zap*", "*short circuit!*"],
      "PIKA~": ["NOPE~", "ABSOLUTELY~"],
      "PIKA PIKA!": ["NOPE NOPE!", "YES YES!"],
    },
    charmander: {
      Char: ["Fire.", "I'm out of mana.", "*flickers*"],
      char: ["fire.", "i'm out of mana.", "*flickers*"],
      Charmander: ["I'm Charmander!", "Where's my fire?"],
      charmander: ["i'm charmander!", "where's my fire?"],
      mander: ["mander", "*tail flame gutters*"],
      MANDER: ["MANDER!", "*tail flame roars*"],
      "Char!": ["Fire!", "I'm trying!"],
      "char!": ["fire.", "*barely flickers*"],
      "Char-char": ["Fire-fire.", "Burn-burn."],
      "Charmander!": ["I'm Charmander!", "*tail flame blazes*"],
      "CHAR!": ["FIRE!", "*tail flame roars*"],
      "mander mander": ["*tail flame flickers*", "fire fire."],
      "Char! Char!": ["Fire! Fire!", "*both flames flare up*"],
    },
    jigglypuff: {
      Jiggly: ["*yawn*", "Are you asleep yet?", "This is taking forever…"],
      jiggly: ["*yawn*", "are you asleep yet?", "this is taking forever…"],
      Puff: ["*bouncy bounce*", "One more verse!", "*inflates slightly*"],
      puff: ["*bouncy bounce*", "one more verse!", "*deflates slightly*"],
      Jigglypuff: ["I'm Jigglypuff!", "*yawn*", "Anyone want to nap?"],
      jigglypuff: ["i'm jigglypuff!", "*yawn*", "anyone want to nap?"],
      "Puff!": ["*bouncy bounce!*", "One more!"],
      "Puff~": ["*bouncy bounce~*", "*deflates a little~*"],
      "Jiggly!": ["*yawn!*", "Are you asleep yet?!"],
      "jiggly jiggly": ["*yawn yawn*", "*both eyes drooping*"],
      "Jigglypuff!": ["*big yawn!*", "I'm Jigglypuff!", "*everyone falls asleep*"],
      "Puff! Puff!": ["*double bounce!*", "*inflates to max!*"],
      "PUFF!": ["*max inflate!*", "*everyone is asleep!*"],
      "Puffy": ["*soft yawn*", "*bouncy but sleepy*"],
    },
  };

  function pickRandom(arr) {
    if (Array.isArray(arr)) return arr[Math.floor(Math.random() * arr.length)];
    return arr;
  }

  function translate(text, species) {
    const dict = translations[species];
    if (!dict) return text;

    // Tokenize: split on whitespace, keep punctuation attached to words
    const tokens = text.split(/\s+/);
    const result = [];

    for (const token of tokens) {
      // Try exact match first
      if (dict[token]) {
        result.push(pickRandom(dict[token]));
        continue;
      }
      // Try lowercase fallback
      const lower = token.toLowerCase();
      if (lower !== token && dict[lower]) {
        let val = pickRandom(dict[lower]);
        // Preserve original casing style
        if (token === token.toUpperCase() && token.length > 1) {
          val = val.toUpperCase();
        }
        result.push(val);
        continue;
      }
      // Untranslated — pass through
      result.push(token);
    }
    return result.join(" ");
  }

  function translate(text, species) {
    const dict = translations[species];
    if (!dict) return text;

    // Try longest match first (multi-word tokens)
    const words = text.match(/[A-Za-z!~.]+|[^A-Za-z!~.]+/g) || [];
    const result = [];
    let i = 0;
    while (i < words.length) {
      // Try 3, 2, then 1 word
      let matched = false;
      for (let len = 3; len >= 1 && i + len <= words.length; len--) {
        const phrase = words.slice(i, i + len).join(" ");
        if (dict[phrase]) {
          result.push(dict[phrase]);
          i += len;
          matched = true;
          break;
        }
      }
      if (!matched) {
        result.push(words[i]);
        i++;
      }
    }
    return result.join(" ");
  }

  // ── DOM refs ────────────────────────────────────────────────
  const speciesSelect = document.getElementById("species");
  const orderInput = document.getElementById("order");
  const lengthMin = document.getElementById("length-min");
  const lengthMax = document.getElementById("length-max");
  const countInput = document.getElementById("count");
  const generateBtn = document.getElementById("generate");
  const outputEl = document.getElementById("output");
  const corpusInfo = document.getElementById("corpus-info");
  const translateToggle = document.getElementById("translate-toggle");

  // ── Markov chain logic ──────────────────────────────────────
  function buildChain(texts) {
    const ch = {};
    seeds = [];

    for (const text of texts) {
      const tokens = text.split(/\s+/).filter(Boolean);
      if (tokens.length < 2) {
        seeds.push(...tokens);
        continue;
      }
      for (let i = 0; i < tokens.length - order; i++) {
        const ngram = tokens.slice(i, i + order).join("|||");
        ch[ngram] = ch[ngram] || [];
        ch[ngram].push(tokens[i + order]);
      }
    }
    return { chain: ch, seeds };
  }

  function generate() {
    if (seeds.length === 0) return "…";
    const maxLen = parseInt(lengthMax.value, 10) || 15;
    let tokens = [];

    // Start from seed or first key
    if (Math.random() < 0.4 && seeds.length > 0) {
      tokens.push(seeds[Math.floor(Math.random() * seeds.length)]);
    } else {
      const keys = Object.keys(chain);
      if (keys.length === 0) return "…";
      tokens.push(keys[0].split("|||")[0]);
    }

    while (tokens.length < maxLen) {
      const key = tokens.slice(-order).join("|||");
      const next = chain[key];
      if (!next || next.length === 0) break;
      tokens.push(next[Math.floor(Math.random() * next.length)]);
    }

    let result = tokens.join(" ");
    result = result[0].toUpperCase() + result.slice(1);

    // Dramatic punctuation
    const punct = ["!", "~", "..."];
    if (Math.random() < 0.3) result += punct[Math.floor(Math.random() * punct.length)];
    else if (Math.random() < 0.2) result += "!";

    return result;
  }

  // ── UI logic ────────────────────────────────────────────────
  async function loadCorpus(species) {
    corpusInfo.textContent = "Loading…";
    outputEl.textContent = "";
    currentSpecies = species;

    try {
      const resp = await fetch(CORPUS_URLS[species]);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const texts = await resp.json();
      const result = buildChain(texts);
      chain = result.chain;
      seeds = result.seeds;
      corpusInfo.textContent = `${CORPUS_NAMES[species]} — ${texts.length} samples, ${Object.keys(chain).length} states`;
    } catch (err) {
      corpusInfo.textContent = `Error loading corpus: ${err.message}`;
    }
  }

  generateBtn.addEventListener("click", () => {
    if (!currentSpecies) {
      outputEl.textContent = "Select a species first!";
      return;
    }
    const count = parseInt(countInput.value, 10) || 1;
    const translated = translateToggle.checked;
    const lines = [];
    for (let i = 0; i < count; i++) {
      const raw = generate();
      if (translated) {
        lines.push(translate(raw, currentSpecies));
      } else {
        lines.push(raw);
      }
    }
    outputEl.textContent = lines.join("\n");
    outputEl.classList.toggle("translated", translated);
  });

  orderInput.addEventListener("change", () => {
    order = Math.max(1, parseInt(orderInput.value, 10) || 1);
  });

  speciesSelect.addEventListener("change", (e) => loadCorpus(e.target.value));

  // ── Init ────────────────────────────────────────────────────
  loadCorpus("pikachu");
})();
