/**
 * ThinkCommit CLI Entry Point
 *
 * A Cryptographic Reasoning Commitment System that creates verifiable,
 * tamper-proof records of AI reasoning using the lfm2.5-thinking model.
 *
 * Usage:
 *   deno run main.ts commit [prompt]  - Create a new commitment
 *   deno run main.ts verify <id>      - Verify an existing commitment
 *   deno run main.ts                  - Show help
 */

import { createCommitment } from "./commit.ts";
import { verifyCommitment } from "./verify.ts";

const VERSION = "1.0.0";

/**
 * Print usage information
 */
function printHelp(): void {
  console.log(`
🧠 ThinkCommit v${VERSION} - Cryptographic Reasoning Commitment System

Creates verifiable, tamper-proof records of AI reasoning by cryptographically
committing to the AI's thinking trace BEFORE the answer is revealed.

USAGE:
  deno run main.ts <command> [arguments]

COMMANDS:
  commit [prompt]     Create a new commitment
                      If prompt is not provided, you will be prompted interactively.

  verify <record-id>  Verify an existing commitment
                      Loads the record and verifies hash, signature, and decrypts response.

  help                Show this help message

EXAMPLES:
  deno run main.ts commit "Should I revoke PGP key ABC123?"
  deno run main.ts verify a3f8c2d1e9b4
  deno run main.ts help

ENVIRONMENT VARIABLES:
  OLLAMA_HOST         Ollama API endpoint (default: http://ollama:11434)
  OLLAMA_MODEL        Model to use (default: lfm2.5-thinking)
  OLLAMA_TEMPERATURE  Model temperature 0.0-1.0 (default: 0.1)
  KEYS_DIR            Directory for storing keys (default: ./keys)
  RECORDS_DIR         Directory for storing records (default: ./records)

REQUIREMENTS:
  - Ollama must be running with the lfm2.5-thinking model installed
  - Run: ollama pull lfm2.5-thinking
`);
}

/**
 * Print version information
 */
function printVersion(): void {
  console.log(`ThinkCommit v${VERSION}`);
}

/**
 * Parse command line arguments
 */
function parseArgs(): { command: string; args: string[] } {
  const args = Deno.args;

  if (args.length === 0) {
    return { command: "help", args: [] };
  }

  const command = args[0].toLowerCase();
  const commandArgs = args.slice(1);

  return { command, args: commandArgs };
}

/**
 * Handle the commit command
 */
async function handleCommit(args: string[]): Promise<void> {
  try {
    // Join all args as the prompt, or use interactive mode
    const prompt = args.length > 0 ? args.join(" ") : undefined;
    await createCommitment(prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error creating commitment: ${message}`);
    Deno.exit(1);
  }
}

/**
 * Handle the verify command
 */
async function handleVerify(args: string[]): Promise<void> {
  if (args.length === 0) {
    console.error("❌ Error: Record ID is required");
    console.error("Usage: deno run main.ts verify <record-id>");
    Deno.exit(1);
  }

  const recordId = args[0];

  try {
    const result = await verifyCommitment(recordId);

    // Show decrypted response on success
    if (result.success && result.decryptedResponse) {
      console.log("\n📝 Decrypted Response:");
      console.log("─".repeat(50));
      console.log(result.decryptedResponse);
      console.log("─".repeat(50));
    }

    // Exit with error code if verification failed
    if (!result.success) {
      Deno.exit(1);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`\n❌ Error verifying commitment: ${message}`);
    Deno.exit(1);
  }
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  const { command, args } = parseArgs();

  switch (command) {
    case "commit":
      await handleCommit(args);
      break;

    case "verify":
      await handleVerify(args);
      break;

    case "help":
    case "-h":
    case "--help":
      printHelp();
      break;

    case "version":
    case "-v":
    case "--version":
      printVersion();
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.error("Run 'deno run main.ts help' for usage information.");
      Deno.exit(1);
  }
}

// Run main function
if (import.meta.main) {
  await main();
}
