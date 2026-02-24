/**
 * AES-GCM Encryption Utilities
 *
 * Provides authenticated encryption using AES-256-GCM via Web Crypto API.
 * Encryption key is derived from the Ed25519 private key using BLAKE3.
 */

import { bytesToHex, hexToBytes } from "@noble/hashes/utils";
import { blake3 } from "@noble/hashes/blake3";

const NONCE_LENGTH = 12; // AES-GCM uses 12-byte (96-bit) nonce
const KEY_LENGTH = 32; // AES-256 uses 32-byte key
const TAG_LENGTH = 16; // GCM authentication tag length

/**
 * Derive an AES encryption key from an Ed25519 private key
 * Uses BLAKE3 to derive a 32-byte key
 * @param privateKey - 32-byte Ed25519 private key
 * @returns 32-byte AES-256 encryption key
 */
export function deriveEncryptionKey(privateKey: Uint8Array): Uint8Array {
  // Use BLAKE3 to derive a key from the private key
  // We use a domain separation tag to ensure this key is only used for encryption
  const encoder = new TextEncoder();
  const domainTag = encoder.encode("thinkcommit-encryption-key");
  
  // Concatenate domain tag with private key for domain separation
  const input = new Uint8Array(domainTag.length + privateKey.length);
  input.set(domainTag, 0);
  input.set(privateKey, domainTag.length);
  
  return blake3(input, { dkLen: KEY_LENGTH });
}

/**
 * Encrypt a response using AES-256-GCM
 * @param response - The response string to encrypt
 * @param key - 32-byte encryption key
 * @returns Object containing ciphertext and nonce (both as Uint8Array)
 */
export async function encryptResponse(
  response: string,
  key: Uint8Array,
): Promise<{ ciphertext: Uint8Array; nonce: Uint8Array }> {
  // Generate cryptographically secure random nonce
  const nonce = new Uint8Array(NONCE_LENGTH);
  crypto.getRandomValues(nonce);

  const encoder = new TextEncoder();
  const plaintext = encoder.encode(response);

  // Import key for Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["encrypt"],
  );

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonce, tagLength: TAG_LENGTH * 8 },
    cryptoKey,
    plaintext,
  );

  return { ciphertext: new Uint8Array(ciphertext), nonce };
}

/**
 * Decrypt a response using AES-256-GCM
 * @param ciphertext - Encrypted data (includes GCM authentication tag)
 * @param nonce - 12-byte nonce used during encryption
 * @param key - 32-byte encryption key
 * @returns Decrypted response string
 * @throws Error if decryption fails (invalid key, tampered data, etc.)
 */
export async function decryptResponse(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
  key: Uint8Array,
): Promise<string> {
  // Import key for Web Crypto API
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: nonce, tagLength: TAG_LENGTH * 8 },
    cryptoKey,
    ciphertext,
  );

  const decoder = new TextDecoder();
  return decoder.decode(plaintext);
}

/**
 * Convert encryption result to hex strings for storage
 * @param ciphertext - Encrypted data
 * @param nonce - Nonce used for encryption
 * @returns Object with hex string representations
 */
export function encryptionResultToHex(
  ciphertext: Uint8Array,
  nonce: Uint8Array,
): { ciphertextHex: string; nonceHex: string } {
  return {
    ciphertextHex: bytesToHex(ciphertext),
    nonceHex: bytesToHex(nonce),
  };
}

/**
 * Parse hex strings back to encryption components
 * @param ciphertextHex - Hex string of encrypted data
 * @param nonceHex - Hex string of nonce
 * @returns Object with Uint8Array values
 */
export function hexToEncryptionComponents(
  ciphertextHex: string,
  nonceHex: string,
): { ciphertext: Uint8Array; nonce: Uint8Array } {
  return {
    ciphertext: hexToBytes(ciphertextHex),
    nonce: hexToBytes(nonceHex),
  };
}
