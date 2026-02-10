import { useEffect, useState } from "react";
import Location from "./Location";
import Time from "./Time";

function App() {
  const [page, setPage] = useState("location");

  useEffect(() => {
    if (!window.tcp) return;
    window.tcp.onMessage((msg) => console.log("FROM TCP:", msg));
    window.tcp.send({ type: "LIST_SEATS", tripId: "T1" });
  }, []);

  if (page === "time") {
    return <Time goBack={() => setPage("location")} />;
  }

  return <Location goNext={() => setPage("time")} />;
}

export default App;


