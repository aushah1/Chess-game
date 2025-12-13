const socket = io();
const chess = new Chess();
const boardElement = document.querySelector(".chessboard");
let draggedPiece = null;
let sourceSquare = null;
let playerRole = null;

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
          if (pieceElement.draggable) {
            draggedPiece = pieceElement;
            sourceSquare = { row: rowindex, column: squareindex };
            e.dataTransfer.setData("text/plain", "");
          }
        });

        pieceElement.addEventListener("dragend", (e) => {
          draggedPiece = null;
          sourceSquare = null;
        });
        squareElement.appendChild(pieceElement);
      }

      squareElement.addEventListener("dragover", function (e) {
        e.preventDefault();
      });
      squareElement.addEventListener("drop", function (e) {
        e.preventDefault();
        if (draggedPiece) {
          const targetSource = {
            row: parseInt(squareElement.dataset.row),
            column: parseInt(squareElement.dataset.column),
          };

          handleMove(sourceSquare, targetSource);
        }
      });
      boardElement.appendChild(squareElement);
    });
  });
  if (playerRole === "b") {
    boardElement.classList.add("flipped");
  } else {
    boardElement.classList.remove("flipped");
  }
};
const handleMove = (source, target) => {
  const move = {
    from: `${String.fromCharCode(97 + source.column)}${8 - source.row}`,
    to: `${String.fromCharCode(97 + target.column)}${8 - target.row}`,
    promotion: "q",
  };
  socket.emit("move", move);
};
const getPieceUnicode = (piece) => {
  const unicodePieces = {
    p: "♟", // black pawn
    r: "♜", // black rook
    n: "♞", // black knight
    b: "♝", // black bishop
    q: "♛", // black queen
    k: "♚", // black king

    P: "♙", // white pawn
    R: "♖", // white rook
    N: "♘", // white knight
    B: "♗", // white bishop
    Q: "♕", // white queen
    K: "♔", // white king
  };
  return unicodePieces[piece.type] || "";
};

socket.on("playerRole", function (role) {
  playerRole = role;
  renderBoard();
});
socket.on("spectatorRole", function () {
  playerRole = null;
  renderBoard();
});
socket.on("boardState", function (fen) {
  chess.load(fen);
  renderBoard();
});
socket.on("move", function (move) {
  chess.move(move);
  renderBoard();
});
socket.on("gameOver", ({ result, winner }) => {
  const gameOverMessage = document.getElementById("gameOverMessage");
  const gameOverTitle = document.getElementById("gameOverTitle");
  const gameOverResult = document.getElementById("gameOverResult");

  if (result === "checkmate") {
    gameOverTitle.innerText = "Checkmate!";
    gameOverResult.innerText = `${winner} wins the game 🎉`;
  } else if (result === "stalemate") {
    gameOverTitle.innerText = "Stalemate!";
    gameOverResult.innerText = "The game ended in a draw 🤝";
  } else if (result === "draw") {
    gameOverTitle.innerText = "Draw!";
    gameOverResult.innerText = "The game ended in a draw 🤝";
  }

  gameOverMessage.classList.remove("hidden");
});
socket.on("gameRestarted", () => {
  renderBoard();
});
function restartGame() {
  socket.emit("restartGame");
  document.getElementById("gameOverMessage").classList.add("hidden");
}

// make it available for inline onclick
window.restartGame = restartGame;

renderBoard();
