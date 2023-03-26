const WebSocket = require("ws");

const wss = new WebSocket.Server({ port: 8082 });

wss.on("connection", (ws) => {
  console.log("new client connected");
  ws.on("close", () => {
    console.log("client has disconnected!");
  });
});

function setAPIroute(input) {
  console.log("input got ", input, input.value);
  let api = "/api/exercise/log?userId=" + input.value;
  //document.queryselector(".getLog").setAttribute("action", api);
}
