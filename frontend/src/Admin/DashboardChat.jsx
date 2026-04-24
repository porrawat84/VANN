import { useEffect, useState } from "react";
import "./DashboardChat.css";
import BottomNav from "./BottomNav";

function formatDateShort(v) {
  if (!v) return "";
  const d = new Date(v);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}`;
}

function DashboardChat({ goPage, goChat, tcpRequest, notify }) {
  const [chats, setChats] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadChats = async () => {
    try {
      setLoading(true);
      const res = await tcpRequest({ type: "ADMIN_CHAT_LIST" });

      if (res.type !== "ADMIN_CHAT_LIST_OK") {
        notify?.(res.code || "โหลดรายการแชทไม่สำเร็จ", "error");
        return;
      }

      setChats(res.chats || []);
    } catch (e) {
      console.error(e);
      notify?.("โหลดรายการแชทไม่สำเร็จ", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!window.tcp?.onMessage) return;

    const unsub = window.tcp.onMessage((msg) => {
      if (msg.type === "EVENT_CHAT") {
        loadChats();
      }
    });

    return () => unsub?.();
  }, []);

  return (
    <div className="app">
      <div className="content chat">
        <div className="chat-box">
          <h2 className="chat-title">Message ({chats.length})</h2>

          {loading ? (
            <div className="chat-item">loading...</div>
          ) : chats.length === 0 ? (
            <div className="chat-item">no messages</div>
          ) : (
            chats.map((c) => (
              <div
                key={c.user_id}
                className="chat-item"
                onClick={() => goChat(c)}
              >
                <div className="avatar" />

                <div className="chat-info">
                  <div className="chat-name">{c.name || `user${c.user_id}`}</div>
                  <div className="chat-last">{c.last_message || "-"}</div>
                </div>

                <div className="chat-right">
                  <div className="chat-time">{formatDateShort(c.last_created_at)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNav goPage={goPage} />
    </div>
  );
}

export default DashboardChat;