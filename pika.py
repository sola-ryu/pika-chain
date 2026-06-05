#!/usr/bin/env python3
"""pika-chain — Markov chain Pokémon text generator."""

import argparse
import json
import os
import random
import sys
from pathlib import Path

CORPUS_DIR = Path(__file__).parent / "corpus"
DEFAULT_ORDER = 1
DEFAULT_OUTPUTS = 1


def load_corpus(species: str) -> list[str]:
    """Load training corpus for a given species."""
    path = CORPUS_DIR / f"{species}.json"
    if not path.exists():
        print(f"Error: no corpus found for '{species}' at {path}", file=sys.stderr)
        sys.exit(1)
    with open(path) as f:
        return json.load(f)


def build_chain(texts: list[str], order: int = 2):
    """Build a Markov chain from training texts.

    Args:
        texts: List of training strings.
        order: N-gram order (2 = bigram).

    Returns:
        Tuple of (transition table, list of seed tokens from single-token entries).
    """
    chain: dict[tuple[str, ...], list[str]] = {}
    seeds: list[str] = []

    for text in texts:
        tokens = text.split()
        if len(tokens) < 2:
            seeds.extend(tokens)
            continue

        for i in range(len(tokens) - order):
            ngram = tuple(tokens[i : i + order])
            next_token = tokens[i + order]
            chain.setdefault(ngram, []).append(next_token)

    return chain, seeds


def generate(chain: dict, seeds: list[str], order: int = 2, max_len: int = 15) -> str:
    """Generate one output string from the Markov chain."""
    tokens: list[str] = []

    # Pick a starting point
    if seeds and random.random() < 0.4:
        tokens.append(random.choice(seeds))
    else:
        start = random.choice([k for k in chain if len(k) >= order])
        tokens.append(start[0])

    while len(tokens) < max_len:
        matched = False
        for prefix_len in range(min(len(tokens), order), 0, -1):
            ngram = tuple(tokens[-prefix_len:])
            next_tokens = chain.get(ngram, [])
            if next_tokens:
                tokens.append(random.choice(next_tokens))
                matched = True
                break
        if not matched:
            break

    result = " ".join(tokens)
    result = result[0].upper() + result[1:] if result else ""

    # Add dramatic punctuation
    if random.random() < 0.3:
        result += random.choice(["!", "~", "..."])
    elif random.random() < 0.2:
        result += "!"

    return result


def main():
    parser = argparse.ArgumentParser(description="Markov chain Pokémon text generator")
    parser.add_argument(
        "-n",
        "--count",
        type=int,
        default=DEFAULT_OUTPUTS,
        help="Number of strings to generate",
    )
    parser.add_argument(
        "-s",
        "--species",
        type=str,
        default="pikachu",
        help="Species name (corpus file in corpus/)",
    )
    parser.add_argument(
        "--order",
        type=int,
        default=DEFAULT_ORDER,
        help=f"N-gram order (default: {DEFAULT_ORDER})",
    )
    parser.add_argument(
        "--list-species", action="store_true", help="List available species and exit"
    )
    args = parser.parse_args()

    if args.list_species:
        species = [f.stem for f in CORPUS_DIR.glob("*.json")]
        print(f"Available species ({len(species)}):")
        for s in sorted(species):
            print(f"  - {s}")
        return

    texts = load_corpus(args.species)
    chain, seeds = build_chain(texts, args.order)

    print(f"Training on '{args.species}' — {len(texts)} samples, {len(chain)} states\n")
    for _ in range(args.count):
        print(generate(chain, seeds, args.order))


if __name__ == "__main__":
    main()
