const express = require("express");
const app = express();
const port = 3000;

const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const server = http.createServer(app);
const io = socket(server);
const chess = new Chess();

let player = {};
let currentPlayer = "w";

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index", { title: "Chess Game" });
});

io.on("connection", (uniquesocket) => {
  console.log("Connected");

  if (!player.white) {
    player.white = uniquesocket.id;
    uniquesocket.emit("playerRole", "w");
  } else if (!player.black) {
    player.black = uniquesocket.id;
    uniquesocket.emit("playerRole", "b");
  } else {
    uniquesocket.emit("spectatorRole");
  }
  uniquesocket.on("disconnect", () => {
    if (uniquesocket.id === player.white) {
      delete player.white;
    } else if (uniquesocket.id === player.black) {
      delete player.black;
    }
  });
  uniquesocket.on("move", (move) => {
    try {
      if (chess.turn() === "w" && uniquesocket.id !== player.white) return;
      if (chess.turn() === "b" && uniquesocket.id !== player.black) return;

      const result = chess.move(move);
      if (result) {
        currentPlayer = chess.turn();
        io.emit("move", move);
        io.emit("boardState", chess.fen());

        if (chess.isCheckmate()) {
          const winner = chess.turn() === "w" ? "Black" : "White";
          io.emit("gameOver", { result: "checkmate", winner });
        }

        // (optional) also handle stalemate/draw
        else if (chess.isStalemate()) {
          io.emit("gameOver", { result: "stalemate", winner: null });
        } else if (chess.isDraw()) {
          io.emit("gameOver", { result: "draw", winner: null });
        }
      } else {
        console.log("Invalid move :", move);
        uniquesocket.emit("invalidMove :", move);
      }
    } catch (err) {
      console.log(err);
      uniquesocket.emit("Invalid move :", move);
    }
  });
  uniquesocket.on("restartGame", () => {
    chess.reset();
    io.emit("boardState", chess.fen());
    io.emit("gameRestarted");
  });
});

server.listen(port, () => {
  console.log(`listening on http://localhost:${port}`);
});
