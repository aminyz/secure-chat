// utils/cryptoHelper.js
import { encode as b64encode, decode as b64decode } from "base64-arraybuffer";

const enc = new TextEncoder();
const dec = new TextDecoder();

export function arrayBufferToBase64(buf) {
  return b64encode(buf);
}
export function base64ToArrayBuffer(b64) {
  return b64decode(b64);
}

// ---------- RSA-OAEP key pair (encrypt/decrypt) ----------
export async function generateRSA_OAEP_KeyPair() {
  const kp = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );
  return kp;
}

export async function exportPublicKey_SPKI(key) {
  const spki = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(spki);
}
export async function importPublicKey_SPKI(b64) {
  const ab = base64ToArrayBuffer(b64);
  return await window.crypto.subtle.importKey(
    "spki",
    ab,
    { name: "RSA-OAEP", hash: "SHA-256" },
    true,
    ["encrypt"]
  );
}

export async function encryptWithPubKey(pubKeyImported, plaintext) {
  const data = enc.encode(plaintext);
  const ct = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKeyImported, data);
  return arrayBufferToBase64(ct);
}

export async function decryptWithPrivateKey(privKey, ciphertextB64) {
  const ct = base64ToArrayBuffer(ciphertextB64);
  const plainBuf = await window.crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, ct);
  return dec.decode(plainBuf);
}

// ---------- RSA-PSS for digital signature ----------
export async function generateRSA_PSS_KeyPair() {
  const kp = await window.crypto.subtle.generateKey(
    {
      name: "RSA-PSS",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"]
  );
  return kp;
}

export async function exportPublicKey_SPKI_PSS(key) {
  const spki = await window.crypto.subtle.exportKey("spki", key);
  return arrayBufferToBase64(spki);
}

export async function signMessage(privKey, message) {
  const msg = enc.encode(message);
  const sig = await window.crypto.subtle.sign(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    privKey,
    msg
  );
  return arrayBufferToBase64(sig);
}

export async function verifySignature(pubKeyImported, message, sigB64) {
  const msg = enc.encode(message);
  const sig = base64ToArrayBuffer(sigB64);
  return await window.crypto.subtle.verify(
    {
      name: "RSA-PSS",
      saltLength: 32,
    },
    pubKeyImported,
    sig,
    msg
  );
}
