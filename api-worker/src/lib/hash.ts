/**
 * Password hashing — PBKDF2 via Web Crypto API.
 *
 * Workers-native: zero external dependency, no CPU time limit concern.
 * Replaces bcryptjs which required ~200-400ms (exceeds 10ms free-plan CPU limit).
 *
 * Storage format: pbkdf2v1:<iterations>:<saltHex>:<keyHex>
 *
 * NOTE: bcrypt hashes imported from PostgreSQL cannot be verified here —
 * those users will need to reset their password once after migration.
 * All new D1 registrations use this format automatically.
 */

const ITERATIONS = 100_000;
const HASH_ALGO = "SHA-256";
const KEY_LENGTH_BYTES = 32;
const FORMAT_PREFIX = "pbkdf2v1";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function pbkdf2(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: HASH_ALGO, salt, iterations },
    keyMaterial,
    KEY_LENGTH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await pbkdf2(password, salt, ITERATIONS);
  return `${FORMAT_PREFIX}:${ITERATIONS}:${bytesToHex(salt)}:${bytesToHex(key)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    if (!stored.startsWith(`${FORMAT_PREFIX}:`)) {
      // bcrypt hash from PostgreSQL migration — cannot verify in Workers.
      // The user must reset their password to continue.
      return false;
    }
    const parts = stored.split(":");
    if (parts.length !== 4) return false;
    const [, itersStr, saltHex, keyHex] = parts;
    const iterations = parseInt(itersStr!, 10);
    if (!Number.isFinite(iterations) || iterations < 1) return false;
    const salt = hexToBytes(saltHex!);
    const expected = hexToBytes(keyHex!);
    const actual = await pbkdf2(password, salt, iterations);
    // Constant-time comparison — prevents timing attacks
    if (actual.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
    return diff === 0;
  } catch {
    return false;
  }
}
