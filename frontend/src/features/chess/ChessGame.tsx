import { useEffect, useRef, useState, Suspense, memo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { Chess } from "chess.js";

import { ChessGameProps, PieceColor, PieceType } from "./types";
import { BoardScene } from "./components/ChessBoard";
import { CameraSetup, RealisticEarth, SceneReady } from "./components/ChessSceneExtras";

const moveSound = new Audio("/assets/sounds/move.mp3");
const captureSound = new Audio("/assets/sounds/capture.mp3");
const checkSound = new Audio("/assets/sounds/check.mp3");

const playSound = (type: "move" | "capture" | "check") => {
  switch (type) {
    case "move":
      moveSound.play().catch(() => {});
      break;
    case "capture":
      captureSound.play().catch(() => {});
      break;
    case "check":
      checkSound.play().catch(() => {});
      break;
  }
};

export const ChessGame = memo(function ChessGame({
  onMove,
  peerMove,
  onClose,
  isWhite,
  localStream,
  remoteStream,
}: ChessGameProps) {
  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [validMoves, setValidMoves] = useState<string[]>([]);
  const [error] = useState<string | null>(null);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [isTimerEnabled, setIsTimerEnabled] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [materialType, setMaterialType] = useState("glass");
  const [isLoading, setIsLoading] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [cameraPreset, setCameraPreset] = useState<"player" | "top" | "cinematic">("player");
  const [roundHistory, setRoundHistory] = useState<{ result: "win" | "loss" | "draw"; moves: number }[]>([]);
  const [showGameOver, setShowGameOver] = useState(false);
  const [gameOverMsg, setGameOverMsg] = useState({ title: "", sub: "", icon: "" });
  const gameOverHandled = useRef(false);
  const localCamRef = useRef<HTMLVideoElement>(null);
  const remoteCamRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!isTimerEnabled || game.isGameOver() || whiteTime === 0 || blackTime === 0) return;

    const timer = setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime((prev) => Math.max(0, prev - 1));
      } else {
        setBlackTime((prev) => Math.max(0, prev - 1));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [blackTime, game, isTimerEnabled, whiteTime]);

  useEffect(() => {
    if (gameOverHandled.current) return;
    const totalMoves = game.history().length;

    if (game.isCheckmate()) {
      gameOverHandled.current = true;
      const loserTurn = game.turn();
      const iWin = loserTurn !== (isWhite ? "w" : "b");
      setRoundHistory((prev) => [...prev, { result: iWin ? "win" : "loss", moves: totalMoves }]);
      setGameOverMsg({
        title: iWin ? "You won!" : "You lost!",
        sub: `Checkmate in ${totalMoves} moves`,
        icon: iWin ? "Q" : "K",
      });
      setShowGameOver(true);
    } else if (game.isDraw()) {
      gameOverHandled.current = true;
      setRoundHistory((prev) => [...prev, { result: "draw", moves: totalMoves }]);
      setGameOverMsg({
        title: "Draw!",
        sub: `Game ended in a draw after ${totalMoves} moves`,
        icon: "=",
      });
      setShowGameOver(true);
    }
  }, [game, isWhite]);

  useEffect(() => {
    if (gameOverHandled.current || !isTimerEnabled) return;
    if (whiteTime === 0 || blackTime === 0) {
      gameOverHandled.current = true;
      const whiteTimedOut = whiteTime === 0;
      const iWin = (isWhite && !whiteTimedOut) || (!isWhite && whiteTimedOut);
      const totalMoves = game.history().length;
      setRoundHistory((prev) => [...prev, { result: iWin ? "win" : "loss", moves: totalMoves }]);
      setGameOverMsg({
        title: iWin ? "You won!" : "You lost!",
        sub: "Time is up",
        icon: iWin ? "Q" : "K",
      });
      setShowGameOver(true);
    }
  }, [blackTime, game, isTimerEnabled, isWhite, whiteTime]);

  const startNewRound = () => {
    setGame(new Chess());
    setSelectedSquare(null);
    setValidMoves([]);
    setLastMove(null);
    setMoveHistory([]);
    setWhiteTime(600);
    setBlackTime(600);
    setShowGameOver(false);
    gameOverHandled.current = false;
  };

  const wins = roundHistory.filter((r) => r.result === "win").length;
  const losses = roundHistory.filter((r) => r.result === "loss").length;
  const draws = roundHistory.filter((r) => r.result === "draw").length;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const getCapturedPieces = () => {
    const board = game.board();
    const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    const currentWhite: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
    const currentBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

    board.forEach((row) => {
      row.forEach((piece) => {
        if (!piece) return;
        if (piece.color === "w" && currentWhite[piece.type] !== undefined) currentWhite[piece.type]++;
        if (piece.color === "b" && currentBlack[piece.type] !== undefined) currentBlack[piece.type]++;
      });
    });

    const whiteCaptured: string[] = [];
    const blackCaptured: string[] = [];
    const whiteSymbols: Record<string, string> = { p: "P", n: "N", b: "B", r: "R", q: "Q" };
    const blackSymbols: Record<string, string> = { p: "p", n: "n", b: "b", r: "r", q: "q" };

    for (const [type, initial] of Object.entries(initialCounts)) {
      for (let i = 0; i < initial - currentBlack[type]; i++) whiteCaptured.push(blackSymbols[type]);
      for (let i = 0; i < initial - currentWhite[type]; i++) blackCaptured.push(whiteSymbols[type]);
    }

    return { whiteCaptured, blackCaptured };
  };

  const { whiteCaptured, blackCaptured } = getCapturedPieces();

  useEffect(() => {
    if (localCamRef.current && localStream) {
      localCamRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteCamRef.current && remoteStream) {
      remoteCamRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  useEffect(() => {
    if (!peerMove) return;
    try {
      const newGame = new Chess(game.fen());
      const pieceAtDest = newGame.get(peerMove.to as never);
      const isCapture = !!pieceAtDest;

      newGame.move(peerMove);
      setGame(newGame);
      setSelectedSquare(null);
      setValidMoves([]);
      setLastMove({ from: peerMove.from, to: peerMove.to });
      setMoveHistory(newGame.history());

      if (newGame.isCheck() || newGame.isCheckmate()) {
        playSound("check");
      } else if (isCapture) {
        playSound("capture");
      } else {
        playSound("move");
      }
    } catch (errorValue) {
      console.warn("Invalid peer move", errorValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [peerMove]);

  const handleSquareClick = (square: string, piece: { type: PieceType; color: PieceColor } | null) => {
    if (game.isGameOver() || (isTimerEnabled && (whiteTime === 0 || blackTime === 0))) return;

    const isCurrentTurn = piece ? piece.color === game.turn() : false;

    if (!selectedSquare) {
      if (isCurrentTurn) {
        setSelectedSquare(square);
        const moves = game.moves({ square: square as never, verbose: true });
        setValidMoves(moves.map((move) => move.to));
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      setValidMoves([]);
      return;
    }

    if (isCurrentTurn) {
      setSelectedSquare(square);
      const moves = game.moves({ square: square as never, verbose: true });
      setValidMoves(moves.map((move) => move.to));
      return;
    }

    try {
      const moveObj = { from: selectedSquare, to: square, promotion: "q" as const };
      const newGame = new Chess(game.fen());
      const pieceAtDest = newGame.get(square as never);
      const isCapture = !!pieceAtDest;

      newGame.move(moveObj);
      setGame(newGame);
      setSelectedSquare(null);
      setValidMoves([]);
      setLastMove({ from: selectedSquare, to: square });
      setMoveHistory(newGame.history());
      onMove(moveObj);

      if (newGame.isCheck() || newGame.isCheckmate()) {
        playSound("check");
      } else if (isCapture) {
        playSound("capture");
      } else {
        playSound("move");
      }
    } catch {
      setSelectedSquare(null);
      setValidMoves([]);
    }
  };

  let statusText = "";
  let statusColor = "#10b981";

  if (isTimerEnabled && (whiteTime === 0 || blackTime === 0)) {
    statusText = "Time is up!";
    statusColor = "#ef4444";
  } else if (game.isCheckmate()) {
    statusText = game.turn() === (isWhite ? "w" : "b") ? "Checkmate! You lost" : "Checkmate! You won!";
    statusColor = game.turn() === (isWhite ? "w" : "b") ? "#ef4444" : "#10b981";
  } else if (game.isDraw()) {
    statusText = "Draw!";
    statusColor = "#f59e0b";
  } else if (game.isCheck()) {
    statusText = "Check!";
    statusColor = "#ef4444";
  } else if (game.turn() === (isWhite ? "w" : "b")) {
    statusText = "Your turn";
    statusColor = "#10b981";
  } else {
    statusText = "Opponent turn...";
    statusColor = "#f59e0b";
  }

  const handleSceneReady = () => {
    setFadeOut(true);
    setTimeout(() => setIsLoading(false), 600);
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {isLoading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 10000,
            background: "linear-gradient(135deg, #050510 0%, #0d0d2b 50%, #050510 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 0.6s ease-out",
            opacity: fadeOut ? 0 : 1,
            pointerEvents: fadeOut ? "none" : "all",
          }}
        >
          <div
            style={{
              fontSize: 72,
              marginBottom: 24,
              animation: "chess-spin 2s ease-in-out infinite",
              filter: "drop-shadow(0 0 20px rgba(99,102,241,0.6))",
            }}
          >
            Q
          </div>

          <h2
            style={{
              color: "#fff",
              margin: "0 0 8px",
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: 1,
              fontFamily: "sans-serif",
            }}
          >
            Loading game...
          </h2>

          <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 32px", fontSize: 14 }}>
            Preparing the 3D board and space environment
          </p>

          <div
            style={{
              width: 240,
              height: 4,
              borderRadius: 4,
              background: "rgba(255,255,255,0.1)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: 4,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)",
                animation: "loading-bar 1.5s ease-in-out infinite",
              }}
            />
          </div>

          <style>{`
            @keyframes chess-spin {
              0% { transform: rotateY(0deg) scale(1); }
              50% { transform: rotateY(180deg) scale(1.1); }
              100% { transform: rotateY(360deg) scale(1); }
            }
            @keyframes loading-bar {
              0% { width: 5%; margin-left: 0; }
              50% { width: 60%; margin-left: 20%; }
              100% { width: 5%; margin-left: 95%; }
            }
          `}</style>
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "12px 24px",
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <h2 style={{ color: "#fff", margin: 0, fontSize: 20, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 28 }}>CH</span> 3D Chess
        </h2>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              padding: "6px 16px",
              borderRadius: 20,
              background: `${statusColor}22`,
              border: `1px solid ${statusColor}44`,
              color: statusColor,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "sans-serif",
            }}
          >
            {statusText}
          </div>

          {roundHistory.length > 0 && (
            <div
              style={{
                padding: "4px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                fontSize: 13,
                display: "flex",
                gap: 8,
                fontFamily: "monospace",
              }}
            >
              <span style={{ color: "#10b981" }}>{wins}W</span>
              <span style={{ color: "#ef4444" }}>{losses}L</span>
              <span style={{ color: "#f59e0b" }}>{draws}D</span>
            </div>
          )}

          <div
            style={{
              padding: "4px 12px",
              borderRadius: 12,
              background: "rgba(255,255,255,0.06)",
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
            }}
          >
            You: <strong style={{ color: isWhite ? "#fff" : "#888" }}>{isWhite ? "White" : "Black"}</strong>
          </div>

          <button
            onClick={() => setIsTimerEnabled(!isTimerEnabled)}
            style={{
              padding: "4px 12px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: isTimerEnabled ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.06)",
              color: isTimerEnabled ? "#10b981" : "rgba(255,255,255,0.6)",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 6,
              transition: "all 0.2s ease",
            }}
          >
            Clock {isTimerEnabled ? "Enabled" : "Disabled"}
          </button>

          <div style={{ display: "flex", gap: 6 }}>
            {["glass", "wood", "marble"].map((material) => (
              <button
                key={material}
                onClick={() => setMaterialType(material)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: materialType === material ? "#4f46e5" : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 12,
                  transition: "0.2s",
                }}
              >
                {material === "glass" ? "Glass" : material === "wood" ? "Wood" : "Marble"}
              </button>
            ))}
          </div>

          <button
            onClick={startNewRound}
            style={{
              padding: "4px 12px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: "rgba(16,185,129,0.15)",
              color: "#10b981",
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              gap: 4,
              transition: "0.2s",
            }}
          >
            New round
          </button>

          <div style={{ display: "flex", gap: 4 }}>
            {([["player", "P"], ["top", "T"], ["cinematic", "C"]] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setCameraPreset(key)}
                style={{
                  padding: "4px 8px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  background: cameraPreset === key ? "#6366f1" : "rgba(255,255,255,0.1)",
                  color: "#fff",
                  fontSize: 13,
                  transition: "0.2s",
                }}
                title={key === "player" ? "Player view" : key === "top" ? "Top view" : "Cinematic"}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 10,
            color: "#ef4444",
            width: 38,
            height: 38,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.2s",
          }}
        >
          X
        </button>
      </div>

      {showGameOver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10001,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "linear-gradient(145deg, #1a1a3e, #0a0a1a)",
              border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: 24,
              padding: "40px 50px",
              textAlign: "center",
              boxShadow: "0 25px 80px rgba(0,0,0,0.8)",
              animation: "popIn 0.4s ease-out",
            }}
          >
            <div style={{ fontSize: 64, marginBottom: 12 }}>{gameOverMsg.icon}</div>
            <h2 style={{ color: "#fff", fontSize: 28, margin: "0 0 8px", fontWeight: 800 }}>{gameOverMsg.title}</h2>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, margin: "0 0 28px" }}>{gameOverMsg.sub}</p>

            {roundHistory.length > 0 && (
              <div style={{ marginBottom: 24, maxHeight: 150, overflowY: "auto" }}>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginBottom: 8 }}>Round history</div>
                {roundHistory.map((round, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "6px 16px",
                      borderRadius: 8,
                      marginBottom: 4,
                      background: "rgba(255,255,255,0.04)",
                      fontSize: 14,
                      color: "#ccc",
                    }}
                  >
                    <span>Round {index + 1}</span>
                    <span
                      style={{
                        color: round.result === "win" ? "#10b981" : round.result === "loss" ? "#ef4444" : "#f59e0b",
                        fontWeight: 700,
                      }}
                    >
                      {round.result === "win" ? "Win" : round.result === "loss" ? "Loss" : "Draw"}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{round.moves} moves</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                onClick={startNewRound}
                style={{
                  padding: "12px 28px",
                  borderRadius: 14,
                  border: "none",
                  cursor: "pointer",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  boxShadow: "0 4px 20px rgba(99,102,241,0.4)",
                  transition: "0.2s",
                }}
              >
                New round
              </button>
              <button
                onClick={() => setShowGameOver(false)}
                style={{
                  padding: "12px 28px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.15)",
                  cursor: "pointer",
                  background: "transparent",
                  color: "rgba(255,255,255,0.6)",
                  fontSize: 16,
                  transition: "0.2s",
                }}
              >
                Close
              </button>
            </div>
          </div>
          <style>{`
            @keyframes popIn {
              0% { transform: scale(0.8); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
          `}</style>
        </div>
      )}

      <div style={{ flex: 1, position: "relative" }}>
        {error && (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%,-50%)",
              color: "#ef4444",
              background: "rgba(0,0,0,0.8)",
              padding: 20,
              borderRadius: 12,
              zIndex: 10,
            }}
          >
            Error: {error}
          </div>
        )}

        <Canvas gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }} dpr={[1, 1.5]} performance={{ min: 0.5 }}>
          <CameraSetup preset={cameraPreset} />
          <SceneReady onReady={handleSceneReady} />

          <Suspense fallback={null}>
            <color attach="background" args={["#050510"]} />
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
            <RealisticEarth />
            <ambientLight intensity={0.5} color="#b0c4de" />
            <directionalLight position={[8, 12, 8]} intensity={1.8} color="#ffffff" />
            <directionalLight position={[-5, 8, -5]} intensity={0.4} color="#6366f1" />
            <pointLight position={[0, 6, 0]} intensity={0.6} color="#f59e0b" distance={20} />

            <BoardScene
              game={game}
              selectedSquare={selectedSquare}
              validMoves={validMoves}
              onSquareClick={handleSquareClick}
              isWhiteView={isWhite}
              lastMove={lastMove}
              materialType={materialType}
              isCheck={game.isCheck() || game.isCheckmate()}
            />
          </Suspense>

          <OrbitControls minPolarAngle={0.3} maxPolarAngle={Math.PI / 2.3} minDistance={5} maxDistance={18} enablePan={false} target={[0, 0, 0]} />
        </Canvas>

        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "2px solid rgba(239,68,68,0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(239,68,68,0.15)",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)",
              position: "relative",
            }}
          >
            <video ref={remoteCamRef} autoPlay playsInline style={{ width: 200, height: 130, objectFit: "cover", display: "block" }} />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "5px 12px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13, color: "#f87171", fontWeight: 700 }}>{isWhite ? "Black" : "White"} Opponent</span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(10px)",
              padding: "8px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 100,
            }}
          >
            {isTimerEnabled && (
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#fff", fontFamily: "monospace", textAlign: "center" }}>
                {formatTime(isWhite ? blackTime : whiteTime)}
              </div>
            )}
            <div style={{ fontSize: 16, color: "#fff", display: "flex", flexWrap: "wrap", gap: 2 }}>
              {(isWhite ? blackCaptured : whiteCaptured).map((piece, index) => (
                <span key={index}>{piece}</span>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
            display: "flex",
            gap: 12,
            alignItems: "flex-end",
          }}
        >
          <div
            style={{
              borderRadius: 16,
              overflow: "hidden",
              border: "2px solid rgba(99,102,241,0.4)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.15)",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(10px)",
              position: "relative",
            }}
          >
            <video
              ref={localCamRef}
              autoPlay
              playsInline
              muted
              style={{ width: 200, height: 130, objectFit: "cover", display: "block", transform: "scaleX(-1)" }}
            />
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                padding: "5px 12px",
                background: "linear-gradient(transparent, rgba(0,0,0,0.85))",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13, color: "#818cf8", fontWeight: 700 }}>{isWhite ? "White" : "Black"} You</span>
            </div>
          </div>

          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(10px)",
              padding: "8px 16px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              minWidth: 100,
            }}
          >
            {isTimerEnabled && (
              <div style={{ fontSize: 24, fontWeight: "bold", color: "#fff", fontFamily: "monospace", textAlign: "center" }}>
                {formatTime(isWhite ? whiteTime : blackTime)}
              </div>
            )}
            <div style={{ fontSize: 16, color: "#fff", display: "flex", flexWrap: "wrap", gap: 2 }}>
              {(isWhite ? whiteCaptured : blackCaptured).map((piece, index) => (
                <span key={index}>{piece}</span>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            right: 24,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 10,
            width: 150,
            maxHeight: "75%",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {roundHistory.length > 0 && (
            <div
              style={{
                background: "rgba(0,0,0,0.6)",
                backdropFilter: "blur(10px)",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "8px 10px",
                  background: "rgba(255,255,255,0.05)",
                  textAlign: "center",
                  fontWeight: "bold",
                  color: "#fff",
                  fontSize: 13,
                  borderBottom: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Round history
              </div>
              <div style={{ padding: "8px", maxHeight: 120, overflowY: "auto" }}>
                {roundHistory.map((round, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "4px 8px",
                      borderRadius: 6,
                      marginBottom: 3,
                      background: "rgba(255,255,255,0.03)",
                      fontSize: 12,
                      color: "#ccc",
                    }}
                  >
                    <span style={{ color: "#888" }}>R{index + 1}</span>
                    <span
                      style={{
                        color: round.result === "win" ? "#10b981" : round.result === "loss" ? "#ef4444" : "#f59e0b",
                        fontWeight: 700,
                        fontSize: 13,
                      }}
                    >
                      {round.result === "win" ? "Win" : round.result === "loss" ? "Loss" : "Draw"}
                    </span>
                    <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>{round.moves}</span>
                  </div>
                ))}
              </div>
              <div
                style={{
                  padding: "6px 10px",
                  borderTop: "1px solid rgba(255,255,255,0.08)",
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "monospace",
                }}
              >
                <span style={{ color: "#10b981" }}>{wins}W</span>
                <span style={{ color: "#ef4444" }}>{losses}L</span>
                <span style={{ color: "#f59e0b" }}>{draws}D</span>
              </div>
            </div>
          )}

          <div
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(10px)",
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,0.1)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              flex: 1,
              minHeight: 0,
            }}
          >
            <div
              style={{
                padding: "8px 10px",
                background: "rgba(255,255,255,0.05)",
                textAlign: "center",
                fontWeight: "bold",
                color: "#fff",
                fontSize: 13,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              Move history
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "8px", display: "flex", flexDirection: "column", gap: 3 }}>
              {moveHistory
                .reduce((result: string[][], move, index) => {
                  if (index % 2 === 0) {
                    result.push([move]);
                  } else {
                    result[result.length - 1].push(move);
                  }
                  return result;
                }, [])
                .map((pair, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      color: "#ccc",
                      fontSize: 12,
                      padding: "3px 4px",
                      background: index % 2 === 0 ? "rgba(255,255,255,0.02)" : "transparent",
                      borderRadius: 4,
                    }}
                  >
                    <span style={{ color: "#6366f1", width: 20 }}>{index + 1}.</span>
                    <span style={{ width: 42 }}>{pair[0]}</span>
                    <span style={{ width: 42 }}>{pair[1] || ""}</span>
                  </div>
                ))}
              <div ref={(element) => element?.scrollIntoView({ behavior: "smooth" })} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default ChessGame;
