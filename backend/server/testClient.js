const net = require("net");

const client = net.createConnection({ port: 9000 }, () => {
  console.log("Connected to server");

  const msg = {
    type: "REGISTER",
    name: "aaa",
    email: "aaa_test@gmail.com",
    phone: "0999999999",
    password: "1234"
  };

  client.write(JSON.stringify(msg) + "\n");
});

client.on("data", (data) => {
  console.log("Response:", data.toString());
  client.end();
});

client.on("error", (err) => {
  console.error("Error:", err.message);
});
