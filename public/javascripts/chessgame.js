const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
const statusElement = document.getElementById("turnStatus");

let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

/* ------------------ RENDER BOARD ------------------ */
const renderBoard = () => {
  const board = chess.board();
  boardElement.innerHTML = "";

  board.forEach((row, rowindex) => {
    row.forEach((square, squareindex) => {
      const squareElement = document.createElement("div");
      squareElement.classList.add(
        "square",
        (rowindex + squareindex) % 2 === 0 ? "light" : "dark"
      );

      squareElement.dataset.row = rowindex;
      squareElement.dataset.column = squareindex;

      if (square) {
        const pieceElement = document.createElement("div");
        pieceElement.classList.add(
          "piece",
          square.color === "w" ? "white" : "black"
        );

        pieceElement.innerText = getPieceUnicode(square);
        pieceElement.draggable = playerRole === square.color;

        pieceElement.addEventListener("dragstart", (e) => {
          if (!pieceElement.draggable) return;
          draggedPiece = pieceElement;
          sourceSquare = { row: rowindex, column: squareindex };
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

        const targetSquare = {
          row: parseInt(squareElement.dataset.row),
          column: parseInt(squareElement.dataset.column),
        };

        handleMove(sourceSquare, targetSquare);
      });

      boardElement.appendChild(squareElement);
    });
  });

  if (playerRole === "b") boardElement.classList.add("flipped");
  else boardElement.classList.remove("flipped");
};

/* ------------------ MOVE HANDLING ------------------ */
const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.column)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.column)}${8 - target.row}`,
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
  renderBoard();
});

socket.on("spectatorRole", () => {
  playerRole = null;
  statusElement.innerText = "Spectating";
  renderBoard();
});

socket.on("waiting", () => {
  statusElement.innerText = "Waiting for opponent...";
});

socket.on("connected", () => {
  statusElement.innerText = "Opponent connected";
});

socket.on("boardState", (fen) => {
  chess.load(fen);

  if (playerRole) {
    statusElement.innerText =
      chess.turn() === playerRole ? "Your turn" : "Opponent's turn";
  }

  renderBoard();
});

socket.on("move", (move) => {
  chess.move(move);
  renderBoard();
});

socket.on("gameOver", ({ result, winner }) => {
  const overlay = document.getElementById("gameOverMessage");
  const title = document.getElementById("gameOverTitle");
  const text = document.getElementById("gameOverResult");

  if (result === "checkmate") {
    title.innerText = "Checkmate!";
    text.innerText = `${winner} wins the game 🎉`;
  } else {
    title.innerText = "Draw!";
    text.innerText = "The game ended in a draw 🤝";
  }

  overlay.classList.remove("hidden");
});

socket.on("gameRestarted", () => {
  statusElement.innerText = "Game restarted";
  renderBoard();
});

/* ------------------ RESTART ------------------ */
function restartGame() {
  socket.emit("restartGame");
  document.getElementById("gameOverMessage").classList.add("hidden");
}

window.restartGame = restartGame;

renderBoard();
