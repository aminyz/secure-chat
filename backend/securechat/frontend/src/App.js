// frontend/src/App.js
import React, { useState, useRef } from "react";
import { FaLock, FaUnlock, FaPaperPlane } from "react-icons/fa";
import "./App.css";

function isBase64(str) {
  // سریع‌ترین چک بدون دیپند شدن به padding کامل
  // این فقط بررسی سطحی است؛ decode در try/catch انجام می‌شود
  return typeof str === "string" && /^[A-Za-z0-9+/]+={0,2}$/.test(str);
}

function App() {
  const [username, setUsername] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("Disconnected ❌");

  const socketRef = useRef(null);

  const connectWebSocket = () => {
    if (!username || !targetUser) {
      alert("لطفاً Username و Target User را وارد کن!");
      return;
    }

    // room name براساس دو یوزرنیم ساخته می‌شود تا هر دو تب یک room داشته باشند
    const roomName = [username, targetUser].sort().join("_") || "testroom";
    const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${roomName}/`);

    ws.onopen = () => {
      console.log("Connected to WebSocket ✅");
      setConnected(true);
      setStatus("Connected 🟢");
      // می‌توانیم پیام system بفرستیم
      ws.send(JSON.stringify({ type: "system", from: username }));
    };

    ws.onclose = () => {
      console.log("Disconnected ❌");
      setConnected(false);
      setStatus("Disconnected 🔴");
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
      setStatus("Socket error (see console)");
    };

    ws.onmessage = (event) => {
      // احتمال دارد داده انواع مختلف داشته باشد؛ سعی می‌کنیم منطقی آن را پردازش کنیم
      let data = null;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.warn("received non-json message:", event.data);
        // به صورت متن ساده نمایش بده
        setMessages((prev) => [...prev, { sender: "server", encrypted: null, decrypted: event.data }]);
        return;
      }

      // پیام سیستم
      if (data.type === "system" && data.message) {
        setMessages((prev) => [...prev, { sender: "system", encrypted: null, decrypted: data.message }]);
        return;
      }

      // پیام معمولی که ممکن است فیلد ciphertext یا message داشته باشد
      // ما انتظار داریم که فرمت ارسال شده از کلاینت به شکل { type:"message", from, to, ciphertext }
      if (data.ciphertext) {
        // اگر فیلد ciphertext هست سعی می‌کنیم Base64 decode کنیم (شبیه RSA output)
        let decrypted = null;
        try {
          // فقط اگر احتمال base64 باشه تلاش کن
          if (isBase64(data.ciphertext)) {
            decrypted = atob(data.ciphertext);
          } else {
            // اگر base64 نبود، خود رشته را decrypted فرض کنیم
            decrypted = data.ciphertext;
          }
        } catch (err) {
          console.warn("Failed to decode ciphertext with atob:", err);
          decrypted = "[failed to decode ciphertext]";
        }
        setMessages((prev) => [
          ...prev,
          {
            sender: data.from || "remote",
            encrypted: data.ciphertext,
            decrypted,
          },
        ]);
      } else if (data.message) {
        // برخی پیام‌ها فقط فیلد message می‌فرستند (مثلاً سرور یا echo)
        // سعی می‌کنیم آن را decode کنیم در صورت base64 بودن
        let decrypted = null;
        try {
          if (isBase64(data.message)) {
            decrypted = atob(data.message);
          } else {
            decrypted = data.message;
          }
        } catch (err) {
          decrypted = data.message;
        }
        setMessages((prev) => [...prev, { sender: data.from || "server", encrypted: data.message, decrypted }]);
      } else {
        // اگر فرمت دیگریست، کامل آن را پرینت کن
        setMessages((prev) => [...prev, { sender: "unknown", encrypted: JSON.stringify(data), decrypted: JSON.stringify(data) }]);
      }
    };

    socketRef.current = ws;
  };

  const sendMessage = () => {
    if (!message.trim() || !socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
      alert("ابتدا اتصال برقرار شود (Connect)");
      return;
    }

    // شبیه‌سازی رمزگذاری با Base64 (در آینده جایگزین RSA واقعی می‌کنیم)
    const encrypted = btoa(message);

    // ارسال JSON منظم: ciphertext + متادیتا
    const payload = {
      type: "message",
      from: username,
      to: targetUser,
      ciphertext: encrypted,
    };

    socketRef.current.send(JSON.stringify(payload));

    // نمایش محلی پیام (sender)
    setMessages((prev) => [
      ...prev,
      { sender: username, encrypted, decrypted: message },
    ]);
    setMessage("");
  };

  return (
    <div className="chat-container">
      <h2>🔒 RSA Secure Chat Simulation</h2>

      <div className="user-section">
        <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input placeholder="Target User" value={targetUser} onChange={(e) => setTargetUser(e.target.value)} />
        <button onClick={connectWebSocket}>Connect</button>
      </div>

      <div className="status">{status}</div>

      <div className="chat-box">
        {messages.map((msg, idx) => (
          <div key={idx} className="message">
            <b>{msg.sender}</b>:
            <div className="bubble">
              <div><FaLock color="green" /> Encrypted: {msg.encrypted}</div>
              <div><FaUnlock color="red" /> Decrypted: {msg.decrypted}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="input-section">
        <input placeholder="Type your message..." value={message} onChange={(e) => setMessage(e.target.value)} />
        <button onClick={sendMessage}><FaPaperPlane /> Send</button>
      </div>

      <div className="animation-panel">
        <h3>🔐 Encryption Animation (Demo)</h3>
        <p><b>Step 1:</b> User <i>{username || "?"}</i> encrypts the message with public key.</p>
        <p><b>Step 2:</b> Message is sent securely via WebSocket to server.</p>
        <p><b>Step 3:</b> Server forwards encrypted data to <i>{targetUser || "?"}</i>.</p>
        <p><b>Step 4:</b> {targetUser || "Recipient"} decrypts message using private key.</p>
      </div>
    </div>
  );
}

export default App;
