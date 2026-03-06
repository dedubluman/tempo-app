"use client";

const SESSION_ENCRYPTION_KEY_STORAGE = "tempo.session.encryptionKey";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.length);
  copied.set(bytes);
  return copied.buffer;
}

function encodeUtf8(value: string): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(value));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return toArrayBuffer(bytes);
}

export async function generateSessionEncryptionKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function encryptPrivateKey(
  key: string,
  cryptoKey: CryptoKey,
): Promise<{ ciphertext: string; iv: string }> {
  const ivBytes = new Uint8Array(12);
  window.crypto.getRandomValues(ivBytes);

  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: toArrayBuffer(ivBytes),
    },
    cryptoKey,
    encodeUtf8(key),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(ivBytes),
  };
}

export async function decryptPrivateKey(
  ciphertext: string,
  iv: string,
  cryptoKey: CryptoKey,
): Promise<string> {
  const decrypted = await window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: base64ToArrayBuffer(iv),
    },
    cryptoKey,
    base64ToArrayBuffer(ciphertext),
  );

  return new TextDecoder().decode(decrypted);
}

export async function exportKey(cryptoKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("raw", cryptoKey);
  return bytesToBase64(new Uint8Array(exported));
}

export async function importKey(base64: string): Promise<CryptoKey> {
  return window.crypto.subtle.importKey(
    "raw",
    base64ToArrayBuffer(base64),
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"],
  );
}

export async function getOrCreateSessionEncryptionKey(): Promise<CryptoKey> {
  const persisted = window.sessionStorage.getItem(
    SESSION_ENCRYPTION_KEY_STORAGE,
  );
  if (persisted) {
    try {
      return await importKey(persisted);
    } catch {
      window.sessionStorage.removeItem(SESSION_ENCRYPTION_KEY_STORAGE);
    }
  }

  const nextKey = await generateSessionEncryptionKey();
  const exported = await exportKey(nextKey);
  window.sessionStorage.setItem(SESSION_ENCRYPTION_KEY_STORAGE, exported);
  return nextKey;
}
