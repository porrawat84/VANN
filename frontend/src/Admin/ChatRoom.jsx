import { useEffect, useRef, useState } from "react";
import "./ChatRoom.css";
import BottomNav from "./BottomNav";

function formatDayTag(v) {
    if (!v) return "--/--";

    const d = new Date(v);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");

    return `${dd}/${mm}`;
}

export default function ChatRoom({ goBack, chat, goPage, tcpRequest, notify }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const bottomRef = useRef(null);

    const loadHistory = async () => {
        if (!chat?.user_id) return;

        try {
            const res = await tcpRequest({
                type: "ADMIN_CHAT_HISTORY",
                targetUserId: chat.user_id,
            });

            if (res.type !== "ADMIN_CHAT_HISTORY_OK") {
                notify?.(res.code || "โหลดประวัติแชทไม่สำเร็จ", "error");
                return;
            }

            const oldMessages = (res.messages || []).map((m) => ({
                id: m.chat_id,
                text: m.message,
                sender: m.sender === "ADMIN" ? "me" : "other",
                created_at: m.created_at,
            }));

            setMessages(oldMessages);
        } catch (e) {
            console.error(e);
            notify?.("โหลดประวัติแชทไม่สำเร็จ", "error");
        }
    };

    useEffect(() => {
        loadHistory();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chat?.user_id]);

    useEffect(() => {
        if (!window.tcp?.onMessage || !chat?.user_id) return;

        const unsub = window.tcp.onMessage((msg) => {
            if (
                msg.type === "EVENT_CHAT" &&
                Number(msg.userId) === Number(chat.user_id)
            ) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: `live-${Date.now()}`,
                        text: msg.message,
                        sender: msg.sender === "ADMIN" ? "me" : "other",
                        created_at: msg.createdAt,
                    },
                ]);
            }
        });

        return () => unsub?.();
    }, [chat?.user_id]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const sendMessage = async () => {
        const message = input.trim();
        if (!message || !chat?.user_id) return;

        try {
            const res = await tcpRequest({
                type: "CHAT_SEND",
                targetUserId: chat.user_id,
                message,
            });

            if (res.type !== "CHAT_SEND_OK") {
                notify?.(res.code || "ส่งข้อความไม่สำเร็จ", "error");
                return;
            }

            setInput("");
        } catch (e) {
            console.error(e);
            notify?.("ส่งข้อความไม่สำเร็จ", "error");
        }
    };

    return (
        <div className="app-chatroom">
            <div className="chatroom-top">
                <button className="back-btn" onClick={goBack}>
                    ⬅
                </button>

                <h1 className="chat-username">
                    {chat?.name || "Chat"}
                </h1>
            </div>

            <div className="chatroom-container">
                <div className="chat-messages">
                    <div className="chat-date">
                        {messages.length
                            ? formatDayTag(messages[0].created_at)
                            : "--/--"}
                    </div>

                    {messages.map((m, i) => (
                        <div
                            key={m.id || i}
                            className={`chat-row ${m.sender}`}
                        >
                            {m.sender === "other" && <div className="avatar" />}

                            <div className="bubble">
                                {m.text}
                            </div>

                            {m.sender === "me" && <div className="avatar" />}
                        </div>
                    ))}

                    <div ref={bottomRef} />
                </div>

                <div className="chat-input">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder=""
                        onKeyDown={(e) => {
                            if (e.key === "Enter") sendMessage();
                        }}
                    />

                    <button className="send-btn" onClick={sendMessage}>
                        ➤
                    </button>
                </div>
            </div>

            <BottomNav goPage={goPage} />
        </div>
    );
}