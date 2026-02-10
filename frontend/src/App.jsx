import { useState } from "react";
import Location from "./Location";
import Time from "./Time";

function App() {
  const [page, setPage] = useState("location");

  if (page === "time") {
    return <Time goBack={() => setPage("location")} />;
  }

  return <Location goNext={() => setPage("time")} />;
}

export default App;


