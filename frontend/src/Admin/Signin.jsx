import { useState } from "react";
import "./cssSignin.css";
import logo from "./assets/image/logo.png";
import bg from "./assets/image/background.png";


export default function AdminSignin({ goPage }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log("Email:", email);
        console.log("Password:", password);
        // TODO: เชื่อม backend login
        goPage("adminHome");
    };

    return (
        <div className="app" style={{
            backgroundImage: `url(${bg})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat"
        }}>
            <img src={logo} alt="logo" className="logo" />

            <div className="signin-box">

                <form onSubmit={handleSubmit}>
                    <label>email :</label>
                    <input
                        type="email"
                        placeholder=""
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />

                    <label>password :</label>
                    <input
                        type="password"
                        placeholder=""
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    <button type="submit">sign in</button>
                </form>
            </div>
        </div>
    );
}