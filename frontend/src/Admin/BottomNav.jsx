import { useState } from "react";
import "./BottomNav.css";

import home from "./assets/image/home.png";
import homeSelect from "./assets/image/home select.png";

import chat from "./assets/image/Chat.png";
import chatSelect from "./assets/image/chat select.png";

import profile from "./assets/image/Profile.png";
import profileSelect from "./assets/image/Profile select.png";

export default function BottomNav({ goPage }) {
    const [active, setActive] = useState("dashboard");

    const handleClick = (page) => {
        setActive(page);
        goPage(page);
    };

    return (
        <div className="bottom-nav">

            <span onClick={() => handleClick("location")}>
                <img
                    src={active === "location" ? homeSelect : home}
                    alt=""
                />
            </span>

            <span onClick={() => handleClick("chat")}>
                <img
                    src={active === "chat" ? chatSelect : chat}
                    alt=""
                />
            </span>

            <span onClick={() => handleClick("profile")}>
                <img
                    src={active === "profile" ? profileSelect : profile}
                    alt=""
                />
            </span>

        </div>
    );
}