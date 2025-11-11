import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { sharedStyles } from '../styles';

// Tetris piece shapes
const TETROMINOS = {
  I: {
    shape: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    color: '#00f5ff'
  },
  O: {
    shape: [[1, 1], [1, 1]],
    color: '#ffff00'
  },
  T: {
    shape: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    color: '#800080'
  },
  S: {
    shape: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    color: '#00ff00'
  },
  Z: {
    shape: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    color: '#ff0000'
  },
  J: {
    shape: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    color: '#0000ff'
  },
  L: {
    shape: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
    color: '#ffa500'
  }
};

const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 16;

const createEmptyBoard = () => {
  return Array(BOARD_HEIGHT).fill(null).map(() => Array(BOARD_WIDTH).fill(0));
};

const TetrisGame = ({
  onExit,
  onSaveStats
}: {
  onExit: () => void;
  onSaveStats: (stats: any) => void;
}) => {
  const [board, setBoard] = useState(createEmptyBoard());
  const [currentPiece, setCurrentPiece] = useState<any>(null);
  const [nextPiece, setNextPiece] = useState<any>(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [lines, setLines] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [gameTime, setGameTime] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());

  const gameLoopRef = useRef<NodeJS.Timeout | null>(null);
  const timeRef = useRef<NodeJS.Timeout | null>(null);
  const currentTimeRef = useRef<NodeJS.Timeout | null>(null);
  const currentPieceRef = useRef<any>(null);

  // Initialize game
  useEffect(() => {
    loadHighScore();
    initializeGame();
    return () => {
      if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
      if (timeRef.current) clearInterval(timeRef.current);
      if (currentTimeRef.current) clearInterval(currentTimeRef.current);
    };
  }, []);

  // Game timer
  useEffect(() => {
    if (!gameOver && !isPaused && startTime) {
      timeRef.current = setInterval(() => {
        setGameTime(Date.now() - startTime);
      }, 1000);
    } else {
      if (timeRef.current) clearInterval(timeRef.current);
    }

    return () => {
      if (timeRef.current) clearInterval(timeRef.current);
    };
  }, [gameOver, isPaused, startTime]);

  // Current time updater
  useEffect(() => {
    if (!gameOver) {
      currentTimeRef.current = setInterval(() => {
        setCurrentTime(new Date());
      }, 1000);
    } else {
      if (currentTimeRef.current) clearInterval(currentTimeRef.current);
    }

    return () => {
      if (currentTimeRef.current) clearInterval(currentTimeRef.current);
    };
  }, [gameOver]);

  // Sync currentPiece ref with state
  useEffect(() => {
    currentPieceRef.current = currentPiece;
  }, [currentPiece]);

  const loadHighScore = async () => {
    try {
      const savedHighScore = await AsyncStorage.getItem('stackerHighScore');
      if (savedHighScore) {
        setHighScore(parseInt(savedHighScore));
      }
    } catch (error) {
      console.error('Error loading high score:', error);
    }
  };

  const saveHighScore = async (newScore: number) => {
    try {
      await AsyncStorage.setItem('stackerHighScore', newScore.toString());
      setHighScore(newScore);
    } catch (error) {
      console.error('Error saving high score:', error);
    }
  };

  const initializeGame = () => {
    // Clear any existing timers/intervals
    if (gameLoopRef.current) {
      clearTimeout(gameLoopRef.current);
      gameLoopRef.current = null;
    }
    if (timeRef.current) {
      clearInterval(timeRef.current);
      timeRef.current = null;
    }
    if (currentTimeRef.current) {
      clearInterval(currentTimeRef.current);
      currentTimeRef.current = null;
    }

    const emptyBoard = createEmptyBoard();
    setBoard(emptyBoard);
    setScore(0);
    setLevel(1);
    setLines(0);
    setGameOver(false);
    setIsPaused(false);
    setStartTime(Date.now());
    setGameTime(0);

    const firstPiece = generateRandomPiece();
    const secondPiece = generateRandomPiece();

    const initialPiece = {
      ...firstPiece,
      x: Math.floor(BOARD_WIDTH / 2) - Math.floor(firstPiece.shape[0].length / 2),
      y: 0
    };
    currentPieceRef.current = initialPiece;
    setCurrentPiece(initialPiece);
    setNextPiece(secondPiece);

    startGameLoop();
  };

  const generateRandomPiece = () => {
    const pieces = Object.keys(TETROMINOS);
    const randomPiece = pieces[Math.floor(Math.random() * pieces.length)];
    return {
      shape: TETROMINOS[randomPiece as keyof typeof TETROMINOS].shape,
      color: TETROMINOS[randomPiece as keyof typeof TETROMINOS].color,
      type: randomPiece
    };
  };

  const startGameLoop = () => {
    if (gameLoopRef.current) clearTimeout(gameLoopRef.current);
    if (!currentPieceRef.current || !currentPieceRef.current.shape) return;

    const speed = Math.max(50, 1000 - (level - 1) * 50);
    gameLoopRef.current = setTimeout(() => {
      movePieceDown();
    }, speed);
  };

  const movePieceDown = () => {
    if (!currentPieceRef.current || !currentPieceRef.current.shape || gameOver || isPaused) return;

    const newY = currentPieceRef.current.y + 1;
    if (isValidMove(currentPieceRef.current.x, newY, currentPieceRef.current.shape)) {
      const updatedPiece = { ...currentPieceRef.current, y: newY };
      currentPieceRef.current = updatedPiece;
      setCurrentPiece(updatedPiece);
      // Continue the game loop
      if (gameLoopRef.current) {
        const speed = Math.max(50, 1000 - (level - 1) * 50);
        gameLoopRef.current = setTimeout(() => {
          movePieceDown();
        }, speed);
      }
    } else {
      // Piece can't move down, place it
      placePiece();
    }
  };

  const movePieceLeft = () => {
    if (!currentPieceRef.current || !currentPieceRef.current.shape || gameOver || isPaused) return;
    const newX = currentPieceRef.current.x - 1;
    if (isValidMove(newX, currentPieceRef.current.y, currentPieceRef.current.shape)) {
      const updatedPiece = { ...currentPieceRef.current, x: newX };
      currentPieceRef.current = updatedPiece;
      setCurrentPiece(updatedPiece);
    }
  };

  const movePieceRight = () => {
    if (!currentPieceRef.current || !currentPieceRef.current.shape || gameOver || isPaused) return;
    const newX = currentPieceRef.current.x + 1;
    if (isValidMove(newX, currentPieceRef.current.y, currentPieceRef.current.shape)) {
      const updatedPiece = { ...currentPieceRef.current, x: newX };
      currentPieceRef.current = updatedPiece;
      setCurrentPiece(updatedPiece);
    }
  };

  const rotatePiece = () => {
    if (!currentPieceRef.current || !currentPieceRef.current.shape || gameOver || isPaused) return;

    const rotatedShape = rotateMatrix(currentPieceRef.current.shape);
    if (isValidMove(currentPieceRef.current.x, currentPieceRef.current.y, rotatedShape)) {
      const updatedPiece = { ...currentPieceRef.current, shape: rotatedShape };
      currentPieceRef.current = updatedPiece;
      setCurrentPiece(updatedPiece);
    }
  };

  const dropPiece = () => {
    if (!currentPieceRef.current || !currentPieceRef.current.shape || gameOver || isPaused) return;

    // Clear the current game loop
    if (gameLoopRef.current) {
      clearTimeout(gameLoopRef.current);
      gameLoopRef.current = null;
    }

    // Drop the piece all the way down
    let newY = currentPieceRef.current.y;
    while (isValidMove(currentPieceRef.current.x, newY + 1, currentPieceRef.current.shape)) {
      newY++;
    }

    if (newY !== currentPieceRef.current.y) {
      const updatedPiece = { ...currentPieceRef.current, y: newY };
      currentPieceRef.current = updatedPiece;
      setCurrentPiece(updatedPiece);
    }

    // Force placement immediately
    placePiece();
  };

  const rotateMatrix = (matrix: number[][]) => {
    if (!matrix || !matrix.length) return matrix;

    const rows = matrix.length;
    const cols = matrix[0].length;
    const rotated = Array(cols).fill(null).map(() => Array(rows).fill(0));

    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        rotated[j][rows - 1 - i] = matrix[i][j];
      }
    }
    return rotated;
  };

  const isValidMove = (x: number, y: number, shape: number[][]) => {
    if (!shape) return false;

    for (let row = 0; row < shape.length; row++) {
      for (let col = 0; col < shape[row].length; col++) {
        if (shape[row][col]) {
          const newX = x + col;
          const newY = y + row;

          if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) {
            return false;
          }

          if (newY >= 0 && board[newY][newX]) {
            return false;
          }
        }
      }
    }
    return true;
  };

  const placePiece = () => {
    if (!currentPieceRef.current || !currentPieceRef.current.shape) return;

    const newBoard = [...board];

    // Place the piece on the board
    for (let row = 0; row < currentPieceRef.current.shape.length; row++) {
      for (let col = 0; col < currentPieceRef.current.shape[row].length; col++) {
        if (currentPieceRef.current.shape[row][col]) {
          const boardY = currentPieceRef.current.y + row;
          const boardX = currentPieceRef.current.x + col;

          if (boardY >= 0) {
            newBoard[boardY][boardX] = currentPieceRef.current.color;
          }
        }
      }
    }

    // Check for completed lines
    const completedLines = [];
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      if (newBoard[row].every((cell: any) => cell !== 0)) {
        completedLines.push(row);
      }
    }

    // Remove completed lines and add new empty lines at top
    if (completedLines.length > 0) {
      completedLines.forEach((lineIndex: number) => {
        newBoard.splice(lineIndex, 1);
        newBoard.unshift(Array(BOARD_WIDTH).fill(0));
      });

      const lineScore = completedLines.length * 100 * level;
      setScore(prev => prev + lineScore);
      setLines(prev => prev + completedLines.length);

      // Level up every 10 lines
      const newLines = lines + completedLines.length;
      const newLevel = Math.floor(newLines / 10) + 1;
      if (newLevel > level) {
        setLevel(newLevel);
        // Clear current loop and restart with new speed
        if (gameLoopRef.current) {
          clearTimeout(gameLoopRef.current);
        }
        startGameLoop();
      }
    }

    setBoard(newBoard);

    // Spawn next piece
    if (nextPiece && nextPiece.shape) {
      const newPiece = {
        ...nextPiece,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(nextPiece.shape[0].length / 2),
        y: 0
      };

      if (isValidMove(newPiece.x, newPiece.y, newPiece.shape)) {
        currentPieceRef.current = newPiece;
        setCurrentPiece(newPiece);
        setNextPiece(generateRandomPiece());
        // Continue the game loop with the new piece
        startGameLoop();
      } else {
        // Game over
        setGameOver(true);
        if (gameLoopRef.current) {
          clearTimeout(gameLoopRef.current);
          gameLoopRef.current = null;
        }
        if (timeRef.current) {
          clearInterval(timeRef.current);
          timeRef.current = null;
        }
        if (currentTimeRef.current) {
          clearInterval(currentTimeRef.current);
          currentTimeRef.current = null;
        }

        // Clear pieces to prevent null reference errors
        currentPieceRef.current = null;
        setCurrentPiece(null);
        setNextPiece(null);

        // Check for new high score
        if (score > highScore) {
          saveHighScore(score);
          Alert.alert('New High Score!', `Congratulations! You achieved a new high score of ${score}!`);
        }
      }
    } else {
      // Game over - no valid next piece
      setGameOver(true);
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current);
        gameLoopRef.current = null;
      }
      if (timeRef.current) {
        clearInterval(timeRef.current);
        timeRef.current = null;
      }
      if (currentTimeRef.current) {
        clearInterval(currentTimeRef.current);
        currentTimeRef.current = null;
      }

      // Clear pieces to prevent null reference errors
      currentPieceRef.current = null;
      setCurrentPiece(null);
      setNextPiece(null);

      // Check for new high score
      if (score > highScore) {
        saveHighScore(score);
        Alert.alert('New High Score!', `Congratulations! You achieved a new high score of ${score}!`);
      }
    }
  };

  const togglePause = () => {
    const newPausedState = !isPaused;
    setIsPaused(newPausedState);

    if (newPausedState) {
      // Pause: clear the game loop
      if (gameLoopRef.current) {
        clearTimeout(gameLoopRef.current);
        gameLoopRef.current = null;
      }
    } else {
      // Resume: restart the game loop
      if (!gameOver && currentPieceRef.current && currentPieceRef.current.shape) {
        startGameLoop();
      }
    }
  };

  const handleExit = () => {
    Alert.alert(
      'Exit Game',
      'Do you want to save this game session?',
      [
        {
          text: 'Save & Exit',
          onPress: () => {
            // Clean up all timers before exiting
            if (gameLoopRef.current) {
              clearTimeout(gameLoopRef.current);
              gameLoopRef.current = null;
            }
            if (timeRef.current) {
              clearInterval(timeRef.current);
              timeRef.current = null;
            }
            if (currentTimeRef.current) {
              clearInterval(currentTimeRef.current);
              currentTimeRef.current = null;
            }

            const stats = {
              game: 'Stacker',
              score,
              level,
              lines,
              timeSpent: Math.floor(gameTime / 1000),
              date: new Date().toISOString()
            };
            onSaveStats(stats);
            onExit();
          }
        },
        {
          text: 'Exit Without Saving',
          onPress: () => {
            // Clean up all timers before exiting
            if (gameLoopRef.current) {
              clearTimeout(gameLoopRef.current);
              gameLoopRef.current = null;
            }
            if (timeRef.current) {
              clearInterval(timeRef.current);
              timeRef.current = null;
            }
            if (currentTimeRef.current) {
              clearInterval(currentTimeRef.current);
              currentTimeRef.current = null;
            }
            onExit();
          },
          style: 'destructive'
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const onGestureEvent = (event: any) => {
    // Handle swipe gestures for piece movement
  };

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX, translationY } = event.nativeEvent;

      if (Math.abs(translationX) > Math.abs(translationY)) {
        // Horizontal swipe
        if (translationX > 50) {
          movePieceRight();
        } else if (translationX < -50) {
          movePieceLeft();
        }
      } else {
        // Vertical swipe
        if (translationY > 50) {
          // Quick drop using the drop function
          dropPiece();
        }
      }
    }
  };

  const renderBoard = () => {
    const displayBoard = board.map(row => [...row]);

    // Add current piece to display board
    if (currentPieceRef.current && !gameOver && currentPieceRef.current.shape) {
      for (let row = 0; row < currentPieceRef.current.shape.length; row++) {
        for (let col = 0; col < currentPieceRef.current.shape[row].length; col++) {
          if (currentPieceRef.current.shape[row][col]) {
            const boardY = currentPieceRef.current.y + row;
            const boardX = currentPieceRef.current.x + col;

            if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
              displayBoard[boardY][boardX] = currentPieceRef.current.color;
            }
          }
        }
      }
    }

    return displayBoard.map((row, rowIndex) => (
      <View key={rowIndex} style={{ flexDirection: 'row' }}>
        {row.map((cell, colIndex) => (
          <View
            key={colIndex}
            style={[
              {
                width: 20,
                height: 20,
                borderWidth: 1,
                borderColor: '#374151'
              },
              { backgroundColor: cell || '#1f2937' }
            ]}
          />
        ))}
      </View>
    ));
  };

  const formatTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatCurrentTime = () => {
    const hours = currentTime.getHours().toString().padStart(2, '0');
    const minutes = currentTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <PanGestureHandler
      onGestureEvent={onGestureEvent}
      onHandlerStateChange={onHandlerStateChange}
    >
      <View style={{ flex: 1, backgroundColor: '#000' }}>
        {/* Header with Menu, Times, and Next Piece */}
        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, backgroundColor: '#1f2937', paddingTop: 40 }}>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => {
              const options = [];
              if (!gameOver) {
                options.push({
                  text: isPaused ? 'Resume' : 'Pause',
                  onPress: togglePause
                });
              }
              options.push({
                text: gameOver ? 'New Game' : 'Restart',
                onPress: initializeGame
              });
              options.push({
                text: 'Exit',
                onPress: handleExit,
                style: 'destructive' as const
              });
              options.push({
                text: 'Cancel',
                style: 'cancel' as const
              });

              Alert.alert(
                'Game Menu',
                'Choose an action:',
                options
              );
            }}
          >
            <Text style={{ color: '#f59e0b', fontSize: 16, fontWeight: 'bold' }}>☰ Menu</Text>
          </TouchableOpacity>

          <View style={{ flex: 1, alignItems: 'center' }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 14 }}>
                Elapsed: {formatTime(gameTime)}
              </Text>
              <Text style={{ color: '#fff', fontSize: 14 }}>
                Current: {formatCurrentTime()}
              </Text>
            </View>
          </View>

          {/* Next Piece in Header */}
          {nextPiece && nextPiece.shape && (
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>Next</Text>
              <View style={{ flexDirection: 'row' }}>
                {nextPiece.shape.map((row: number[], rowIndex: number) => (
                  <View key={rowIndex} style={{ flexDirection: 'column' }}>
                    {row.map((cell: number, colIndex: number) => (
                      <View
                        key={colIndex}
                        style={[
                          { width: 8, height: 8, borderWidth: 1, borderColor: '#374151' },
                          { backgroundColor: cell ? nextPiece.color : 'transparent' }
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Main Game Area */}
        <View style={{ flex: 1, padding: 10 }}>
          {/* Game Info */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 10 }}>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>Score</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{score}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>High Score</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{highScore}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>Level</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{level}</Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 12 }}>Lines</Text>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>{lines}</Text>
            </View>
          </View>

          {/* Game Board - Modal Style */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{
              backgroundColor: 'rgba(31, 41, 55, 0.95)',
              padding: 15,
              borderRadius: 15,
              borderWidth: 2,
              borderColor: '#f59e0b',
              shadowColor: '#f59e0b',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
              elevation: 10
            }}>
              {renderBoard()}
            </View>
          </View>

        </View>

        {/* Footer Controls */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', padding: 15, backgroundColor: '#1f2937' }}>
          <TouchableOpacity style={{ backgroundColor: '#374151', borderRadius: 10, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }} onPress={movePieceLeft}>
            <Text style={{ color: '#fff', fontSize: 24 }}>←</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#374151', borderRadius: 10, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }} onPress={rotatePiece}>
            <Text style={{ color: '#fff', fontSize: 24 }}>↻</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#374151', borderRadius: 10, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }} onPress={movePieceRight}>
            <Text style={{ color: '#fff', fontSize: 24 }}>→</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ backgroundColor: '#f59e0b', borderRadius: 10, width: 50, height: 50, justifyContent: 'center', alignItems: 'center' }} onPress={dropPiece}>
            <Text style={{ color: '#000', fontSize: 24 }}>↓</Text>
          </TouchableOpacity>
        </View>

        {/* Game Status Overlays */}
        {gameOver && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ backgroundColor: '#1f2937', borderRadius: 12, padding: 20, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold', marginBottom: 10 }}>Game Over!</Text>
              <Text style={{ color: '#f59e0b', fontSize: 18, marginBottom: 20 }}>Final Score: {score}</Text>

              {/* Game Over Buttons */}
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  style={{ backgroundColor: '#f59e0b', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 }}
                  onPress={initializeGame}
                >
                  <Text style={{ color: '#000', fontSize: 16, fontWeight: 'bold' }}>New Game</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ backgroundColor: '#6b7280', borderRadius: 8, paddingHorizontal: 20, paddingVertical: 12 }}
                  onPress={handleExit}
                >
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Exit</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {isPaused && !gameOver && (
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0, 0, 0, 0.8)', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: 'bold' }}>Paused</Text>
          </View>
        )}
      </View>
    </PanGestureHandler>
  );
};

export default TetrisGame;