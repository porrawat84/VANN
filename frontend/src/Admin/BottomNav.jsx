import "./BottomNav.css";

export default function BottomNav({ goPage }) {
    return (
        <div className="bottom-nav">
            <span onClick={() => goPage("dashboard")}>⭐</span>
            <span onClick={() => goPage("location")}>△</span>
            <span className="profile" onClick={() => goPage("profile")}>
                👤
            </span>
        </div>
    );
}