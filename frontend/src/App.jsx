import { useEffect, useState } from "react";
import Location from "./Location.jsx";
import Time from "./Time.css";
import Seat from "./Seat.jsx";
// import Payment from "./Payment";
// import Success from "./Success";

function App() {
  const [page, setPage] = useState("location");

  useEffect(() => {
    if (!window.tcp) return;

    window.tcp.onMessage((msg) => {
      console.log("FROM TCP:", msg);
    });

    window.tcp.send({ type: "LIST_SEATS", tripId: "T1" });
  }, []);

  const goTo = (nextPage) => {
    setPage(nextPage);
  };

  const pages = {
    location: (
      <Location
        goNext={() => goTo("time")}
      />
    ),

    time: (
      <Time
        goBack={() => goTo("location")}
        goNext={() => goTo("seat")}
      />
    ),

    seat: (
      <Seat
        goBack={() => goTo("time")}
        goNext={() => goTo("payment")}
      />
    ),

    // payment: (
    //   <Payment
    //     goBack={() => goTo("seat")}
    //     goNext={() => goTo("success")}
    //   />
    // ),

    // success: <Success />
  };

  return pages[page] || <div>Page not found</div>;
}

export default App;
