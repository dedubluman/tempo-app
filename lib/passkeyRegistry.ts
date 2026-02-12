const REGISTRY_DB_NAME = "tempo-passkey-registry";
const REGISTRY_STORE_NAME = "walletMappings";
const REGISTRY_DB_VERSION = 1;
const REGISTRY_SALT_KEY = "tempo.walletRegistrySalt";
const REGISTRY_API_ROUTE = "/api/passkey-mappings";

const ACTIVE_CREDENTIAL_KEY = "wagmi.webAuthn.activeCredential";
const LAST_ACTIVE_CREDENTIAL_KEY = "wagmi.webAuthn.lastActiveCredential";

type WalletMappingRecord = {
  credentialHash: string;
  addressCiphertext: string;
  iv: string;
  createdAt: string;
  updatedAt: string;
};

function canUseRegistry(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    typeof window.crypto !== "undefined" &&
    typeof window.crypto.subtle !== "undefined"
  );
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copied = new Uint8Array(bytes.length);
  copied.set(bytes);
  return copied.buffer;
}

function encodeUtf8(value: string): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(value));
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return toArrayBuffer(bytes);
}

function getRegistrySalt(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const existingSalt = window.localStorage.getItem(REGISTRY_SALT_KEY);
    if (existingSalt) {
      return existingSalt;
    }

    const randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);
    const generatedSalt = bytesToBase64(randomBytes);
    window.localStorage.setItem(REGISTRY_SALT_KEY, generatedSalt);
    return generatedSalt;
  } catch {
    return null;
  }
}

function openRegistryDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(REGISTRY_DB_NAME, REGISTRY_DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(REGISTRY_STORE_NAME)) {
        database.createObjectStore(REGISTRY_STORE_NAME, {
          keyPath: "credentialHash",
        });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open passkey registry database."));
  });
}

function withStoreRequest<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    void openRegistryDatabase()
      .then((database) => {
        const transaction = database.transaction(REGISTRY_STORE_NAME, mode);
        const store = transaction.objectStore(REGISTRY_STORE_NAME);
        const request = work(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Passkey registry operation failed."));

        transaction.oncomplete = () => database.close();
        transaction.onerror = () => {
          reject(transaction.error ?? new Error("Passkey registry transaction failed."));
          database.close();
        };
      })
      .catch(reject);
  });
}

async function hashCredentialId(credentialId: string): Promise<string> {
  const normalized = `${window.location.origin}:${credentialId}`;
  const digest = await window.crypto.subtle.digest("SHA-256", encodeUtf8(normalized));
  return bytesToBase64(new Uint8Array(digest));
}

async function deriveCredentialKey(credentialId: string, salt: string): Promise<CryptoKey> {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    encodeUtf8(`${window.location.origin}:${credentialId}`),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: base64ToArrayBuffer(salt),
      iterations: 210_000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"],
  );
}

async function encryptAddress(address: string, credentialId: string, salt: string): Promise<{ ciphertext: string; iv: string }> {
  const ivBytes = new Uint8Array(12);
  window.crypto.getRandomValues(ivBytes);
  const ivBuffer = toArrayBuffer(ivBytes);

  const key = await deriveCredentialKey(credentialId, salt);
  const encrypted = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: ivBuffer,
    },
    key,
    encodeUtf8(address),
  );

  return {
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
    iv: bytesToBase64(ivBytes),
  };
}

async function decryptAddress(ciphertext: string, iv: string, credentialId: string, salt: string): Promise<string | null> {
  try {
    const key = await deriveCredentialKey(credentialId, salt);
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: "AES-GCM",
        iv: base64ToArrayBuffer(iv),
      },
      key,
      base64ToArrayBuffer(ciphertext),
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export function getActiveCredentialId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const activeCredential = window.localStorage.getItem(ACTIVE_CREDENTIAL_KEY);
    if (activeCredential) {
      return activeCredential;
    }

    return window.localStorage.getItem(LAST_ACTIVE_CREDENTIAL_KEY);
  } catch {
    return null;
  }
}

export async function hasAnyWalletMappings(): Promise<boolean> {
  if (!canUseRegistry()) {
    return false;
  }

  const total = await withStoreRequest("readonly", (store) => store.count());
  return total > 0;
}

export async function getMappedAddress(credentialId: string): Promise<string | null> {
  if (!canUseRegistry()) {
    return null;
  }

  const salt = getRegistrySalt();
  if (!salt) {
    return null;
  }

  const credentialHash = await hashCredentialId(credentialId);
  const record = await withStoreRequest("readonly", (store) =>
    store.get(credentialHash) as IDBRequest<WalletMappingRecord | undefined>,
  );

  if (!record) {
    return null;
  }

  return decryptAddress(record.addressCiphertext, record.iv, credentialId, salt);
}

export async function saveWalletMapping(credentialId: string, address: string): Promise<void> {
  if (!canUseRegistry()) {
    return;
  }

  const salt = getRegistrySalt();
  if (!salt) {
    return;
  }

  const credentialHash = await hashCredentialId(credentialId);
  const existingRecord = await withStoreRequest("readonly", (store) =>
    store.get(credentialHash) as IDBRequest<WalletMappingRecord | undefined>,
  );

  const encrypted = await encryptAddress(address, credentialId, salt);
  const now = new Date().toISOString();

  const nextRecord: WalletMappingRecord = {
    credentialHash,
    addressCiphertext: encrypted.ciphertext,
    iv: encrypted.iv,
    createdAt: existingRecord?.createdAt ?? now,
    updatedAt: now,
  };

  await withStoreRequest("readwrite", (store) => store.put(nextRecord));
}

async function postRegistryAction(payload: Record<string, unknown>): Promise<unknown> {
  if (typeof window === "undefined") {
    return null;
  }

  const response = await fetch(REGISTRY_API_ROUTE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    return null;
  }

  return response.json();
}

export async function hasAnyServerWalletMappings(): Promise<boolean> {
  try {
    const response = await postRegistryAction({ action: "hasAny" });
    if (!response || typeof response !== "object" || !("hasAny" in response)) {
      return false;
    }

    return response.hasAny === true;
  } catch {
    return false;
  }
}

export async function getServerMappedAddress(credentialId: string): Promise<string | null> {
  try {
    const response = await postRegistryAction({ action: "resolve", credentialId });
    if (!response || typeof response !== "object" || !("address" in response)) {
      return null;
    }

    if (typeof response.address !== "string") {
      return null;
    }

    return response.address;
  } catch {
    return null;
  }
}

export async function saveServerWalletMapping(credentialId: string, address: string): Promise<boolean> {
  try {
    const response = await postRegistryAction({
      action: "upsert",
      credentialId,
      address,
    });

    if (!response || typeof response !== "object" || !("ok" in response)) {
      return false;
    }

    return response.ok === true;
  } catch {
    return false;
  }
}
