import "./DashboardChat.css";
import logo from "./assets/image/logo.png";
import BottomNav from "./BottomNav";

function DashboardChat({ goPage, goChat, unreadMap }) {

    const chats = [
        {
            id: 1,
            name: "nongvanda01",
            last: "booking success !",
            time: "22/03",
        },
        {
            id: 2,
            name: "user02",
            last: "hello",
            time: "21/03",
        },
    ];

    return (
        <div className="app">

            <div className="content chat">
                <div className="chat-box">
                    <h2 className="chat-title">Message ({chats.length})
                    </h2>

                    {chats.map((c) => (
                        <div
                            key={c.id}
                            className="chat-item"
                            onClick={() => goChat(c)}
                        >
                            <div className="avatar" />

                            <div className="chat-info">
                                <div className="chat-name">{c.name}</div>
                                <div className="chat-last">{c.last}</div>
                            </div>

                            {/* 🔥 ด้านขวา */}
                            <div className="chat-right">
                                <div className="chat-time">{c.time}</div>

                                {/* 🔴 unread */}
                                {unreadMap?.[c.id] > 0 && (
                                    <div className="unread-badge">
                                        {unreadMap[c.id]}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <BottomNav goPage={goPage} />
        </div>
    );
}

export default DashboardChat;