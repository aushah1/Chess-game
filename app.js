const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const chess = new Chess();

const port = 3000;

let players = {
  white: null,
  black: null,
};

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

io.on("connection", (socket) => {
  if (!players.white) {
    players.white = socket.id;
    socket.emit("playerRole", "w");
  } else if (!players.black) {
    players.black = socket.id;
    socket.emit("playerRole", "b");
  } else {
    socket.emit("spectatorRole");
  }

  updateConnectionStatus();

  socket.on("move", (move) => {
    if (
      (chess.turn() === "w" && socket.id !== players.white) ||
      (chess.turn() === "b" && socket.id !== players.black)
    ) {
      socket.emit("invalidMove");
      return;
    }

    const result = chess.move(move);

    if (!result) {
      socket.emit("invalidMove");
      return;
    }

    io.emit("boardState", chess.fen());

    if (chess.isCheckmate()) {
      const winner = chess.turn() === "w" ? "Black" : "White";
      io.emit("gameOver", { result: "checkmate", winner });
    }
  });

  socket.on("restartGame", () => {
    chess.reset();
    io.emit("boardState", chess.fen());
  });

  socket.on("disconnect", () => {
    if (socket.id === players.white) players.white = null;
    if (socket.id === players.black) players.black = null;

    io.emit("opponentLeft");
    updateConnectionStatus();
  });
});

function updateConnectionStatus() {
  if (players.white && players.black) {
    io.emit("connected");
    io.emit("boardState", chess.fen()); // 🔥 THIS FIXES THE ISSUE
  } else {
    io.emit("waiting");
  }
}

server.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
