// App.jsx
import React, { useEffect, useRef, useState } from "react";
import ChatPane from "./components/ChatPane";
import {
  generateRSA_OAEP_KeyPair,
  exportPublicKey_SPKI,
  importPublicKey_SPKI,
  encryptWithPubKey,
  decryptWithPrivateKey,
  generateRSA_PSS_KeyPair,
  exportPublicKey_SPKI_PSS,
  signMessage,
  verifySignature,
} from "./utils/cryptoHelper";
import "./index.css";

function AnimationStep({ step, active }) {
  return (
    <div className={`anim-step ${active ? "active" : ""}`}>
      <div className="anim-dot" />
      <div>{step}</div>
    </div>
  );
}

export default function App() {
  const [username, setUsername] = useState("");
  const [target, setTarget] = useState("");

  // messages: array of { label: 'Plaintext'|'Ciphertext'|'Decrypted', content: string }
  const [sentMsgs, setSentMsgs] = useState([]);
  const [recvMsgs, setRecvMsgs] = useState([]);

  const [inputSent, setInputSent] = useState("");
  const [inputRecv, setInputRecv] = useState("");

  const wsRef = useRef(null);

  // keys
  const [rsaKeyPair, setRsaKeyPair] = useState(null); // RSA-OAEP
  const [rsaPubB64, setRsaPubB64] = useState(null);
  const [rsaPssPair, setRsaPssPair] = useState(null); // for signatures
  const [rsaPssPubB64, setRsaPssPubB64] = useState(null);

  const [status, setStatus] = useState("Generating keys...");
  const [animationStage, setAnimationStage] = useState(""); // text of current step

  useEffect(() => {
    (async () => {
      const kp = await generateRSA_OAEP_KeyPair();
      const pubB64 = await exportPublicKey_SPKI(kp.publicKey);
      setRsaKeyPair(kp);
      setRsaPubB64(pubB64);

      const kp2 = await generateRSA_PSS_KeyPair();
      const pubB64sig = await exportPublicKey_SPKI_PSS(kp2.publicKey);
      setRsaPssPair(kp2);
      setRsaPssPubB64(pubB64sig);

      setStatus("Keys ready");
    })();
  }, []);

  // connect WS (room name = chat_{sorted usernames} to ensure both join same room)
  function connectSocket() {
    if (!username) { alert("Set your username first"); return; }
    const room = "testroom"; // for simplicity we use single test room; can use `${[username,target].sort().join('_')}`
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${room}/`);
    ws.onopen = () => {
      setStatus("Connected to server");
      ws.send(JSON.stringify({ type: "system", from: username }));
    };
    ws.onmessage = async (e) => {
      const data = JSON.parse(e.data);
      // expecting {from, to, ciphertext, signature?}
      if (data.ciphertext && data.to === username) {
        setAnimationStage("Received ciphertext — verifying signature...");
        // verify signature if provided
        let ok = true;
        if (data.signature && data.sender_pubsig) {
          // import sender's PSS public key and verify
          const pubSig = await importPublicKey_SPKI(data.sender_pubsig);
          ok = await verifySignature(pubSig, data.ciphertext, data.signature); // note: we're verifying signature on ciphertext for demo
        }
        setAnimationStage("Decrypting ciphertext...");
        try {
          // decrypt
          const plain = await decryptWithPrivateKey(rsaKeyPair.privateKey, data.ciphertext);
          setRecvMsgs(prev => [{ label: `From: ${data.from} (Decrypted)`, content: plain }, { label: "Ciphertext", content: data.ciphertext }, ...prev]);
          setAnimationStage("Decrypted ✓");
        } catch (err) {
          console.error(err);
          setRecvMsgs(prev => [{ label: `From: ${data.from} (Encrypted - failed to decrypt)`, content: data.ciphertext }, ...prev]);
        }
        // clear animation after a moment
        setTimeout(()=> setAnimationStage(""), 1500);
      }
    };
    ws.onclose = () => setStatus("Disconnected");
    ws.onerror = (e) => { console.error(e); setStatus("Socket error"); };
    wsRef.current = ws;
  }

  // upload public keys to server (so other can fetch)
  async function uploadPublicKeys() {
    if (!username || !rsaPubB64) { alert("Set username & ensure keys ready"); return; }
    // upload encryption public key
    await fetch("/api/chat/keys/upload/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, public_key_b64: rsaPubB64 }),
    });
    // upload signature public key to a separate endpoint or reuse (for demo we reuse same API but append _sig)
    await fetch("/api/chat/keys/upload/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username + "_sig", public_key_b64: rsaPssPubB64 }),
    });
    setStatus("Public keys uploaded");
  }

  // fetch pubkey of target from server
  async function fetchTargetKeys() {
    if (!target) { alert("Set target"); return; }
    const res = await fetch(`/api/chat/keys/${target}/`);
    if (!res.ok) { alert("Target public key not found"); return; }
    const data = await res.json();
    return data.public_key_b64;
  }
  async function fetchTargetSigKey() {
    const res = await fetch(`/api/chat/keys/${target + "_sig"}/`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.public_key_b64;
  }

  // send a message: encrypt with target's pub key, sign ciphertext with our PSS private key (demo)
  async function sendMessage() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { alert("Connect first"); return; }
    if (!inputSent) return;
    setAnimationStage("Fetching target public key...");
    const targetPubB64 = await fetchTargetKeys();
    const targetSigB64 = await fetchTargetSigKey();

    setAnimationStage("Importing target public key...");
    const targetPub = await importPublicKey_SPKI(targetPubB64);
    setAnimationStage("Encrypting...");
    const ciphertext = await encryptWithPubKey(targetPub, inputSent);

    setAnimationStage("Signing ciphertext...");
    // sign ciphertext with our PSS private key
    const signatureB64 = await signMessage(rsaPssPair.privateKey, ciphertext);

    setSentMsgs(prev => [{ label: "Plaintext", content: inputSent }, { label: "Ciphertext", content: ciphertext }, { label: "Signature", content: signatureB64 }, ...prev]);
    setAnimationStage("Sending to server...");
    // send JSON with fields
    wsRef.current.send(JSON.stringify({
      type: "message",
      from: username,
      to: target,
      ciphertext,
      signature: signatureB64,
      sender_pub: rsaPubB64,
      sender_pubsig: rsaPssPubB64
    }));
    setAnimationStage("Sent ✓");
    setInputSent("");
    setTimeout(()=> setAnimationStage(""), 1200);
  }

  // For demo: allow manual "receive" send from right pane (simulate)
  async function sendFromRight() {
    // left target is username; right is target user acting as sender
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) { alert("Connect first"); return; }
    if (!inputRecv) return;
    // similar flow but swap roles
    // we will assume the "right pane" user has its own keys (not implemented fully), so for demo we'll just echo back plaintext as ciphertext
    wsRef.current.send(JSON.stringify({ type: "message", from: target, to: username, ciphertext: inputRecv }));
    setRecvMsgs(prev => [{ label: "Plaintext (simulated send)", content: inputRecv }, ...prev]);
    setInputRecv("");
  }

  return (
    <div style={{ padding: 18, background: "#f6f7fb", minHeight: "100vh", fontFamily: "Inter, Arial" }}>
      <h1 style={{ margin: 0 }}>🔐 Secure Chat — RSA Demo</h1>
      <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
        <input placeholder="Your username" value={username} onChange={(e)=>setUsername(e.target.value)} style={{ padding: 8 }} />
        <input placeholder="Target username" value={target} onChange={(e)=>setTarget(e.target.value)} style={{ padding: 8 }} />
        <button onClick={connectSocket} style={{ padding: "8px 12px" }}>Connect</button>
        <button onClick={uploadPublicKeys} style={{ padding: "8px 12px" }}>Upload my public keys</button>
        <div style={{ marginLeft: 12, color: "#666" }}>{status}</div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
        <ChatPane
          title={`Sender (${username || "you"})`}
          messages={sentMsgs}
          onSend={sendMessage}
          input={inputSent}
          setInput={setInputSent}
        />
        <ChatPane
          title={`Receiver (${target || "target"})`}
          messages={recvMsgs}
          onSend={sendFromRight}
          input={inputRecv}
          setInput={setInputRecv}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Encryption Process</h3>
        <div className="anim-container">
          <AnimationStep step="KeyGen (client)" active={animationStage.includes("KeyGen") || animationStage==="Generating keys..."} />
          <AnimationStep step="Encrypt (sender)" active={animationStage.includes("Encrypt")} />
          <AnimationStep step="Sign (sender)" active={animationStage.includes("Sign") || animationStage.includes("Signing")} />
          <AnimationStep step="Send → Server" active={animationStage.includes("Send") || animationStage.includes("Sending")} />
          <AnimationStep step="Server Forward" active={animationStage.includes("Received") || animationStage.includes("Server")} />
          <AnimationStep step="Decrypt (receiver)" active={animationStage.includes("Decrypt") || animationStage.includes("Decrypted")} />
        </div>
        <div style={{ marginTop: 10, color: "#333" }}>{animationStage}</div>
      </div>

      <div style={{ marginTop: 20, borderTop: "1px solid #eee", paddingTop: 12 }}>
        <h3>Digital Signature demo (on ciphertext)</h3>
        <p style={{ color: "#666" }}>در این نمونه، روی متن رمز (ciphertext) امضا می‌کنیم و گیرنده امضا را با public key مربوطه بررسی می‌کند.</p>
      </div>
    </div>
  );
}
