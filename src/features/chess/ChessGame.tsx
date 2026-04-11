import { useState, useEffect, useRef, Suspense, useMemo, useCallback, memo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Stars, useTexture, useProgress } from '@react-three/drei';
import { Chess } from 'chess.js';
import * as THREE from 'three';

import { ChessMove, ChessGameProps, PieceType, PieceColor } from './types';

/* ─── Assets & Audio ────────────────────────────────────────────── */
const moveSound = new Audio('/assets/sounds/move.mp3');
const captureSound = new Audio('/assets/sounds/capture.mp3');
const checkSound = new Audio('/assets/sounds/check.mp3');

const playSound = (type: 'move' | 'capture' | 'check') => {
    switch (type) {
        case 'move': moveSound.play().catch(() => { }); break;
        case 'capture': captureSound.play().catch(() => { }); break;
        case 'check': checkSound.play().catch(() => { }); break;
    }
};

/* ─── Piece Component (Detailed 3D models) ────────────────────────── */
function PieceMesh({ type, color, materialType }: { type: string; color: 'w' | 'b', materialType: string }) {
    const isW = color === 'w';

    const getMaterial = () => {
        if (materialType === 'glass') {
            const glassProps = { thickness: 0.8, roughness: 0.05, transmission: 0.95, ior: 1.5, chromaticAberration: 0.05, backside: true };
            return isW ? <meshPhysicalMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.05} {...glassProps} />
                : <meshPhysicalMaterial color="#1a1a1a" emissive="#000000" metalness={0.9} roughness={0.02} transmission={0.7} thickness={1.2} ior={1.8} />;
        } else if (materialType === 'wood') {
            return isW ? <meshStandardMaterial color="#d4bd94" roughness={0.8} />
                : <meshStandardMaterial color="#503525" roughness={0.8} />;
        } else if (materialType === 'marble') {
            return isW ? <meshPhysicalMaterial color="#f8f9fa" roughness={0.1} metalness={0.1} clearcoat={1} clearcoatRoughness={0.1} />
                : <meshPhysicalMaterial color="#212529" roughness={0.1} metalness={0.1} clearcoat={1} clearcoatRoughness={0.1} />;
        }
        return <meshStandardMaterial color={isW ? '#ffffff' : '#222222'} />;
    };

    const material = getMaterial();

    // Common Base for all pieces
    const Base = () => (
        <group>
            <mesh position={[0, 0.05, 0]}>
                <cylinderGeometry args={[0.38, 0.42, 0.1, 16]} />
                {material}
            </mesh>
            <mesh position={[0, 0.15, 0]}>
                <cylinderGeometry args={[0.32, 0.38, 0.1, 16]} />
                {material}
            </mesh>
        </group>
    );

    switch (type) {
        case 'p': // Pawn
            return (
                <group>
                    <Base />
                    <mesh position={[0, 0.5, 0]}>
                        <cylinderGeometry args={[0.1, 0.25, 0.6, 20]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 0.8, 0]}>
                        <cylinderGeometry args={[0.22, 0.22, 0.05, 20]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 1.0, 0]}>
                        <sphereGeometry args={[0.2, 20, 20]} />
                        {material}
                    </mesh>
                </group>
            );
        case 'r': // Rook
            return (
                <group>
                    <Base />
                    <mesh position={[0, 0.55, 0]}>
                        <cylinderGeometry args={[0.25, 0.3, 0.7, 24]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 0.95, 0]}>
                        <cylinderGeometry args={[0.32, 0.32, 0.15, 24]} />
                        {material}
                    </mesh>
                    {/* Crenels (teeth) */}
                    {[0, 90, 180, 270].map((angle) => (
                        <mesh
                            key={angle}
                            position={[
                                0.22 * Math.cos((angle * Math.PI) / 180),
                                1.1,
                                0.22 * Math.sin((angle * Math.PI) / 180)
                            ]}
                        >
                            <boxGeometry args={[0.12, 0.15, 0.12]} />
                            {material}
                        </mesh>
                    ))}
                </group>
            );
        case 'n': // Knight
            return (
                <group>
                    <Base />
                    <mesh position={[0, 0.4, 0]}>
                        <cylinderGeometry args={[0.2, 0.3, 0.5, 20]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 0.8, 0.1]} rotation={[-0.4, 0, 0]}>
                        <boxGeometry args={[0.28, 0.7, 0.45]} />
                        {material}
                    </mesh>
                    {/* Snout */}
                    <mesh position={[0, 1.0, 0.35]} rotation={[0.2, 0, 0]}>
                        <boxGeometry args={[0.22, 0.25, 0.4]} />
                        {material}
                    </mesh>
                    {/* Ears */}
                    <mesh position={[0.1, 1.2, -0.05]}>
                        <boxGeometry args={[0.08, 0.2, 0.08]} />
                        {material}
                    </mesh>
                    <mesh position={[-0.1, 1.2, -0.05]}>
                        <boxGeometry args={[0.08, 0.2, 0.08]} />
                        {material}
                    </mesh>
                </group>
            );
        case 'b': // Bishop
            return (
                <group>
                    <Base />
                    <mesh position={[0, 0.6, 0]}>
                        <cylinderGeometry args={[0.1, 0.25, 0.8, 20]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 1.1, 0]} scale={[0.9, 1.3, 0.9]}>
                        <sphereGeometry args={[0.25, 20, 20]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 1.45, 0]}>
                        <sphereGeometry args={[0.06, 12, 12]} />
                        {material}
                    </mesh>
                    {/* The Clasp/Slit detail */}
                    <mesh position={[0, 1.15, 0.18]} rotation={[0.5, 0, 0]}>
                        <boxGeometry args={[0.3, 0.05, 0.1]} />
                        <meshStandardMaterial color={isW ? "#ccc" : "#333"} />
                    </mesh>
                </group>
            );
        case 'q': // Queen
            return (
                <group>
                    <Base />
                    <mesh position={[0, 0.7, 0]}>
                        <cylinderGeometry args={[0.12, 0.28, 1.1, 24]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 1.3, 0]}>
                        <sphereGeometry args={[0.28, 20, 20]} />
                        {material}
                    </mesh>
                    {/* Crown detail */}
                    <mesh position={[0, 1.45, 0]}>
                        <cylinderGeometry args={[0.32, 0.2, 0.15, 8]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 1.6, 0]}>
                        <sphereGeometry args={[0.08, 12, 12]} />
                        {material}
                    </mesh>
                </group>
            );
        case 'k': // King
            return (
                <group>
                    <Base />
                    <mesh position={[0, 0.75, 0]}>
                        <cylinderGeometry args={[0.15, 0.3, 1.2, 24]} />
                        {material}
                    </mesh>
                    <mesh position={[0, 1.4, 0]}>
                        <cylinderGeometry args={[0.3, 0.2, 0.2, 24]} />
                        {material}
                    </mesh>
                    {/* The Cross */}
                    <group position={[0, 1.65, 0]}>
                        <mesh>
                            <boxGeometry args={[0.08, 0.4, 0.08]} />
                            {material}
                        </mesh>
                        <mesh position={[0, 0.1, 0]}>
                            <boxGeometry args={[0.25, 0.08, 0.08]} />
                            {material}
                        </mesh>
                    </group>
                </group>
            );
        default:
            return null;
    }
}

/* ─── Clickable Square ────────────────────────────────────────── */
const Square = memo(function Square({
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
        if (isSelected) return '#4f46e5';
        if (isHighlight) return '#fcd34d';
        if (isValidMove) return hovered ? '#22d3ee' : '#0891b2';
        if (hovered) return isDark ? '#2a2a2a' : '#ffffff';
        return isDark ? '#1a1a1a' : '#f0f0f0';
    }, [isSelected, isHighlight, isValidMove, hovered, isDark]);

    // Smooth piece hover animation
    useFrame(() => {
        if (!pieceGroupRef.current) return;
        const target = isSelected ? 0.25 : 0.05;
        pieceGroupRef.current.position.y += (target - pieceGroupRef.current.position.y) * 0.2;
    });

    const handlePointerOver = useCallback(() => setHovered(true), []);
    const handlePointerOut = useCallback(() => setHovered(false), []);
    const handleClick = useCallback((e: React.MouseEvent | THREE.Event) => {
        if ('stopPropagation' in e) e.stopPropagation();
        onClick();
    }, [onClick]);

    return (
        <group position={[posX, 0, posZ]}>
            <mesh
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <boxGeometry args={[1, 0.1, 1]} />
                <meshStandardMaterial color={squareColor} roughness={0.6} />
            </mesh>

            {/* Valid move indicator dot */}
            {isValidMove && !piece && (
                <mesh position={[0, 0.08, 0]}>
                    <cylinderGeometry args={[0.12, 0.12, 0.02, 16]} />
                    <meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={2} transparent opacity={0.8} />
                </mesh>
            )}

            {piece && (
                <group ref={pieceGroupRef} position={[0, 0.05, 0]}>
                    {/* Check indicator glow behind the king */}
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

/* ─── Board Scene ───────────────────────────────────────────────── */
function BoardScene({
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
            {/* Board frame */}
            <mesh position={[0, -0.15, 0]}>
                <boxGeometry args={[9.5, 0.3, 9.5]} />
                <meshPhysicalMaterial
                    color="#0a0a0a"
                    roughness={0.05}
                    metalness={1}
                    reflectivity={1}
                />
            </mesh>

            {/* Inner Border */}
            <mesh position={[0, -0.04, 0]}>
                <boxGeometry args={[8.8, 0.1, 8.8]} />
                <meshStandardMaterial color="#222" />
            </mesh>

            {/* Labels - Files (a-h) */}
            {['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((letter, i) => (
                <group key={`file-${letter}`}>
                    <Text
                        position={[i - 3.5, 0.02, 4.25]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        fontSize={0.25}
                        color="#ffffff"
                    >
                        {letter}
                    </Text>
                    <Text
                        position={[i - 3.5, 0.02, -4.25]}
                        rotation={[-Math.PI / 2, 0, Math.PI]}
                        fontSize={0.25}
                        color="#ffffff"
                    >
                        {letter}
                    </Text>
                </group>
            ))}

            {/* Labels - Ranks (1-8) */}
            {[1, 2, 3, 4, 5, 6, 7, 8].map((rank, i) => (
                <group key={`rank-${rank}`}>
                    <Text
                        position={[-4.25, 0.02, 3.5 - i]}
                        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
                        fontSize={0.25}
                        color="#ffffff"
                    >
                        {rank}
                    </Text>
                    <Text
                        position={[4.25, 0.02, 3.5 - i]}
                        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
                        fontSize={0.25}
                        color="#ffffff"
                    >
                        {rank}
                    </Text>
                </group>
            ))}

            {/* Squares */}
            {board.map((row, i) =>
                row.map((piece, j) => {
                    const file = String.fromCharCode(97 + j);
                    const rank = 8 - i;
                    const squareId = `${file}${rank}`;
                    const isDark = (i + j) % 2 === 1;
                    const isSelected = selectedSquare === squareId;
                    const isValidMove = validMoves.includes(squareId);
                    const isHighlight = lastMove?.from === squareId || lastMove?.to === squareId;
                    const isKingInCheck = isCheck && piece?.type === 'k' && piece?.color === game.turn();

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
                            materialType={materialType || 'glass'}
                            isKingInCheck={!!isKingInCheck}
                        />
                    );
                })
            )}
        </group>
    );
}

/* ─── Camera Setup ──────────────────────────────────────────────── */
const CAMERA_PRESETS = {
    player: { pos: [0, 8, 7] as [number, number, number] },
    top: { pos: [0, 14, 0.1] as [number, number, number] },
    cinematic: { pos: [10, 6, 10] as [number, number, number] },
};

function CameraSetup({ preset }: { preset: keyof typeof CAMERA_PRESETS }) {
    const { camera } = useThree();
    const target = CAMERA_PRESETS[preset].pos;

    useFrame(() => {
        camera.position.x += (target[0] - camera.position.x) * 0.05;
        camera.position.y += (target[1] - camera.position.y) * 0.05;
        camera.position.z += (target[2] - camera.position.z) * 0.05;
        camera.lookAt(0, 0, 0);
    });

    return null;
}

/* ─── Earth Component ─────────────────────────────────────────────── */
function RealisticEarth() {
    const earthRef = useRef<THREE.Mesh>(null!);
    const cloudsRef = useRef<THREE.Mesh>(null!);

    // Load textures for earth (diffuse, specular, clouds)
    const [colorMap, specularMap, cloudsMap] = useTexture([
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg',
        'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png'
    ]);

    useEffect(() => {
        if (colorMap) colorMap.colorSpace = THREE.SRGBColorSpace;
    }, [colorMap]);

    useFrame(() => {
        if (earthRef.current) earthRef.current.rotation.y += 0.0005;
        if (cloudsRef.current) cloudsRef.current.rotation.y += 0.0007; // Clouds move slightly faster
    });

    return (
        <group position={[-18, 5, -25]} rotation={[0.2, 0, 0.1]}>
            {/* Earth Core */}
            <mesh ref={earthRef}>
                <sphereGeometry args={[8, 48, 48]} />
                <meshStandardMaterial
                    map={colorMap}
                    roughnessMap={specularMap}
                    roughness={0.7}
                    metalness={0.1}
                />
            </mesh>
            {/* Clouds Atmosphere */}
            <mesh ref={cloudsRef}>
                <sphereGeometry args={[8.1, 48, 48]} />
                <meshStandardMaterial
                    map={cloudsMap}
                    transparent
                    opacity={0.8}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
        </group>
    );
}

/* ─── Scene Ready Helper ─────────────────────────────────────────── */
function SceneReady({ onReady }: { onReady: () => void }) {
    const { progress } = useProgress();
    const called = useRef(false);
    useEffect(() => {
        if (progress === 100 && !called.current) {
            called.current = true;
            // Small delay for GPU to finish compiling shaders
            setTimeout(onReady, 400);
        }
    }, [progress, onReady]);
    return null;
}

/* ─── Main Component ────────────────────────────────────────────── */
export const ChessGame = memo(function ChessGame({ onMove, peerMove, onClose, isWhite, localStream, remoteStream }: ChessGameProps) {
    const [game, setGame] = useState(() => new Chess());
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [validMoves, setValidMoves] = useState<string[]>([]);
    const [error] = useState<string | null>(null);
    const [whiteTime, setWhiteTime] = useState(600); // 10 minutes
    const [blackTime, setBlackTime] = useState(600);
    const [isTimerEnabled, setIsTimerEnabled] = useState(false);
    const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [materialType, setMaterialType] = useState('glass');
    const [isLoading, setIsLoading] = useState(true);
    const [fadeOut, setFadeOut] = useState(false);
    const [cameraPreset, setCameraPreset] = useState<'player' | 'top' | 'cinematic'>('player');
    const [roundHistory, setRoundHistory] = useState<{ result: 'win' | 'loss' | 'draw'; moves: number }[]>([]);
    const [showGameOver, setShowGameOver] = useState(false);
    const [gameOverMsg, setGameOverMsg] = useState({ title: '', sub: '', icon: '' });
    const gameOverHandled = useRef(false);
    const localCamRef = useRef<HTMLVideoElement>(null);
    const remoteCamRef = useRef<HTMLVideoElement>(null);

    // Timer Logic
    useEffect(() => {
        if (!isTimerEnabled || game.isGameOver() || whiteTime === 0 || blackTime === 0) return;

        const timer = setInterval(() => {
            if (game.turn() === 'w') {
                setWhiteTime((prev) => Math.max(0, prev - 1));
            } else {
                setBlackTime((prev) => Math.max(0, prev - 1));
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [game, whiteTime, blackTime, isTimerEnabled]);

    // Game over detection
    useEffect(() => {
        if (gameOverHandled.current) return;
        const totalMoves = game.history().length;

        if (game.isCheckmate()) {
            gameOverHandled.current = true;
            const loserTurn = game.turn();
            const iWin = loserTurn !== (isWhite ? 'w' : 'b');
            setRoundHistory(prev => [...prev, { result: iWin ? 'win' : 'loss', moves: totalMoves }]);
            setGameOverMsg({
                title: iWin ? '🎉 You won!' : '😞 You lost!',
                sub: `Checkmate in ${totalMoves} moves`,
                icon: iWin ? '♛' : '♚',
            });
            setShowGameOver(true);
        } else if (game.isDraw()) {
            gameOverHandled.current = true;
            setRoundHistory(prev => [...prev, { result: 'draw', moves: totalMoves }]);
            setGameOverMsg({ title: '🤝 Draw!', sub: `Game ended in a draw after ${totalMoves} moves`, icon: '⚖️' });
            setShowGameOver(true);
        }
    }, [game, isWhite]);

    // Timeout detection
    useEffect(() => {
        if (gameOverHandled.current) return;
        if (!isTimerEnabled) return;
        if (whiteTime === 0 || blackTime === 0) {
            gameOverHandled.current = true;
            const whiteTimedOut = whiteTime === 0;
            const iWin = (isWhite && !whiteTimedOut) || (!isWhite && whiteTimedOut);
            const totalMoves = game.history().length;
            setRoundHistory(prev => [...prev, { result: iWin ? 'win' : 'loss', moves: totalMoves }]);
            setGameOverMsg({
                title: iWin ? '🎉 You won!' : '😞 You lost!',
                sub: 'Time is up ⏰',
                icon: iWin ? '♛' : '♚',
            });
            setShowGameOver(true);
        }
    }, [whiteTime, blackTime, isTimerEnabled, isWhite, game]);

    // Start new round helper
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

    const wins = roundHistory.filter(r => r.result === 'win').length;
    const losses = roundHistory.filter(r => r.result === 'loss').length;
    const draws = roundHistory.filter(r => r.result === 'draw').length;

    // Format time (mm:ss)
    const formatTime = (t: number) => {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Captured pieces logic
    const getCapturedPieces = () => {
        const board = game.board();
        const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1 };
        const currentWhite: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };
        const currentBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0 };

        board.forEach(row => {
            row.forEach(piece => {
                if (piece) {
                    if (piece.color === 'w' && currentWhite[piece.type] !== undefined) currentWhite[piece.type]++;
                    if (piece.color === 'b' && currentBlack[piece.type] !== undefined) currentBlack[piece.type]++;
                }
            });
        });

        const whiteCaptured: string[] = []; // what white has taken (black pieces)
        const blackCaptured: string[] = []; // what black has taken (white pieces)

        const wSymbols: Record<string, string> = { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' };
        const bSymbols: Record<string, string> = { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' };

        for (const [type, initial] of Object.entries(initialCounts)) {
            // White captures black pieces -> show black symbols
            for (let i = 0; i < (initial - currentBlack[type]); i++) whiteCaptured.push(bSymbols[type]);
            // Black captures white pieces -> show white symbols
            for (let i = 0; i < (initial - currentWhite[type]); i++) blackCaptured.push(wSymbols[type]);
        }

        return { whiteCaptured, blackCaptured };
    };

    const { whiteCaptured, blackCaptured } = getCapturedPieces();

    // Attach streams to video elements
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

    // Apply peer's move
    useEffect(() => {
        if (!peerMove) return;
        try {
            const newGame = new Chess(game.fen());

            const pieceAtDest = newGame.get(peerMove.to as any);
            const isCapture = !!pieceAtDest;

            newGame.move(peerMove);
            setGame(newGame);
            setSelectedSquare(null);
            setValidMoves([]);
            setLastMove({ from: peerMove.from, to: peerMove.to });

            // Generate SAN (Standard Algebraic Notation) history manually isn't strictly needed as game.history() gives it,
            // but we can rely on `newGame.history()`
            setMoveHistory(newGame.history());

            if (newGame.isCheck() || newGame.isCheckmate()) {
                playSound('check');
            } else if (isCapture) {
                playSound('capture');
            } else {
                playSound('move');
            }

        } catch (e) {
            console.warn("Invalid peer move", e);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [peerMove]);

    const handleSquareClick = (square: string, piece: { type: PieceType; color: PieceColor } | null) => {
        if (game.isGameOver() || (isTimerEnabled && (whiteTime === 0 || blackTime === 0))) return;

        // Removing color restrictions so the user can control both sides
        const isCurrentTurn = piece ? piece.color === game.turn() : false;

        if (!selectedSquare) {
            if (isCurrentTurn) {
                setSelectedSquare(square);
                // Calculate valid moves for this piece
                const moves = game.moves({ square: square as any, verbose: true });
                setValidMoves(moves.map(m => m.to));
            }
        } else {
            if (selectedSquare === square) {
                setSelectedSquare(null);
                setValidMoves([]);
                return;
            }

            if (isCurrentTurn) {
                setSelectedSquare(square);
                const moves = game.moves({ square: square as any, verbose: true });
                setValidMoves(moves.map(m => m.to));
                return;
            }

            try {
                const moveObj = { from: selectedSquare, to: square, promotion: 'q' as const };
                const newGame = new Chess(game.fen());

                const pieceAtDest = newGame.get(square as any);
                const isCapture = !!pieceAtDest;

                newGame.move(moveObj);
                setGame(newGame);
                setSelectedSquare(null);
                setValidMoves([]);
                setLastMove({ from: selectedSquare, to: square });
                setMoveHistory(newGame.history());
                onMove(moveObj);

                if (newGame.isCheck() || newGame.isCheckmate()) {
                    playSound('check');
                } else if (isCapture) {
                    playSound('capture');
                } else {
                    playSound('move');
                }
            } catch {
                setSelectedSquare(null);
                setValidMoves([]);
            }
        }
    };

    // Game status text
    let statusText = '';
    let statusColor = '#10b981';

    if (isTimerEnabled && (whiteTime === 0 || blackTime === 0)) {
        statusText = '⏰ Time is up!';
        statusColor = '#ef4444';
    } else if (game.isCheckmate()) {
        statusText = game.turn() === (isWhite ? 'w' : 'b') ? '♚ Checkmate! You lost' : '♛ Checkmate! You won!';
        statusColor = game.turn() === (isWhite ? 'w' : 'b') ? '#ef4444' : '#10b981';
    } else if (game.isDraw()) {
        statusText = '🤝 Draw!';
        statusColor = '#f59e0b';
    } else if (game.isCheck()) {
        statusText = '⚠️ Check!';
        statusColor = '#ef4444';
    } else if (game.turn() === (isWhite ? 'w' : 'b')) {
        statusText = '🟢 Your turn';
        statusColor = '#10b981';
    } else {
        statusText = '⏳ Opponent turn...';
        statusColor = '#f59e0b';
    }

    // Handle scene ready
    const handleSceneReady = () => {
        setFadeOut(true);
        setTimeout(() => setIsLoading(false), 600);
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #0a0a1a 0%, #1a1a3e 50%, #0a0a1a 100%)',
            zIndex: 9999, display: 'flex', flexDirection: 'column',
        }}>
            {/* Loading Overlay */}
            {isLoading && (
                <div style={{
                    position: 'absolute', inset: 0, zIndex: 10000,
                    background: 'linear-gradient(135deg, #050510 0%, #0d0d2b 50%, #050510 100%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    transition: 'opacity 0.6s ease-out',
                    opacity: fadeOut ? 0 : 1,
                    pointerEvents: fadeOut ? 'none' : 'all',
                }}>
                    {/* Spinning Chess Piece */}
                    <div style={{
                        fontSize: 72, marginBottom: 24,
                        animation: 'chess-spin 2s ease-in-out infinite',
                        filter: 'drop-shadow(0 0 20px rgba(99,102,241,0.6))',
                    }}>♛</div>

                    <h2 style={{
                        color: '#fff', margin: '0 0 8px', fontSize: 24, fontWeight: 700,
                        letterSpacing: 1, fontFamily: 'sans-serif',
                    }}>Loading game...</h2>

                    <p style={{ color: 'rgba(255,255,255,0.4)', margin: '0 0 32px', fontSize: 14 }}>
                        Preparing the 3D board and space environment
                    </p>

                    {/* Progress Bar */}
                    <div style={{
                        width: 240, height: 4, borderRadius: 4,
                        background: 'rgba(255,255,255,0.1)', overflow: 'hidden',
                    }}>
                        <div style={{
                            height: '100%', borderRadius: 4,
                            background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #a78bfa)',
                            animation: 'loading-bar 1.5s ease-in-out infinite',
                        }} />
                    </div>

                    <style>{`
                        @keyframes chess-spin {
                            0%   { transform: rotateY(0deg)   scale(1);   }
                            50%  { transform: rotateY(180deg) scale(1.1); }
                            100% { transform: rotateY(360deg) scale(1);   }
                        }
                        @keyframes loading-bar {
                            0%   { width: 5%;  margin-left: 0;    }
                            50%  { width: 60%; margin-left: 20%;  }
                            100% { width: 5%;  margin-left: 95%;  }
                        }
                    `}</style>
                </div>
            )}
            {/* Header */}
            <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 24px',
                background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
            }}>
                <h2 style={{ color: '#fff', margin: 0, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 28 }}>♟️</span> 3D Chess
                </h2>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{
                        padding: '6px 16px', borderRadius: 20,
                        background: `${statusColor}22`, border: `1px solid ${statusColor}44`,
                        color: statusColor, fontSize: 15, fontWeight: 600, fontFamily: 'sans-serif',
                    }}>
                        {statusText}
                    </div>

                    {/* Score */}
                    {roundHistory.length > 0 && (
                        <div style={{
                            padding: '4px 14px', borderRadius: 12,
                            background: 'rgba(255,255,255,0.06)',
                            color: '#fff', fontSize: 13, display: 'flex', gap: 8, fontFamily: 'monospace',
                        }}>
                            <span style={{ color: '#10b981' }}>{wins}W</span>
                            <span style={{ color: '#ef4444' }}>{losses}L</span>
                            <span style={{ color: '#f59e0b' }}>{draws}D</span>
                        </div>
                    )}

                    <div style={{
                        padding: '4px 12px', borderRadius: 12,
                        background: 'rgba(255,255,255,0.06)',
                        color: 'rgba(255,255,255,0.6)', fontSize: 13,
                    }}>
                        You: <strong style={{ color: isWhite ? '#fff' : '#888' }}>{isWhite ? '⬜ White' : '⬛ Black'}</strong>
                    </div>

                    <button
                        onClick={() => setIsTimerEnabled(!isTimerEnabled)}
                        style={{
                            padding: '4px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: isTimerEnabled ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)',
                            color: isTimerEnabled ? '#10b981' : 'rgba(255,255,255,0.6)', fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s ease',
                        }}
                    >
                        ⏱️ {isTimerEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                    <div style={{ display: 'flex', gap: 6 }}>
                        {['glass', 'wood', 'marble'].map((mat) => (
                            <button
                                key={mat}
                                onClick={() => setMaterialType(mat)}
                                style={{
                                    padding: '4px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: materialType === mat ? '#4f46e5' : 'rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: 12, transition: '0.2s'
                                }}
                            >
                                {mat === 'glass' ? 'Glass' : mat === 'wood' ? 'Wood' : 'Marble'}
                            </button>
                        ))}
                    </div>

                    {/* New Game + Camera Presets */}
                    <button
                        onClick={startNewRound}
                        style={{
                            padding: '4px 12px', borderRadius: 12, border: 'none', cursor: 'pointer',
                            background: 'rgba(16,185,129,0.15)', color: '#10b981', fontSize: 13,
                            display: 'flex', alignItems: 'center', gap: 4, transition: '0.2s',
                        }}
                    >
                        🔄 New round
                    </button>

                    <div style={{ display: 'flex', gap: 4 }}>
                        {([['player', '🎮'], ['top', '👁️'], ['cinematic', '🎬']] as const).map(([key, icon]) => (
                            <button
                                key={key}
                                onClick={() => setCameraPreset(key)}
                                style={{
                                    padding: '4px 8px', borderRadius: 8, border: 'none', cursor: 'pointer',
                                    background: cameraPreset === key ? '#6366f1' : 'rgba(255,255,255,0.1)',
                                    color: '#fff', fontSize: 13, transition: '0.2s',
                                }}
                                title={key === 'player' ? 'Player view' : key === 'top' ? 'Top view' : 'Cinematic'}
                            >
                                {icon}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={onClose}
                    style={{
                        background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                        borderRadius: 10, color: '#ef4444', width: 38, height: 38, fontSize: 18,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.2s',
                    }}
                >✕</button>
            </div>

            {/* Game Over Popup */}
            {showGameOver && (
                <div style={{
                    position: 'fixed', inset: 0, zIndex: 10001,
                    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1a1a3e, #0a0a1a)',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 24, padding: '40px 50px', textAlign: 'center',
                        boxShadow: '0 25px 80px rgba(0,0,0,0.8)',
                        animation: 'popIn 0.4s ease-out',
                    }}>
                        <div style={{ fontSize: 64, marginBottom: 12 }}>{gameOverMsg.icon}</div>
                        <h2 style={{ color: '#fff', fontSize: 28, margin: '0 0 8px', fontWeight: 800 }}>{gameOverMsg.title}</h2>
                        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, margin: '0 0 28px' }}>{gameOverMsg.sub}</p>

                        {/* Round History Table */}
                        {roundHistory.length > 0 && (
                            <div style={{ marginBottom: 24, maxHeight: 150, overflowY: 'auto' }}>
                                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 8 }}>Round history</div>
                                {roundHistory.map((r, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '6px 16px', borderRadius: 8, marginBottom: 4,
                                        background: 'rgba(255,255,255,0.04)', fontSize: 14, color: '#ccc',
                                    }}>
                                        <span>Round {i + 1}</span>
                                        <span style={{
                                            color: r.result === 'win' ? '#10b981' : r.result === 'loss' ? '#ef4444' : '#f59e0b',
                                            fontWeight: 700,
                                        }}>
                                            {r.result === 'win' ? 'Win' : r.result === 'loss' ? 'Loss' : 'Draw'}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>{r.moves} moves</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                            <button
                                onClick={startNewRound}
                                style={{
                                    padding: '12px 28px', borderRadius: 14, border: 'none', cursor: 'pointer',
                                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                                    color: '#fff', fontSize: 16, fontWeight: 700,
                                    boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                                    transition: '0.2s',
                                }}
                            >
                                🔄 New round
                            </button>
                            <button
                                onClick={() => setShowGameOver(false)}
                                style={{
                                    padding: '12px 28px', borderRadius: 14, border: '1px solid rgba(255,255,255,0.15)',
                                    cursor: 'pointer', background: 'transparent',
                                    color: 'rgba(255,255,255,0.6)', fontSize: 16,
                                    transition: '0.2s',
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes popIn {
                            0%   { transform: scale(0.8); opacity: 0; }
                            100% { transform: scale(1);   opacity: 1; }
                        }
                    `}</style>
                </div>
            )}

            {/* 3D Board */}
            <div style={{ flex: 1, position: 'relative' }}>
                {error && (
                    <div style={{
                        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                        color: '#ef4444', background: 'rgba(0,0,0,0.8)', padding: 20, borderRadius: 12, zIndex: 10,
                    }}>
                        Error: {error}
                    </div>
                )}
                <Canvas
                    gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
                    dpr={[1, 1.5]}
                    performance={{ min: 0.5 }}
                >
                    <CameraSetup preset={cameraPreset} />
                    <SceneReady onReady={handleSceneReady} />

                    <Suspense fallback={null}>
                        {/* Space Environment */}
                        <color attach="background" args={['#050510']} />
                        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                        <RealisticEarth />
                        <ambientLight intensity={0.5} color="#b0c4de" />
                        <directionalLight position={[8, 12, 8]} intensity={1.8} color="#ffffff" />
                        <directionalLight position={[-5, 8, -5]} intensity={0.4} color="#6366f1" />
                        <pointLight position={[0, 6, 0]} intensity={0.6} color="#f59e0b" distance={20} />

                        {/* Board */}
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

                    <OrbitControls
                        minPolarAngle={0.3}
                        maxPolarAngle={Math.PI / 2.3}
                        minDistance={5}
                        maxDistance={18}
                        enablePan={false}
                        target={[0, 0, 0]}
                    />
                </Canvas>

                {/* Remote Camera & Info — top-center (opponent across the table) */}
                <div style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                    display: 'flex', gap: 12, alignItems: 'flex-start'
                }}>
                    <div style={{
                        borderRadius: 16, overflow: 'hidden',
                        border: '2px solid rgba(239,68,68,0.3)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(239,68,68,0.15)',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(10px)',
                        position: 'relative'
                    }}>
                        <video
                            ref={remoteCamRef}
                            autoPlay playsInline
                            style={{ width: 200, height: 130, objectFit: 'cover', display: 'block' }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: '5px 12px',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            <span style={{ fontSize: 13, color: '#f87171', fontWeight: 700 }}>
                                {isWhite ? '⬛' : '⬜'} Opponent
                            </span>
                        </div>
                    </div>
                    {/* Remote Info: Timer + Captured */}
                    <div style={{
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                        padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100
                    }}>
                        {isTimerEnabled && (
                            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', fontFamily: 'monospace', textAlign: 'center' }}>
                                {formatTime(isWhite ? blackTime : whiteTime)}
                            </div>
                        )}
                        <div style={{ fontSize: 16, color: '#fff', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {(isWhite ? blackCaptured : whiteCaptured).map((p, i) => <span key={i}>{p}</span>)}
                        </div>
                    </div>
                </div>

                {/* Local Camera & Info — bottom-center (you, this side of the table) */}
                <div style={{
                    position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)', zIndex: 10,
                    display: 'flex', gap: 12, alignItems: 'flex-end'
                }}>
                    <div style={{
                        borderRadius: 16, overflow: 'hidden',
                        border: '2px solid rgba(99,102,241,0.4)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.6), 0 0 20px rgba(99,102,241,0.15)',
                        background: 'rgba(0,0,0,0.5)',
                        backdropFilter: 'blur(10px)',
                        position: 'relative'
                    }}>
                        <video
                            ref={localCamRef}
                            autoPlay playsInline muted
                            style={{ width: 200, height: 130, objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
                        />
                        <div style={{
                            position: 'absolute', bottom: 0, left: 0, right: 0,
                            padding: '5px 12px',
                            background: 'linear-gradient(transparent, rgba(0,0,0,0.85))',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                        }}>
                            <span style={{ fontSize: 13, color: '#818cf8', fontWeight: 700 }}>
                                {isWhite ? '⬜' : '⬛'} You
                            </span>
                        </div>
                    </div>
                    {/* Local Info: Timer + Captured */}
                    <div style={{
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                        padding: '8px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', flexDirection: 'column', gap: 6, minWidth: 100
                    }}>
                        {isTimerEnabled && (
                            <div style={{ fontSize: 24, fontWeight: 'bold', color: '#fff', fontFamily: 'monospace', textAlign: 'center' }}>
                                {formatTime(isWhite ? whiteTime : blackTime)}
                            </div>
                        )}
                        <div style={{ fontSize: 16, color: '#fff', display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            {(isWhite ? whiteCaptured : blackCaptured).map((p, i) => <span key={i}>{p}</span>)}
                        </div>
                    </div>
                </div>

                {/* Right Side Panels */}
                <div style={{
                    position: 'absolute', right: 24, top: '50%', transform: 'translateY(-50%)', zIndex: 10,
                    width: 150, maxHeight: '75%',
                    display: 'flex', flexDirection: 'column', gap: 10,
                }}>
                    {/* Round History Panel */}
                    {roundHistory.length > 0 && (
                        <div style={{
                            background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                            borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
                            overflow: 'hidden',
                        }}>
                            <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.05)', textAlign: 'center', fontWeight: 'bold', color: '#fff', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                🏆 Round history
                            </div>
                            <div style={{ padding: '8px', maxHeight: 120, overflowY: 'auto' }}>
                                {roundHistory.map((r, i) => (
                                    <div key={i} style={{
                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                        padding: '4px 8px', borderRadius: 6, marginBottom: 3,
                                        background: 'rgba(255,255,255,0.03)', fontSize: 12, color: '#ccc',
                                    }}>
                                        <span style={{ color: '#888' }}>R{i + 1}</span>
                                        <span style={{
                                            color: r.result === 'win' ? '#10b981' : r.result === 'loss' ? '#ef4444' : '#f59e0b',
                                            fontWeight: 700, fontSize: 13,
                                        }}>
                                            {r.result === 'win' ? '✅ Win' : r.result === 'loss' ? '❌ Loss' : '🤝 Draw'}
                                        </span>
                                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>{r.moves}</span>
                                    </div>
                                ))}
                            </div>
                            {/* Score Summary */}
                            <div style={{
                                padding: '6px 10px', borderTop: '1px solid rgba(255,255,255,0.08)',
                                display: 'flex', justifyContent: 'center', gap: 12,
                                fontSize: 13, fontWeight: 700, fontFamily: 'monospace',
                            }}>
                                <span style={{ color: '#10b981' }}>{wins}W</span>
                                <span style={{ color: '#ef4444' }}>{losses}L</span>
                                <span style={{ color: '#f59e0b' }}>{draws}D</span>
                            </div>
                        </div>
                    )}

                    {/* Move History Panel */}
                    <div style={{
                        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
                        borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
                        display: 'flex', flexDirection: 'column', overflow: 'hidden',
                        flex: 1, minHeight: 0,
                    }}>
                        <div style={{ padding: '8px 10px', background: 'rgba(255,255,255,0.05)', textAlign: 'center', fontWeight: 'bold', color: '#fff', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            📝 Move history
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                            {moveHistory.reduce((result: string[][], move, index) => {
                                if (index % 2 === 0) {
                                    result.push([move]);
                                } else {
                                    result[result.length - 1].push(move);
                                }
                                return result;
                            }, []).map((pair, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', color: '#ccc', fontSize: 12, padding: '3px 4px', background: idx % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent', borderRadius: 4 }}>
                                    <span style={{ color: '#6366f1', width: 20 }}>{idx + 1}.</span>
                                    <span style={{ width: 42 }}>{pair[0]}</span>
                                    <span style={{ width: 42 }}>{pair[1] || ''}</span>
                                </div>
                            ))}
                            {/* Auto scroll stub */}
                            <div ref={(el) => { el?.scrollIntoView({ behavior: 'smooth' }) }} />
                        </div>
                    </div>
                </div>
            </div>


        </div >
    );
});

export default ChessGame;
