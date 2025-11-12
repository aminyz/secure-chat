// components/ChatPane.jsx
import React from "react";

export default function ChatPane({ title, messages, onSend, input, setInput }) {
  return (
    <div style={{ width: "46%", border: "1px solid #ddd", borderRadius: 8, padding: 12, background: "#fff" }}>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      <div style={{ height: 360, overflowY: "auto", border: "1px solid #f0f0f0", padding: 8, background: "#fafafa" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 13, color: "#333" }}>{m.label}</div>
            <div style={{ fontFamily: "monospace", fontSize: 12, wordBreak: "break-word", marginTop: 4 }}>{m.content}</div>
            <hr style={{ margin: "8px 0", border: "none", borderTop: "1px dashed #eee" }} />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", marginTop: 8 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type a message" style={{ flex: 1, padding: 8, borderRadius: 4, border: "1px solid #ddd" }} />
        <button onClick={onSend} style={{ marginLeft: 8, padding: "8px 12px", borderRadius: 4, background: "#0b74de", color: "#fff", border: "none" }}>Send</button>
      </div>
    </div>
  );
}
