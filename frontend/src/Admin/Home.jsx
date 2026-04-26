import "./Home.css";
import logo from "./assets/image/logo.png";
import BottomNav from "./BottomNav";

function Location({ goPage}) {
    const handleSelect = (destCode) => {
        localStorage.setItem("dest", destCode);
        goPage("adminLocation");
    };

return (
    <div className="app">
        <img src={logo} className="admin-location-logo" />

        <p className="admin-home-tagline">for admin</p>

        <div className="admin-location-container">
            <div className="admin-location-content">

                <button className="admin-location-btn" onClick={() => handleSelect("FP")}>
                    Future Park Rangsit
                </button>

                <button className="admin-location-btn" onClick={() => handleSelect("MC")}>
                    Mo Chit
                </button>

                <button className="admin-location-btn" onClick={() => handleSelect("VM")}>
                    Victory Monument
                </button>

            </div>
        </div>

        <BottomNav goPage={goPage} currentPage="adminHome" />
    </div>
);
}
export default Location;