import "./cssLocation.css";
import bg from "./assets/image/background.png";
import logo from "./assets/image/logo.png";

function Location({ goNext }) {
  const handleSelect = (destCode) => {
    localStorage.setItem("dest", destCode); 
    goNext();
  };

  return (
    <div className="app" style={{ backgroundImage: `url(${bg})` }}>
      <img src={logo} className="location-logo" />

      <div className="content location">
        <h2>choose your destination</h2>
        <h3>from : thammasat van terminal</h3>

        <div className="btn location-group">
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
      </div>
    </div>
  );
}

export default Location;
