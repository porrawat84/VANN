import { useState } from "react";
import "./ChatRoom.css";
import BottomNav from "./BottomNav";

export default function ChatRoom({ goBack, chat, goPage }) {
    const [messages, setMessages] = useState([
        { text: "booking success !", sender: "other" },
        { text: "thankq kup", sender: "me" },
    ]);

    const [input, setInput] = useState("");

    const sendMessage = () => {
        if (!input) return;
        setMessages([...messages, { text: input, sender: "me" }]);
        setInput("");
    };

    return (
        <div className="app-chatroom">

            {/* 🔥 HEADER */}
            <div className="chatroom-top">
                <button className="back-btn" onClick={goBack}>⬅</button>
                <h1 className="chat-username">
                    {chat?.name || "Chat"}
                </h1>
            </div>

            {/* 🔥 CHAT BOX */}
            <div className="chatroom-container">

                <div className="chat-messages">
                    <div className="chat-date">22/03</div>
                    {messages.map((m, i) => (
                        <div key={i} className={`chat-row ${m.sender}`}>

                            {/* 👈 ฝั่งคนอื่น */}
                            {m.sender === "other" && <div className="avatar" />}

                            <div className="bubble">
                                {m.text}
                            </div>

                            {/* 👉 ฝั่งเรา */}
                            {m.sender === "me" && <div className="avatar" />}

                        </div>
                    ))}
                </div>

                {/* 🔥 INPUT */}
                <div className="chat-input">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder=""
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