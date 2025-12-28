const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const statusElement = document.getElementById("turnStatus");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;
let opponentConnected = false;

/* ------------------ RENDER BOARD ------------------ */
const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, r) => {
    row.forEach((square, c) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (r + c) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = r;
      squareElement.dataset.col = c;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable =
          opponentConnected && playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (!pieceElement.draggable) return;
          draggedPiece = pieceElement;
          sourceSquare = { row: r, col: c };
          e.dataTransfer.setData("text/plain", "");
        });

        pieceElement.addEventListener("dragend", () => {
          draggedPiece = null;
          sourceSquare = null;
        });

        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", (e) => e.preventDefault());

      squareElement.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!draggedPiece || !sourceSquare) return;

        const target = {
          row: parseInt(squareElement.dataset.row),
          col: parseInt(squareElement.dataset.col),
        };

        handleMove(sourceSquare, target);
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") boardElement.classList.add("flipped");
  else boardElement.classList.remove("flipped");
};

/* ------------------ MOVE ------------------ */
const handleMove = (source, target) => {
  if (!opponentConnected) return;

  const move = {
    from: `${String.fromCharCode(97 + source.col)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.col)}${8 - target.row}`,
    promotion: "q",
  };

  socket.emit("move", move);
};

/* ------------------ PIECES ------------------ */
const getPieceUnicode = (piece) => {
  const pieces = {
    p: "♟",
    r: "♜",
    n: "♞",
    b: "♝",
    q: "♛",
    k: "♚",
    P: "♙",
    R: "♖",
    N: "♘",
    B: "♗",
    Q: "♕",
    K: "♔",
  };
  return pieces[piece.type] || "";
};

/* ------------------ SOCKET EVENTS ------------------ */
socket.on("playerRole", (role) => {
  playerRole = role;
});

socket.on("spectatorRole", () => {
  playerRole = null;
  statusElement.innerText = "Spectating";
});

socket.on("waiting", () => {
  opponentConnected = false;
  statusElement.innerText = "Waiting for opponent...";
});

socket.on("connected", () => {
  opponentConnected = true;
  statusElement.innerText = "Opponent connected";
});

socket.on("opponentLeft", () => {
  opponentConnected = false;
  statusElement.innerText = "Opponent disconnected";
});

socket.on("boardState", (fen) => {
  chess.load(fen);

  if (playerRole && opponentConnected) {
    statusElement.innerText =
      chess.turn() === playerRole ? "Your turn" : "Opponent's turn";
  }

  renderBoard();
});

socket.on("invalidMove", () => {
  statusElement.innerText = "Invalid move";
  renderBoard();
});

socket.on("gameOver", ({ result, winner }) => {
  const overlay = document.getElementById("gameOverMessage");
  const title = document.getElementById("gameOverTitle");
  const text = document.getElementById("gameOverResult");

  if (result === "checkmate") {
    title.innerText = "Checkmate!";
    text.innerText = `${winner} wins the game`;
  } else {
    title.innerText = "Game ended";
    text.innerText = "Draw";
  }

  overlay.classList.remove("hidden");
});

/* ------------------ RESTART ------------------ */
function restartGame() {
  socket.emit("restartGame");
  document.getElementById("gameOverMessage").classList.add("hidden");
}

window.restartGame = restartGame;

renderBoard();
