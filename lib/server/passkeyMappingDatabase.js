import { mkdirSync } from "node:fs";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const DATA_DIRECTORY = path.join(process.cwd(), ".data");
const DEFAULT_DATABASE_PATH = path.join(DATA_DIRECTORY, "passkey-mappings.sqlite");
const DATABASE_PATH = process.env.PASSKEY_MAPPING_DB_PATH || DEFAULT_DATABASE_PATH;
const SECRET_ENV_KEY = "PASSKEY_REGISTRY_SECRET";

let database = null;

function getDatabase() {
  if (database) {
    return database;
  }

  mkdirSync(path.dirname(DATABASE_PATH), { recursive: true });

  database = new DatabaseSync(DATABASE_PATH);
  database.exec("PRAGMA journal_mode = WAL;");
  database.exec("PRAGMA foreign_keys = ON;");
  database.exec(`
    CREATE TABLE IF NOT EXISTS passkey_wallet_mappings (
      credential_hash TEXT PRIMARY KEY,
      address_ciphertext TEXT NOT NULL,
      iv TEXT NOT NULL,
      auth_tag TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  return database;
}

function getSecret() {
  const secret = process.env[SECRET_ENV_KEY];
  if (!secret || secret.trim().length < 32) {
    return null;
  }

  return secret;
}

function getEncryptionKey(secret) {
  return createHash("sha256").update(secret).digest();
}

function hashCredentialId(origin, credentialId, secret) {
  return createHmac("sha256", secret)
    .update(`${origin}:${credentialId}`)
    .digest("base64url");
}

function encryptAddress(address, secret) {
  const key = getEncryptionKey(secret);
  const ivBuffer = randomBytes(12);

  const cipher = createCipheriv("aes-256-gcm", key, ivBuffer);
  const ciphertext = Buffer.concat([cipher.update(address, "utf8"), cipher.final()]);

  return {
    addressCiphertext: ciphertext.toString("base64url"),
    iv: ivBuffer.toString("base64url"),
    authTag: cipher.getAuthTag().toString("base64url"),
  };
}

function decryptAddress(record, secret) {
  try {
    const key = getEncryptionKey(secret);
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(record.iv, "base64url"),
    );

    decipher.setAuthTag(Buffer.from(record.auth_tag, "base64url"));

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(record.address_ciphertext, "base64url")),
      decipher.final(),
    ]);

    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}

export function isPasskeyRegistryReady() {
  return getSecret() !== null;
}

export function hasAnyPasskeyMappings() {
  if (!isPasskeyRegistryReady()) {
    return false;
  }

  const db = getDatabase();
  const row = db.prepare("SELECT COUNT(1) AS total FROM passkey_wallet_mappings;").get();
  return Number(row?.total ?? 0) > 0;
}

export function upsertPasskeyMapping({ origin, credentialId, address }) {
  const secret = getSecret();
  if (!secret) {
    return { ok: false, reason: "missing-secret" };
  }

  const db = getDatabase();
  const credentialHash = hashCredentialId(origin, credentialId, secret);
  const encrypted = encryptAddress(address, secret);
  const now = new Date().toISOString();

  db.prepare(
    `
      INSERT INTO passkey_wallet_mappings (
        credential_hash,
        address_ciphertext,
        iv,
        auth_tag,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(credential_hash)
      DO UPDATE SET
        address_ciphertext = excluded.address_ciphertext,
        iv = excluded.iv,
        auth_tag = excluded.auth_tag,
        updated_at = excluded.updated_at;
    `,
  ).run(
    credentialHash,
    encrypted.addressCiphertext,
    encrypted.iv,
    encrypted.authTag,
    now,
    now,
  );

  return { ok: true };
}

export function resolvePasskeyMapping({ origin, credentialId }) {
  const secret = getSecret();
  if (!secret) {
    return { ok: false, reason: "missing-secret", address: null };
  }

  const db = getDatabase();
  const credentialHash = hashCredentialId(origin, credentialId, secret);

  const record = db
    .prepare(
      `
        SELECT address_ciphertext, iv, auth_tag
        FROM passkey_wallet_mappings
        WHERE credential_hash = ?
        LIMIT 1;
      `,
    )
    .get(credentialHash);

  if (!record) {
    return { ok: true, address: null };
  }

  const decryptedAddress = decryptAddress(record, secret);
  if (!decryptedAddress) {
    return { ok: false, reason: "decrypt-failed", address: null };
  }

  return { ok: true, address: decryptedAddress };
}
