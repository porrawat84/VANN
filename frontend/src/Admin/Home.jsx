import "./Home.css";
import logo from "./assets/image/logo.png";
import BottomNav from "./BottomNav";

function Location({ goPage}) {
    const handleSelect = (destCode) => {
        localStorage.setItem("dest", destCode);
        goPage("adminLocation");
    };

    return (
        <div className="app" >
            <img src={logo} className="location-logo" />

            <div className="content location">

                <button className="btn location" onClick={() => handleSelect("FP")}>
                    Future Park Rangsit
                </button>

                <button className="btn location" onClick={() => handleSelect("MC")}>
                    Mo Chit
                </button>

                <button className="btn location" onClick={() => handleSelect("VM")}>
                    Victory Monument
                </button>
            </div>
            <div><BottomNav goPage={goPage} /></div>
        </div>
    );
}

export default Location;
