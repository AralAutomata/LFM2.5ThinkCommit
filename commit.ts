/**
 * Commitment Creation Module
 *
 * Creates cryptographic commitments by:
 * 1. Querying Ollama for thinking + response
 * 2. Hashing the thinking trace with BLAKE3
 * 3. Signing the hash with Ed25519
 * 4. Encrypting the response with XChaCha20
 * 5. Storing full and public records
 */

import { hashThinking, hashToHex, hashContent } from "./crypto/hash.ts";
import {
  loadOrCreatePrivateKey,
  getPublicKey,
  signContent,
  signatureToHex,
  getPublicKeyHex,
} from "./crypto/sign.ts";
import {
  deriveEncryptionKey,
  encryptResponse,
  encryptionResultToHex,
} from "./crypto/encrypt.ts";

const RECORDS_DIR = Deno.env.get("RECORDS_DIR") ?? "./records";
const OLLAMA_HOST = Deno.env.get("OLLAMA_HOST") ?? "http://ollama:11434";
const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") ?? "lfm2.5-thinking";
const OLLAMA_TEMPERATURE = parseFloat(Deno.env.get("OLLAMA_TEMPERATURE") ?? "0.1");

/**
 * Interface for Ollama API response
 */
interface OllamaResponse {
  thinking?: string;
  response: string;
  model: string;
  done: boolean;
}

/**
 * Interface for full record (stored privately)
 */
export interface FullRecord {
  id: string;
  timestamp: string;
  prompt: string;
  thinkingTrace: string;
  thinkingHash: string;
  thinkingSignature: string;
  encryptedResponse: string;
  responseNonce: string;
  model: string;
  modelHash: string;
  publicKey: string;
}

/**
 * Interface for public record (can be shared)
 */
export interface PublicRecord {
  id: string;
  timestamp: string;
  thinkingHash: string;
  thinkingSignature: string;
  model: string;
  modelHash: string;
  publicKey: string;
}

/**
 * Generate a unique record ID from prompt and timestamp
 * @param prompt - User's prompt
 * @param timestamp - ISO timestamp
 * @returns 16-character hex ID
 */
function generateRecordId(prompt: string, timestamp: string): string {
  const combined = `${prompt}${timestamp}`;
  const hash = hashContent(combined, 32);
  return hashToHex(hash).slice(0, 16);
}

/**
 * Query Ollama API for thinking and response
 * @param prompt - The user's question/prompt
 * @returns Object with thinking trace and response
 */
async function queryOllama(prompt: string): Promise<{ thinking: string; response: string }> {
  const url = `${OLLAMA_HOST}/api/generate`;
  
  const requestBody = {
    model: OLLAMA_MODEL,
    prompt: prompt,
    think: true,
    stream: false,
    options: {
      temperature: OLLAMA_TEMPERATURE,
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Ollama API error (${response.status}): ${errorText}`);
    }

    const data: OllamaResponse = await response.json();

    // Handle case where thinking field is missing or empty
    const thinking = data.thinking ?? "";
    const modelResponse = data.response;

    if (!modelResponse) {
      throw new Error("Ollama returned empty response");
    }

    return { thinking, response: modelResponse };
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Failed to connect to Ollama at ${OLLAMA_HOST}. Ensure Ollama is running and accessible.`,
      );
    }
    throw error;
  }
}

/**
 * Ensure records directory exists
 */
async function ensureRecordsDir(): Promise<void> {
  try {
    await Deno.mkdir(RECORDS_DIR, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }
}

/**
 * Save full record to disk
 * @param record - Full record object
 */
async function saveFullRecord(record: FullRecord): Promise<void> {
  const filePath = `${RECORDS_DIR}/${record.id}.json`;
  await Deno.writeTextFile(filePath, JSON.stringify(record, null, 2));
}

/**
 * Save public record to disk
 * @param record - Full record object (used to derive public record)
 */
async function savePublicRecord(record: FullRecord): Promise<void> {
  const publicRecord: PublicRecord = {
    id: record.id,
    timestamp: record.timestamp,
    thinkingHash: record.thinkingHash,
    thinkingSignature: record.thinkingSignature,
    model: record.model,
    modelHash: record.modelHash,
    publicKey: record.publicKey,
  };

  const filePath = `${RECORDS_DIR}/${record.id}.public.json`;
  await Deno.writeTextFile(filePath, JSON.stringify(publicRecord, null, 2));
}

/**
 * Create a commitment for the given prompt
 * @param prompt - User's question/prompt (optional, will prompt if not provided)
 * @returns The created full record
 */
export async function createCommitment(prompt?: string): Promise<FullRecord> {
  // Get prompt from user if not provided
  if (!prompt) {
    console.log("📝 Enter your question (or press Ctrl+C to cancel):");
    const input = new Uint8Array(4096);
    const n = await Deno.read(Deno.stdin.rid, input);
    prompt = new TextDecoder().decode(input.subarray(0, n)).trim();
  }

  if (!prompt || prompt.length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  console.log("🧠 Querying LFM2.5-Thinking...");

  // Query Ollama for thinking and response
  const { thinking, response } = await queryOllama(prompt);

  // Warn if thinking is empty
  if (!thinking || thinking.length === 0) {
    console.warn("⚠️  Warning: Model returned empty thinking trace");
  }

  console.log("🔐 Creating cryptographic commitment...");

  // Load or generate private key
  const privateKey = await loadOrCreatePrivateKey();
  const publicKey = getPublicKey(privateKey);
  const publicKeyHex = getPublicKeyHex(privateKey);

  // Generate timestamp
  const timestamp = new Date().toISOString();

  // Generate record ID
  const id = generateRecordId(prompt, timestamp);

  // Hash the thinking trace
  const thinkingHash = hashThinking(thinking);
  const thinkingHashHex = hashToHex(thinkingHash);

  // Sign the hash + timestamp
  const signedContent = `${thinkingHashHex}:${timestamp}`;
  const signature = signContent(signedContent, privateKey);
  const signatureHex = signatureToHex(signature);

  // Derive encryption key and encrypt response
  const encryptionKey = deriveEncryptionKey(privateKey);
  const { ciphertext, nonce } = await encryptResponse(response, encryptionKey);
  const { ciphertextHex, nonceHex } = encryptionResultToHex(ciphertext, nonce);

  // Hash the model identifier
  const modelHash = hashToHex(hashContent(OLLAMA_MODEL, 32));

  // Create full record
  const record: FullRecord = {
    id,
    timestamp,
    prompt,
    thinkingTrace: thinking,
    thinkingHash: `blake3:${thinkingHashHex}`,
    thinkingSignature: `ed25519:${signatureHex}`,
    encryptedResponse: `xchacha20:${ciphertextHex}`,
    responseNonce: nonceHex,
    model: OLLAMA_MODEL,
    modelHash: `blake3:${modelHash}`,
    publicKey: publicKeyHex,
  };

  // Save records
  await ensureRecordsDir();
  await saveFullRecord(record);
  await savePublicRecord(record);

  console.log("✅ Commitment created:");
  console.log(`   ID: ${id}`);
  console.log(`   Thinking Hash: blake3:${thinkingHashHex.slice(0, 16)}...`);
  console.log(`   Stored: ${RECORDS_DIR}/${id}.json`);

  return record;
}
