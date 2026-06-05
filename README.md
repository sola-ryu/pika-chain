# pika-chain 🌩️

Markov chain Pokémon text generator. Starts with Pikachu, extensible to any Pokémon.

## Usage

```bash
python pika.py              # generate a new string
python pika.py -n 5         # generate 5 strings
python pika.py -s pikachu   # force Pikachu training data
python pika.py -s charizard # swap in Charizard
```

## How It Works

1. Trains a Markov chain on Pokémon vocalizations (n-gram order configurable, default 2)
2. Samples randomly from the transition table to generate new "speech"
3. Capitalizes and punctuates for dramatic effect

## Extending

Add new Pokémon in `corpus/` as `species.json`. Each file is an array of strings representing vocalizations. The app auto-discovers them.

```json
["Pika", "pika", "chu", "chuuu"]
```

Then run `--<species>` to swap training data mid-flight.
