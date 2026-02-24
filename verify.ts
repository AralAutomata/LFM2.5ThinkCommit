/**
 * Commitment Verification Module
 *
 * Verifies cryptographic commitments by:
 * 1. Loading the record from disk
 * 2. Re-hashing the thinking trace and comparing
 * 3. Verifying the Ed25519 signature
 * 4. Decrypting the response
 */

import { hashThinking, hashToHex, hashContent } from "./crypto/hash.ts";
import {
  loadOrCreatePrivateKey,
  getPublicKey,
  verifySignature,
  hexToSignature,
} from "./crypto/sign.ts";
import { hexToBytes } from "@noble/hashes/utils";
import {
  deriveEncryptionKey,
  decryptResponse,
  hexToEncryptionComponents,
} from "./crypto/encrypt.ts";
import type { FullRecord } from "./commit.ts";

const RECORDS_DIR = Deno.env.get("RECORDS_DIR") ?? "./records";
const OLLAMA_MODEL = Deno.env.get("OLLAMA_MODEL") ?? "lfm2.5-thinking";

/**
 * Verification result
 */
export interface VerificationResult {
  success: boolean;
  recordId: string;
  hashVerified: boolean;
  signatureVerified: boolean;
  decryptionSuccess: boolean;
  decryptedResponse?: string;
  errors: string[];
}

/**
 * Load full record from disk
 * @param recordId - The record ID
 * @returns The full record object
 */
async function loadRecord(recordId: string): Promise<FullRecord> {
  const filePath = `${RECORDS_DIR}/${recordId}.json`;

  try {
    const content = await Deno.readTextFile(filePath);
    return JSON.parse(content) as FullRecord;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      throw new Error(`Record not found: ${recordId}`);
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid JSON in record: ${recordId}`);
    }
    throw error;
  }
}

/**
 * Parse hash string (removes "blake3:" prefix)
 */
function parseHash(hashString: string): string {
  if (hashString.startsWith("blake3:")) {
    return hashString.slice(7);
  }
  return hashString;
}

/**
 * Parse signature string (removes "ed25519:" prefix)
 */
function parseSignature(sigString: string): string {
  if (sigString.startsWith("ed25519:")) {
    return sigString.slice(8);
  }
  return sigString;
}

/**
 * Parse encrypted response string (removes "xchacha20:" prefix)
 */
function parseEncryptedResponse(encryptedString: string): string {
  if (encryptedString.startsWith("xchacha20:")) {
    return encryptedString.slice(10);
  }
  return encryptedString;
}

/**
 * Verify a commitment by record ID
 * @param recordId - The record ID to verify
 * @returns Verification result
 */
export async function verifyCommitment(recordId: string): Promise<VerificationResult> {
  const result: VerificationResult = {
    success: false,
    recordId,
    hashVerified: false,
    signatureVerified: false,
    decryptionSuccess: false,
    errors: [],
  };

  console.log(`🔍 Verifying commitment: ${recordId}`);

  // Load record
  let record: FullRecord;
  try {
    record = await loadRecord(recordId);
    console.log(`📄 Loaded record from ${RECORDS_DIR}/${recordId}.json`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Failed to load record: ${message}`);
    return result;
  }

  // Load private key
  let privateKey: Uint8Array;
  try {
    privateKey = await loadOrCreatePrivateKey();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Failed to load private key: ${message}`);
    return result;
  }

  // 1. Verify hash
  console.log("🔐 Verifying thinking hash...");
  try {
    const computedHash = hashThinking(record.thinkingTrace);
    const computedHashHex = hashToHex(computedHash);
    const storedHashHex = parseHash(record.thinkingHash);

    if (computedHashHex === storedHashHex) {
      result.hashVerified = true;
      console.log("   ✅ Hash verified");
    } else {
      result.errors.push("Hash mismatch: thinking trace may have been tampered with");
      console.log("   ❌ Hash mismatch!");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Hash verification failed: ${message}`);
    console.log(`   ❌ Hash verification failed: ${message}`);
  }

  // 2. Verify signature
  console.log("✍️  Verifying signature...");
  try {
    const storedHashHex = parseHash(record.thinkingHash);
    const signedContent = `${storedHashHex}:${record.timestamp}`;
    const signatureHex = parseSignature(record.thinkingSignature);
    const signature = hexToSignature(signatureHex);

    // Get public key from record or derive from private key
    const publicKey = record.publicKey
      ? hexToBytes(record.publicKey)
      : getPublicKey(privateKey);

    const isValid = verifySignature(signature, signedContent, publicKey);

    if (isValid) {
      result.signatureVerified = true;
      console.log("   ✅ Signature verified");
    } else {
      result.errors.push("Invalid signature: record may not be authentic");
      console.log("   ❌ Invalid signature!");
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Signature verification failed: ${message}`);
    console.log(`   ❌ Signature verification failed: ${message}`);
  }

  // 3. Decrypt response
  console.log("🔓 Decrypting response...");
  try {
    const encryptedHex = parseEncryptedResponse(record.encryptedResponse);
    const { ciphertext, nonce } = hexToEncryptionComponents(
      encryptedHex,
      record.responseNonce,
    );
    const encryptionKey = deriveEncryptionKey(privateKey);

    const decryptedResponse = await decryptResponse(ciphertext, nonce, encryptionKey);
    result.decryptionSuccess = true;
    result.decryptedResponse = decryptedResponse;
    console.log("   ✅ Decryption successful");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(`Decryption failed: ${message}`);
    console.log(`   ❌ Decryption failed: ${message}`);
  }

  // 4. Verify model
  console.log("🤖 Verifying model...");
  const expectedModelHash = hashToHex(hashContent(OLLAMA_MODEL, 32));
  const storedModelHash = parseHash(record.modelHash);

  if (storedModelHash === expectedModelHash) {
    console.log(`   ✅ Model verified: ${record.model}`);
  } else {
    console.log(`   ⚠️  Model hash mismatch (expected: ${OLLAMA_MODEL})`);
  }

  // Determine overall success
  result.success = result.hashVerified && result.signatureVerified &&
    result.decryptionSuccess;

  if (result.success) {
    console.log("\n✅ All verifications passed!");
  } else {
    console.log("\n❌ Verification failed!");
    for (const error of result.errors) {
      console.log(`   - ${error}`);
    }
  }

  return result;
}
