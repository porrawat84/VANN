import "./cssLocation.css";
import bg from "./assets/image/background.png";
import logo from "./assets/image/logo.png";

function Location({ goNext }) {
    const handleSelect = (place) => {
        localStorage.setItem("location", place);
        goNext(); // ✅ ใช้ React คุมหน้า
    };

    return (
        <div className="app" style={{ backgroundImage: `url(${bg})` }}>
            <img src={logo} className="logo" />

            <div className="content">
                <h2>choose your destination</h2>
                <h3>from : thammasat van terminal</h3>
                <div className="btn-group">
                    <button className="btn" onClick={() => handleSelect("Future Park Rangsit")}>
                        Future Park Rangsit
                    </button>

                    <button className="btn" onClick={() => handleSelect("Mo Chit")}>
                        Mo Chit
                    </button>

                    <button className="btn" onClick={() => handleSelect("Victory Monument")}>
                        Victory Monument
                    </button></div>
            </div>
        </div>
    );
}

export default Location;
