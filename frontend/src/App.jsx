import { useEffect, useState } from "react";
import Signin from "./Signin";
import Signup from "./Signup";
import Location from "./Location";
import Time from "./Time";
import Seat from "./Seat";
// import Payment from "./Payment";
// import Success from "./Success";

function App() {
  const [page, setPage] = useState("signin");

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

    signin: (
    <Signin
      goNext={() => goTo("location")}
      goSignup={() => goTo("signup")}  // login สำเร็จ → ไปหน้า Location
      />
    ),

    signup: (
    <Signup
      goNext={() => goTo("signin")}   // Signup สำเร็จ → ไปหน้า Signin
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
