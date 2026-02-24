/**
 * Ed25519 Digital Signature Utilities
 *
 * Provides key generation, signing, and verification using Ed25519.
 * Private keys are stored as hex in ./keys/private_key.hex
 */

import { ed25519 } from "@noble/curves/ed25519";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

const KEYS_DIR = Deno.env.get("KEYS_DIR") ?? "./keys";
const PRIVATE_KEY_PATH = `${KEYS_DIR}/private_key.hex`;

/**
 * Load existing private key or generate a new one
 * @returns 32-byte Ed25519 private key as Uint8Array
 */
export async function loadOrCreatePrivateKey(): Promise<Uint8Array> {
  try {
    // Try to load existing private key
    const hexKey = await Deno.readTextFile(PRIVATE_KEY_PATH);
    const key = hexToBytes(hexKey.trim());
    console.log("🔑 Loaded existing Ed25519 private key");
    return key;
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      // Generate new private key
      const privateKey = ed25519.utils.randomPrivateKey();
      await savePrivateKey(privateKey);
      console.log("🔑 Generated new Ed25519 private key (first run)");
      return privateKey;
    }
    throw error;
  }
}

/**
 * Save private key to disk
 * @param privateKey - 32-byte Ed25519 private key
 */
async function savePrivateKey(privateKey: Uint8Array): Promise<void> {
  // Ensure keys directory exists
  try {
    await Deno.mkdir(KEYS_DIR, { recursive: true });
  } catch (error) {
    if (!(error instanceof Deno.errors.AlreadyExists)) {
      throw error;
    }
  }

  const hexKey = bytesToHex(privateKey);
  await Deno.writeTextFile(PRIVATE_KEY_PATH, hexKey, { mode: 0o600 });
}

/**
 * Get the public key corresponding to a private key
 * @param privateKey - 32-byte Ed25519 private key
 * @returns 32-byte Ed25519 public key
 */
export function getPublicKey(privateKey: Uint8Array): Uint8Array {
  return ed25519.getPublicKey(privateKey);
}

/**
 * Get public key as hex string
 * @param privateKey - 32-byte Ed25519 private key
 * @returns Hex string representation of public key
 */
export function getPublicKeyHex(privateKey: Uint8Array): string {
  const publicKey = getPublicKey(privateKey);
  return bytesToHex(publicKey);
}

/**
 * Sign content using Ed25519
 * @param content - The content string to sign
 * @param privateKey - 32-byte Ed25519 private key
 * @returns 64-byte Ed25519 signature
 */
export function signContent(content: string, privateKey: Uint8Array): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return ed25519.sign(data, privateKey);
}

/**
 * Verify an Ed25519 signature
 * @param signature - 64-byte Ed25519 signature
 * @param content - The original content that was signed
 * @param publicKey - 32-byte Ed25519 public key
 * @returns true if signature is valid, false otherwise
 */
export function verifySignature(
  signature: Uint8Array,
  content: string,
  publicKey: Uint8Array,
): boolean {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return ed25519.verify(signature, data, publicKey);
}

/**
 * Convert signature to hex string
 * @param signature - 64-byte Ed25519 signature
 * @returns Hex string representation
 */
export function signatureToHex(signature: Uint8Array): string {
  return bytesToHex(signature);
}

/**
 * Convert hex string to signature
 * @param hex - Hex string representation of signature
 * @returns 64-byte Ed25519 signature
 */
export function hexToSignature(hex: string): Uint8Array {
  return hexToBytes(hex);
}
