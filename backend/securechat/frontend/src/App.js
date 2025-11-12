import React, { useState, useEffect, useRef } from "react";

function App() {
  const [username, setUsername] = useState("");
  const [targetUser, setTargetUser] = useState("");
  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const socketRef = useRef(null);

  // اتصال به WebSocket
  const connectWebSocket = () => {
    const roomName = "testroom"; // می‌تونیم بعداً داینامیکش کنیم
    socketRef.current = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${roomName}/`);

    socketRef.current.onopen = () => {
      console.log("Connected to WebSocket");
      setConnected(true);
    };

    socketRef.current.onclose = () => {
      console.log("Disconnected");
      setConnected(false);
    };

    socketRef.current.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.message) {
        setMessages((prev) => [...prev, { text: data.message, sender: "server" }]);
      }
    };
  };

  // ارسال پیام
  const sendMessage = () => {
    if (message.trim() !== "" && socketRef.current) {
      const encryptedMessage = btoa(message); // شبیه‌سازی رمزگذاری RSA
      socketRef.current.send(JSON.stringify({ message: encryptedMessage }));
      setMessages((prev) => [...prev, { text: encryptedMessage, sender: username }]);
      setMessage("");
    }
  };

  return (
    <div style={{ fontFamily: "Arial", padding: 20 }}>
      <h2>🔒 Secure Chat (RSA Demo)</h2>

      <div style={{ marginBottom: 10 }}>
        <input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          placeholder="Target user"
          value={targetUser}
          onChange={(e) => setTargetUser(e.target.value)}
          style={{ marginLeft: 5 }}
        />
        <button onClick={connectWebSocket} style={{ marginLeft: 5 }}>
          Connect
        </button>
      </div>

      <div style={{ border: "1px solid #ccc", padding: 10, height: 200, overflowY: "auto" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.sender === username ? "right" : "left" }}>
            <b>{m.sender}: </b> {m.text}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          value={message}
          placeholder="Type message..."
          onChange={(e) => setMessage(e.target.value)}
        />
        <button onClick={sendMessage} style={{ marginLeft: 5 }}>
          Send
        </button>
      </div>

      <div style={{ marginTop: 20 }}>
        <h4>🔑 Encryption Panel</h4>
        <p>✅ Messages are Base64 encoded (simulate RSA)</p>
        <p>{connected ? "🟢 Connected" : "🔴 Not connected"}</p>
      </div>
    </div>
  );
}

export default App;
