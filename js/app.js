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

  const CORPUS_NAMES = {
    pikachu: "⚡ Pikachu",
    charmander: "🔥 Charmander",
    jigglypuff: "🎈 Jigglypuff",
  };

  let chain = {};
  let seeds = [];
  let order = 1;
  let currentSpecies = null;

  // ── DOM refs ────────────────────────────────────────────────
  const speciesSelect = document.getElementById("species");
  const orderInput = document.getElementById("order");
  const lengthMin = document.getElementById("length-min");
  const lengthMax = document.getElementById("length-max");
  const countInput = document.getElementById("count");
  const generateBtn = document.getElementById("generate");
  const outputEl = document.getElementById("output");
  const corpusInfo = document.getElementById("corpus-info");

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
    return ch;
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
      chain = buildChain(texts);
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
    const lines = [];
    for (let i = 0; i < count; i++) {
      lines.push(generate());
    }
    outputEl.textContent = lines.join("\n");
  });

  orderInput.addEventListener("change", () => {
    order = Math.max(1, parseInt(orderInput.value, 10) || 1);
  });

  speciesSelect.addEventListener("change", (e) => loadCorpus(e.target.value));

  // ── Init ────────────────────────────────────────────────────
  loadCorpus("pikachu");
})();
