# ThinkCommit Usage Guide

## Quick Start

### Prerequisites

1. **Ollama running locally** with `lfm2.5-thinking` model:
   ```bash
   ollama pull lfm2.5-thinking
   ```

2. **Deno installed** (optional, for local execution):
   ```bash
   curl -fsSL https://deno.land/install.sh | sh
   ```

### Option 1: Run Directly with Deno (Recommended)

```bash
# Set environment
export OLLAMA_HOST=http://localhost:11434

# Create a commitment
deno task commit "Your question here"

# Verify a commitment
deno task verify <record-id>
```

### Option 2: Run with Docker

```bash
# Create a commitment
OLLAMA_HOST=http://localhost:11434 docker compose run --rm deno-app deno task commit "Your question"

# Verify a commitment
OLLAMA_HOST=http://localhost:11434 docker compose run --rm deno-app deno task verify <record-id>
```

## Example Session

```bash
# Create a commitment
$ OLLAMA_HOST=http://localhost:11434 deno task commit "Should I revoke PGP key ABC123?"
🧠 Querying LFM2.5-Thinking...
🔐 Creating cryptographic commitment...
🔑 Loaded existing Ed25519 private key
✅ Commitment created:
   ID: bae6abcfb7c39f0c
   Thinking Hash: blake3:d4503bc2e2bcf450...
   Stored: ./records/bae6abcfb7c39f0c.json

# Verify the commitment
$ OLLAMA_HOST=http://localhost:11434 deno task verify bae6abcfb7c39f0c
🔍 Verifying commitment: bae6abcfb7c39f0c
📄 Loaded record from ./records/bae6abcfb7c39f0c.json
🔑 Loaded existing Ed25519 private key
🔐 Verifying thinking hash...
   ✅ Hash verified
✍️  Verifying signature...
   ✅ Signature verified
🔓 Decrypting response...
   ✅ Decryption successful
🤖 Verifying model...
   ✅ Model verified: lfm2.5-thinking

✅ All verifications passed!

📝 Decrypted Response:
──────────────────────────────────────────────────
When deciding whether to revoke a PGP key like "ABC123,"...
──────────────────────────────────────────────────
```

## Record Files

Each commitment creates two files:

- `./records/<id>.json` - Full record with thinking trace and encrypted response (private)
- `./records/<id>.public.json` - Public record for verification (safe to share)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama API endpoint |
| `OLLAMA_MODEL` | `lfm2.5-thinking` | Model to use |
| `OLLAMA_TEMPERATURE` | `0.1` | Model temperature (0.0-1.0) |
| `KEYS_DIR` | `./keys` | Directory for keys |
| `RECORDS_DIR` | `./records` | Directory for records |

## Security Notes

1. **Private Key**: Stored in `./keys/private_key.hex` - back it up and keep it secure!
2. **Public Records**: `.public.json` files can be safely shared
3. **Full Records**: `.json` files contain encrypted responses - keep private
