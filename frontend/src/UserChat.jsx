import { useEffect, useRef, useState } from "react";
import "./UserChat.css";

function formatDayTag(v) {
  if (!v) return "";
  const d = new Date(v);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

export default function UserChat({ goBack, tcpRequest, notify }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  const loadHistory = async () => {
    try {
      const res = await tcpRequest({
        type: "CHAT_HISTORY",
      });

      if (res.type !== "CHAT_HISTORY_OK") {
        notify?.(res.code || "โหลดประวัติแชทไม่สำเร็จ", "error");
        return;
      }

      setMessages(res.messages || []);
    } catch (e) {
      console.error(e);
      notify?.("โหลดประวัติแชทไม่สำเร็จ", "error");
    }
  };

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.tcp?.onMessage) return;

    const unsub = window.tcp.onMessage((msg) => {
      if (msg.type === "EVENT_CHAT") {
        setMessages((prev) => [
          ...prev,
          {
            chat_id: `live-${Date.now()}`,
            user_id: msg.userId,
            sender: msg.sender,
            message: msg.message,
            created_at: msg.createdAt,
          },
        ]);
      }
    });

    return () => unsub?.();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const message = text.trim();
    if (!message) return;

    try {
      const res = await tcpRequest({
        type: "CHAT_SEND",
        message,
      });

      if (res.type !== "CHAT_SEND_OK") {
        notify?.(res.code || "ส่งข้อความไม่สำเร็จ", "error");
        return;
      }

      setText("");
    } catch (e) {
      console.error(e);
      notify?.("ส่งข้อความไม่สำเร็จ", "error");
    }
  };

  return (
    <div className="user-chat-page">
      <div className="user-chat-logo">VANN</div>

      <div className="user-chat-card">
        <button className="user-chat-close" onClick={goBack}>×</button>
        <div className="user-chat-title">chat</div>

        <div className="user-chat-box">
          <div className="date-chip">
            {messages.length ? formatDayTag(messages[0].created_at) : "--/--"}
          </div>

          <div className="bubble-list">
            {messages.map((m) => {
              const mine = m.sender === "USER";
              return (
                <div
                  key={m.chat_id}
                  className={`bubble-row ${mine ? "mine" : "theirs"}`}
                >
                  {!mine && <div className="bubble-avatar purple" />}
                  <div className="bubble">{m.message}</div>
                  {mine && <div className="bubble-avatar blue" />}
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="user-input-wrap">
          <input
            className="user-chat-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder=""
            onKeyDown={(e) => {
              if (e.key === "Enter") sendMessage();
            }}
          />
          <button className="user-chat-send" onClick={sendMessage}>➤</button>
        </div>
      </div>
    </div>
  );
}