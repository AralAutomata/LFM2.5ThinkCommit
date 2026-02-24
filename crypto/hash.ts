/**
 * BLAKE3 Hashing Utilities
 *
 * Provides cryptographic hashing functions using BLAKE3 algorithm.
 * BLAKE3 produces a 32-byte (256-bit) hash output.
 */

import { blake3 } from "@noble/hashes/blake3";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils";

/**
 * Hash a thinking trace using BLAKE3
 * @param thinking - The thinking trace string to hash
 * @returns 32-byte Uint8Array containing the BLAKE3 hash
 */
export function hashThinking(thinking: string): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(thinking);
  return blake3(data, { dkLen: 32 });
}

/**
 * Convert a hash (Uint8Array) to hexadecimal string
 * @param hash - The hash as Uint8Array
 * @returns Hexadecimal string representation
 */
export function hashToHex(hash: Uint8Array): string {
  return bytesToHex(hash);
}

/**
 * Convert a hexadecimal string to hash (Uint8Array)
 * @param hex - The hexadecimal string
 * @returns Uint8Array containing the hash
 */
export function hexToHash(hex: string): Uint8Array {
  return hexToBytes(hex);
}

/**
 * Hash arbitrary content using BLAKE3
 * @param content - The content string to hash
 * @param outputLength - Desired output length in bytes (default: 32)
 * @returns Uint8Array containing the BLAKE3 hash
 */
export function hashContent(content: string, outputLength: number = 32): Uint8Array {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  return blake3(data, { dkLen: outputLength });
}
