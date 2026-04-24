import "./cssLocation.css";
import bg from "./assets/image/background.png";
import logo from "./assets/image/logo.png";

function Location({ goNext, goChat }) {
  const handleSelect = (destCode) => {
    localStorage.setItem("dest", destCode);
    goNext();
  };

  return (
    <div
      className="app"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <img src={logo} className="location-logo" />

      <div className="content location">
        <h2>choose your destination</h2>
        <h3>from : thammasat van terminal</h3>

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

      <button className="location-chat-btn" onClick={goChat}>
        chat with admin
      </button>
    </div>
  );
}

export default Location;