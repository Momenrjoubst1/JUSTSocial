import { memo, useCallback, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import * as THREE from "three";
import type { Chess } from "chess.js";
import type { PieceColor, PieceType } from "../types";
import { PieceMesh } from "./ChessPiece";

export const Square = memo(function Square({
  squareId: _squareId,
  piece,
  isDark,
  isSelected,
  isValidMove,
  isHighlight,
  posX,
  posZ,
  onClick,
  materialType,
  isKingInCheck,
}: {
  squareId: string;
  piece: { type: PieceType; color: PieceColor } | null;
  isDark: boolean;
  isSelected: boolean;
  isValidMove: boolean;
  isHighlight: boolean;
  posX: number;
  posZ: number;
  onClick: () => void;
  materialType: string;
  isKingInCheck: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const pieceGroupRef = useRef<THREE.Group>(null!);

  const squareColor = useMemo(() => {
    if (isSelected) return "#4f46e5";
    if (isHighlight) return "#fcd34d";
    if (isValidMove) return hovered ? "#22d3ee" : "#0891b2";
    if (hovered) return isDark ? "#2a2a2a" : "#ffffff";
    return isDark ? "#1a1a1a" : "#f0f0f0";
  }, [hovered, isDark, isHighlight, isSelected, isValidMove]);

  useFrame(() => {
    if (!pieceGroupRef.current) return;
    const target = isSelected ? 0.25 : 0.05;
    pieceGroupRef.current.position.y += (target - pieceGroupRef.current.position.y) * 0.2;
  });

  const handlePointerOver = useCallback(() => setHovered(true), []);
  const handlePointerOut = useCallback(() => setHovered(false), []);
  const handleClick = useCallback((e: React.MouseEvent | THREE.Event) => {
    if ("stopPropagation" in e) e.stopPropagation();
    onClick();
  }, [onClick]);

  return (
    <group position={[posX, 0, posZ]}>
      <mesh onClick={handleClick} onPointerOver={handlePointerOver} onPointerOut={handlePointerOut}>
        <boxGeometry args={[1, 0.1, 1]} />
        <meshStandardMaterial color={squareColor} roughness={0.6} />
      </mesh>

      {isValidMove && !piece && (
        <mesh position={[0, 0.08, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
          <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} transparent opacity={0.8} />
        </mesh>
      )}

      {piece && (
        <group ref={pieceGroupRef} position={[0, 0.05, 0]}>
          {isKingInCheck && (
            <mesh position={[0, 0, 0]}>
              <sphereGeometry args={[0.6, 12, 12]} />
              <meshBasicMaterial color="#ef4444" transparent opacity={0.4} />
            </mesh>
          )}
          <PieceMesh type={piece.type} color={piece.color} materialType={materialType} />
        </group>
      )}
    </group>
  );
});

export function BoardScene({
  game,
  selectedSquare,
  validMoves,
  onSquareClick,
  isWhiteView,
  lastMove,
  materialType,
  isCheck,
}: {
  game: Chess;
  selectedSquare: string | null;
  validMoves: string[];
  onSquareClick: (sq: string, piece: { type: PieceType; color: PieceColor } | null) => void;
  isWhiteView: boolean;
  lastMove?: { from: string; to: string } | null;
  materialType?: string;
  isCheck?: boolean;
}) {
  const board = game.board();

  return (
    <group rotation={[0, isWhiteView ? 0 : Math.PI, 0]}>
      <mesh position={[0, -0.15, 0]}>
        <boxGeometry args={[9.5, 0.3, 9.5]} />
        <meshPhysicalMaterial color="#0a0a0a" roughness={0.05} metalness={1} reflectivity={1} />
      </mesh>

      <mesh position={[0, -0.04, 0]}>
        <boxGeometry args={[8.8, 0.1, 8.8]} />
        <meshStandardMaterial color="#222" />
      </mesh>

      {["a", "b", "c", "d", "e", "f", "g", "h"].map((letter, i) => (
        <group key={`file-${letter}`}>
          <Text position={[i - 3.5, 0.02, 4.25]} rotation={[-Math.PI / 2, 0, 0]} fontSize={0.25} color="#ffffff">
            {letter}
          </Text>
          <Text position={[i - 3.5, 0.02, -4.25]} rotation={[-Math.PI / 2, 0, Math.PI]} fontSize={0.25} color="#ffffff">
            {letter}
          </Text>
        </group>
      ))}

      {[1, 2, 3, 4, 5, 6, 7, 8].map((rank, i) => (
        <group key={`rank-${rank}`}>
          <Text position={[-4.25, 0.02, 3.5 - i]} rotation={[-Math.PI / 2, 0, Math.PI / 2]} fontSize={0.25} color="#ffffff">
            {rank}
          </Text>
          <Text position={[4.25, 0.02, 3.5 - i]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} fontSize={0.25} color="#ffffff">
            {rank}
          </Text>
        </group>
      ))}

      {board.map((row, i) =>
        row.map((piece, j) => {
          const file = String.fromCharCode(97 + j);
          const rank = 8 - i;
          const squareId = `${file}${rank}`;
          const isDark = (i + j) % 2 === 1;
          const isSelected = selectedSquare === squareId;
          const isValidMove = validMoves.includes(squareId);
          const isHighlight = lastMove?.from === squareId || lastMove?.to === squareId;
          const isKingInCheck = isCheck && piece?.type === "k" && piece?.color === game.turn();

          return (
            <Square
              key={squareId}
              squareId={squareId}
              piece={piece}
              isDark={isDark}
              isSelected={isSelected}
              isValidMove={isValidMove}
              isHighlight={!!isHighlight}
              posX={j - 3.5}
              posZ={i - 3.5}
              onClick={() => onSquareClick(squareId, piece)}
              materialType={materialType || "glass"}
              isKingInCheck={!!isKingInCheck}
            />
          );
        }),
      )}
    </group>
  );
}
