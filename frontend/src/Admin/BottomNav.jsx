import { useState } from "react";
import "./BottomNav.css";

import home from "./assets/image/home.png";
import homeSelect from "./assets/image/home select.png";

import payment from "./assets/image/Payment.png";
import paymentSelect from "./assets/image/Payment select.png";

import chat from "./assets/image/Chat.png";
import chatSelect from "./assets/image/chat select.png";

import profile from "./assets/image/Profile.png";
import profileSelect from "./assets/image/Profile select.png";

export default function BottomNav({ goPage, currentPage }) {

    const isChatPage =
        currentPage === "adminDashboardChat" ||
        currentPage === "adminChatRoom";

    const isHomePage =
        currentPage === "adminHome" ||
        currentPage === "adminLocation" ||
        currentPage === "dataseat";

    const isPaymentPage =
        currentPage === "adminPayment";

    const handleClick = (page) => {
        goPage(page);
    };

    return (
        <div className="bottom-nav">

            <span onClick={() => handleClick("adminHome")}>
                <img
                    src={isHomePage ? homeSelect : home}
                    alt=""
                />
            </span>

            <span onClick={() => handleClick("adminPayment")}>
                <img
                    src={isPaymentPage ? paymentSelect : payment}
                    alt=""
                />
            </span>

            <span onClick={() => handleClick("adminDashboardChat")}>
                <img
                    src={isChatPage ? chatSelect : chat}
                    alt=""
                />
            </span>

            <span onClick={() => handleClick("adminProfile")}>
                <img
                    src={currentPage === "adminProfile" ? profileSelect : profile}
                    alt=""
                />
            </span>

        </div>
    );
}