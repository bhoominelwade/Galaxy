import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SpiralGalaxy from './SpiralGalaxy';
import Planet from './Planet.jsx';
// If hooks folder is in src/hooks
import { useIsInView } from '../hooks/useIsInView.js';

const WS_URL = 'ws://localhost:3000';

const StableStars = memo(() => (
  <>
    <Stars 
      radius={400}  // Increased from 200
      depth={120}   // Increased from 60
      count={8000}  // Increased from 5000
      factor={12}   // Increased from 10
      saturation={1}
      fade={true}
      speed={0.3}
    />
    <Stars 
      radius={300}  // Increased from 150
      depth={100}   // Increased from 50
      count={4000}  // Increased from 2000
      factor={18}   // Increased from 15
      saturation={1}
      fade={true}
      speed={0.2}
    />
    <Stars 
      radius={500}  // Added a third layer of stars
      depth={150}
      count={6000}
      factor={15}
      saturation={0.8}
      fade={true}
      speed={0.1}
    />
  </>
));

const MinimapDot = ({ position, size = 1, color = '#ffffff', onClick }) => (
  <mesh position={position} onClick={onClick}>
    <sphereGeometry args={[size, 8, 8]} />
    <meshBasicMaterial color={color} transparent opacity={0.8} />
    <pointLight distance={5} intensity={0.5} color={color} />
  </mesh>
);

const Minimap = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy }) => {
  const minimapCameraRef = useRef();
  const minimapSize = { width: 180, height: 180 };
  
  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: minimapSize.width,
        height: minimapSize.height,
        background: 'rgba(0,0,0,0.7)',
        border: '2px solid rgba(255,255,255,0.15)',
        borderRadius: '10px',
        overflow: 'hidden',
        boxShadow: '0 0 20px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(5px)'
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '5px',
          background: 'rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.8)',
          fontSize: '10px',
          textAlign: 'center',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        Navigation Map
      </div>
      <Canvas 
        camera={{ 
          position: [0, 100, 200],
          fov: 60,
          far: 5000,
          near: 0.1
        }} 
        onCreated={({ camera }) => {
          minimapCameraRef.current = camera;
        }}
      >
        <MinimapContent 
          mainCamera={mainCamera}
          galaxyPositions={galaxyPositions}
          onNavigate={onNavigate}
          selectedGalaxy={selectedGalaxy}
        />
      </Canvas>
    </div>
  );
};

const MinimapContent = ({ mainCamera, galaxyPositions, onNavigate, selectedGalaxy }) => {
  const { scene, camera, raycaster, pointer } = useThree();
  const positionMarker = useRef();
  
  useFrame(() => {
    if (positionMarker.current && mainCamera) {
      const scaleFactor = 0.1;
      
      positionMarker.current.position.set(
        mainCamera.position.x * scaleFactor,
        0,
        mainCamera.position.z * scaleFactor
      );

      positionMarker.current.position.y = 0.5;
    }
  });

  const handleClick = useCallback((event) => {
    const intersects = raycaster.intersectObjects(scene.children, true);
    if (intersects.length > 0) {
      const point = intersects[0].point;
      const scaleFactor = 10;
      const worldPosition = [
        point.x * scaleFactor,
        mainCamera?.position.y || 50,
        point.z * scaleFactor
      ];
      onNavigate(worldPosition);
    }
  }, [raycaster, scene, onNavigate, mainCamera]);

  return (
    <>
      <ambientLight intensity={0.5} />
      
      <Stars 
        radius={100}
        depth={50}
        count={1000}
        factor={2}
        saturation={0}
        fade={true}
        speed={0.5}
      />

      <mesh ref={positionMarker}>
        <sphereGeometry args={[1.5, 16, 16]} />
        <meshBasicMaterial 
          color="#ff4444" 
          transparent 
          opacity={0.8}
          depthTest={false}
        />
        <pointLight distance={10} intensity={1} color="#ff4444" />
      </mesh>

      {galaxyPositions.map((pos, index) => (
        <MinimapDot
          key={index}
          position={[pos[0] * 0.1, 0, pos[2] * 0.1]}
          size={selectedGalaxy === index ? 1.8 : 1.2}
          color={selectedGalaxy === index ? '#00ffff' : '#ffffff'}
        />
      ))}

      <mesh rotation={[-Math.PI / 2, 0, 0]} onClick={handleClick}>
        <planeGeometry args={[1000, 1000]} />
        <meshBasicMaterial visible={false} />
      </mesh>
    </>
  );
};

const NavButton = ({ label, onClick, style = {} }) => (
  <button
    style={{
      width: '40px',
      height: '40px',
      background: 'rgba(255,255,255,0.1)',
      border: '1px solid rgba(255,255,255,0.2)',
      borderRadius: '5px',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      transition: 'all 0.3s ease',
      ...style
    }}
    onClick={onClick}
    onMouseDown={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
    }}
    onMouseUp={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
    }}
  >
    {label}
  </button>
);

const Universe = () => {
  const [galaxies, setGalaxies] = useState([]);
  const [solitaryPlanets, setSolitaryPlanets] = useState([]);
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const mainCameraRef = useRef();
  const controlsRef = useRef();
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const lastGalaxyRef = useRef(null);
  const processedTransactions = useRef(new Set());
  const galaxyPositionsRef = useRef(new Map());
  const [walletAddress, setWalletAddress] = useState('');
  const [userTransactions, setUserTransactions] = useState([]);
  const [isWalletView, setIsWalletView] = useState(false);
  const [walletSearchError, setWalletSearchError] = useState('');


  const handleKeyDown = useCallback((e) => {
    if (!controlsRef.current || !mainCameraRef.current) return;
    
    const camera = mainCameraRef.current;
    const moveSpeed = 10;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up);
    
    forward.y = 0;
    forward.normalize();
    right.normalize();

    switch(e.key) {
      case 'ArrowUp':
      case 'w':
        camera.position.add(forward.multiplyScalar(moveSpeed));
        break;
      case 'ArrowDown':
      case 's':
        camera.position.add(forward.multiplyScalar(-moveSpeed));
        break;
      case 'ArrowLeft':
      case 'a':
        camera.position.add(right.multiplyScalar(-moveSpeed));
        break;
      case 'ArrowRight':
      case 'd':
        camera.position.add(right.multiplyScalar(moveSpeed));
        break;
      case 'q':
        camera.position.y += moveSpeed;
        break;
      case 'e':
        camera.position.y -= moveSpeed;
        break;
    }
    
    controlsRef.current.target.set(camera.position.x, 0, camera.position.z);
    controlsRef.current.update();
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    let totalPlanets = 0;
    galaxies.forEach((galaxy, index) => {
      console.log(`Galaxy ${index} has ${galaxy.transactions.length} planets`);
      totalPlanets += galaxy.transactions.length;
    });
    console.log(`Total planets in galaxies: ${totalPlanets}`);
    console.log(`Solitary planets: ${solitaryPlanets.length}`);
  }, [galaxies, solitaryPlanets]);

  const groupTransactionsIntoGalaxies = (transactions) => {
    const sortedTransactions = [...transactions].sort((a, b) => b.amount - a.amount);
    const galaxies = [];
    let currentGalaxy = [];
    let currentSum = 0;
    const TARGET_GALAXY_AMOUNT = 2500;
    const MAX_GALAXY_AMOUNT = 3000; // Buffer of 100
    let remainingPlanets = [];
  
    // First separate out the large solo planets (> 400)
    const soloTransactions = sortedTransactions.filter(tx => tx.amount > MAX_GALAXY_AMOUNT);
    const galaxyTransactions = sortedTransactions.filter(tx => tx.amount <= MAX_GALAXY_AMOUNT);
  
    // Process remaining transactions sequentially into galaxies
    for (const tx of galaxyTransactions) {
      if (currentSum + tx.amount <= MAX_GALAXY_AMOUNT) {
        // Add to current galaxy if within limit
        currentGalaxy.push(tx);
        currentSum += tx.amount;
      } else {
        // Current galaxy is full, start a new one
        if (currentGalaxy.length > 0) {
          galaxies.push({
            transactions: currentGalaxy,
            totalAmount: currentSum
          });
        }
        // Start new galaxy with current transaction
        currentGalaxy = [tx];
        currentSum = tx.amount;
      }
    }
  
    // Don't forget to add the last galaxy if it has transactions
    if (currentGalaxy.length > 0) {
      galaxies.push({
        transactions: currentGalaxy,
        totalAmount: currentSum
      });
    }
  
    return { 
      galaxies, 
      solitaryPlanets: soloTransactions 
    };
  };

  const calculateGalaxyPosition = useCallback((index, total) => {
    if (galaxyPositionsRef.current.has(index)) {
      return galaxyPositionsRef.current.get(index);
    }
  
    // Create multiple layers/rings of galaxies
    const layerSize = Math.ceil(Math.sqrt(total));
    const layer = Math.floor(index / layerSize);
    const indexInLayer = index % layerSize;
    
    const minRadius = 200;  // Increased base radius
    const maxRadius = 800;  // Much larger maximum radius
    const verticalSpread = 300; // Increased vertical spread
    const spiralFactor = 6;  // More spiral arms
    
    // Calculate layer-specific parameters
    const layerRadiusMultiplier = (layer + 1) / Math.ceil(total / layerSize);
    const baseRadius = minRadius + (maxRadius - minRadius) * layerRadiusMultiplier;
    
    // Add variety to each layer
    const angleOffset = (layer * Math.PI * 0.5) + (Math.random() * Math.PI * 0.25);
    const layerHeight = (layer - Math.floor(total / layerSize) / 2) * (verticalSpread / 2);
    
    // Calculate position with more randomization
    const angle = (indexInLayer / layerSize) * Math.PI * 2 * spiralFactor + angleOffset;
    const radiusJitter = (Math.random() - 0.5) * baseRadius * 0.3;
    const finalRadius = baseRadius + radiusJitter;
    
    const x = Math.cos(angle) * finalRadius;
    const z = Math.sin(angle) * finalRadius;
    const y = layerHeight + (Math.random() - 0.5) * verticalSpread;
  
    const position = [x, y, z];
    galaxyPositionsRef.current.set(index, position);
    return position;
  }, []);

  
  
  // Add smart galaxy management
  const handleNewTransaction = useCallback((newTransaction) => {
    if (newTransaction.amount > 400) {
      setSolitaryPlanets(prev => [...prev, newTransaction]);
    } else {
      setGalaxies(prev => {
        const lastGalaxy = prev[prev.length - 1];
        const currentSum = lastGalaxy?.transactions.reduce((sum, tx) => sum + tx.amount, 0) || 0;
        
        // If can add to existing galaxy
        if (lastGalaxy && currentSum + newTransaction.amount <= 400) {
          const updated = [...prev];
          updated[prev.length - 1] = {
            ...lastGalaxy,
            transactions: [...lastGalaxy.transactions, newTransaction],
            totalAmount: currentSum + newTransaction.amount
          };
  
          // Update selectedGalaxy if the new transaction was added to it
          if (selectedGalaxy === lastGalaxy) {
            setSelectedGalaxy(updated[prev.length - 1]);
          }
  
          return updated;
        }
        
        // Create new galaxy
        const newGalaxy = {
          transactions: [newTransaction],
          totalAmount: newTransaction.amount
        };
  
        return [...prev, newGalaxy];
      });
    }
  }, [selectedGalaxy]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };
  
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('Received message:', message.type);
        
        if (message.type === 'initial') {
          // ... existing initial load code ...
        } else if (message.type === 'update') {
          const tx = message.data;
          if (!processedTransactions.current.has(tx.hash)) {
            processedTransactions.current.add(tx.hash);
            handleNewTransaction(tx);
          }
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
  
    wsRef.current = ws;
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [handleNewTransaction]);

  useEffect(() => {
    const totalTransactions = galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
      solitaryPlanets.length;
    console.log('Processed Transactions:', processedTransactions.current.size);
    console.log('Total Transactions in State:', totalTransactions);
  }, [galaxies, solitaryPlanets]);
  
  // Add smooth transition for new elements
  const getTransitionState = useCallback((transaction) => {
    const transitionStates = useRef(new Map());
    
    if (!transitionStates.current.has(transaction.hash)) {
      transitionStates.current.set(transaction.hash, {
        scale: 0,
        opacity: 0
      });
      
      // Animate in
      requestAnimationFrame(() => {
        transitionStates.current.set(transaction.hash, {
          scale: 1,
          opacity: 1
        });
      });
    }
    
    return transitionStates.current.get(transaction.hash);
  }, []);

  useEffect(() => {
    if (galaxies.length > 0) {
      lastGalaxyRef.current = galaxies.length - 1;
    }
  }, [galaxies]);

  const handleMinimapNavigate = useCallback((newPosition) => {
    if (controlsRef.current && mainCameraRef.current) {
      const camera = mainCameraRef.current;
      const controls = controlsRef.current;
      const duration = 1000;
      const startPosition = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      };
      const startTime = Date.now();

      const animate = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.set(
          startPosition.x + (newPosition[0] - startPosition.x) * eased,
          startPosition.y + (newPosition[1] - startPosition.y) * eased,
          startPosition.z + (newPosition[2] - startPosition.z) * eased
        );
        
        controls.target.set(camera.position.x, 0, camera.position.z);
        controls.update();
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    setSearchError('');
    
    // Search in galaxies
    for (const galaxy of galaxies) {
      const foundTransaction = galaxy.transactions.find(tx => 
        tx.hash.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      if (foundTransaction) {
        setSelectedGalaxy(galaxy);
        setSearchResult(foundTransaction.hash);
        // Center camera on found transaction
        if (mainCameraRef.current && controlsRef.current) {
          const duration = 1000;
          const startPosition = {
            x: mainCameraRef.current.position.x,
            y: mainCameraRef.current.position.y,
            z: mainCameraRef.current.position.z
          };
          const endPosition = {
            x: 0,
            y: 25,
            z: 30
          };
          
          const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            
            mainCameraRef.current.position.set(
              startPosition.x + (endPosition.x - startPosition.x) * eased,
              startPosition.y + (endPosition.y - startPosition.y) * eased,
              startPosition.z + (endPosition.z - startPosition.z) * eased
            );
            
            controlsRef.current.target.set(0, 0, 0);
            controlsRef.current.update();
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          
          const startTime = Date.now();
          animate();
        }
        return;
      }
    }
  
    // Search in solitary planets
    const foundPlanet = solitaryPlanets.find(tx => 
      tx.hash.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    if (foundPlanet) {
      setSearchResult(foundPlanet.hash);
      setSelectedGalaxy(null);
      // Center and highlight solitary planet
      if (mainCameraRef.current && controlsRef.current) {
        const planetPosition = calculateGalaxyPosition(
          solitaryPlanets.indexOf(foundPlanet) + galaxies.length,
          solitaryPlanets.length + galaxies.length
        );
        
        const duration = 1000;
        const startPosition = {
          x: mainCameraRef.current.position.x,
          y: mainCameraRef.current.position.y,
          z: mainCameraRef.current.position.z
        };
        const endPosition = {
          x: planetPosition[0],
          y: planetPosition[1] + 10,
          z: planetPosition[2] + 20
        };
        
        const animate = () => {
          const now = Date.now();
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          
          mainCameraRef.current.position.set(
            startPosition.x + (endPosition.x - startPosition.x) * eased,
            startPosition.y + (endPosition.y - startPosition.y) * eased,
            startPosition.z + (endPosition.z - startPosition.z) * eased
          );
          
          controlsRef.current.target.set(planetPosition[0], planetPosition[1], planetPosition[2]);
          controlsRef.current.update();
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };
        
        const startTime = Date.now();
        animate();
      }
    } else {
      setSearchError('Transaction not found');
      setSearchResult(null);
    }
  };

  useEffect(() => {
    const fetchAndProcessTransactions = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/transactions');
        const data = await response.json();
        console.log("Received data:", data); // Add this log
        
        // Check if data is valid before processing
        if (!Array.isArray(data)) {
          console.error("Received invalid data format:", data);
          return;
        }
        
        const { galaxies: galaxyGroups, solitaryPlanets: remainingPlanets } = 
          groupTransactionsIntoGalaxies(data);
        setGalaxies(galaxyGroups);
        setSolitaryPlanets(remainingPlanets);
        setLoading(false);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchAndProcessTransactions();
  }, []);

  const galaxyPositions = galaxies.map((_, index) => 
    calculateGalaxyPosition(index, galaxies.length)
  );


  
  const handleWalletSearch = async (e) => {
    e.preventDefault();
    setWalletSearchError('');
    
    const buyTransactions = galaxies.flatMap(galaxy => 
      galaxy.transactions.filter(tx => 
        tx.toAddress.toLowerCase() === walletAddress.toLowerCase()
      )
    );
  
    const solitaryBuyTransactions = solitaryPlanets.filter(tx =>
      tx.toAddress.toLowerCase() === walletAddress.toLowerCase()
    );
  
    const transactions = [...buyTransactions, ...solitaryBuyTransactions];
    setUserTransactions(transactions);
    setIsWalletView(true);
  
    if (transactions.length === 0) {
      setWalletSearchError('No transactions found for this wallet');
    }
  };
  
    const handleTransactionHighlight = (txHash) => {
      setSearchResult(txHash);
      
      // Find and focus on transaction
      const galaxyWithTx = galaxies.find(g => 
        g.transactions.some(tx => tx.hash === txHash)
      );
      
      if (galaxyWithTx) {
        setSelectedGalaxy(galaxyWithTx);
      } else {
        setSelectedGalaxy(null);
      }
    };
  
    const clearWalletSearch = () => {
      setWalletAddress('');
      setUserTransactions([]);
      setIsWalletView(false);
      setWalletSearchError('');
      setSearchResult(null);
    };
  
   

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000000' }}>
     <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '10px',
        maxWidth: '400px'
      }}>
        <form onSubmit={handleWalletSearch} style={{
          display: 'flex',
          gap: '10px',
          width: '100%'
        }}>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter wallet address..."
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '4px',
              color: 'white',
              outline: 'none',
              width: '250px',
              backdropFilter: 'blur(10px)',
            }}
          />
          <button type="submit" style={{
            padding: '8px 16px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
          }}>
            Search
          </button>
          {isWalletView && (
            <button
              type="button"
              onClick={clearWalletSearch}
              style={{
                padding: '8px',
                background: 'rgba(255, 77, 77, 0.2)',
                border: '1px solid rgba(255, 77, 77, 0.3)',
                borderRadius: '4px',
                color: 'white',
                cursor: 'pointer',
              }}
            >
              ✕
            </button>
          )}
        </form>

        {walletSearchError && (
          <div style={{
            color: '#ff6b6b',
            background: 'rgba(0, 0, 0, 0.7)',
            padding: '8px',
            borderRadius: '4px',
          }}>
            {walletSearchError}
          </div>
        )}

        {isWalletView && userTransactions.length > 0 && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.8)',
            padding: '12px',
            borderRadius: '4px',
            width: '100%',
            backdropFilter: 'blur(10px)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
              color: 'white',
            }}>
              <span>Wallet: {walletAddress.slice(0, 8)}...</span>
              <span>{userTransactions.length} transactions</span>
            </div>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              color: 'white',
            }}>
              <thead>
                <tr>
                  <th style={{padding: '8px', textAlign: 'left'}}>Transaction ID</th>
                  <th style={{padding: '8px', textAlign: 'right'}}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {userTransactions.map(tx => (
                  <tr key={tx.hash} style={{
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    cursor: 'pointer',
                    transition: 'background 0.2s'
                  }}
                  onClick={() => handleTransactionHighlight(tx.hash)}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{padding: '8px'}}>{tx.hash.slice(0,10)}...</td>
                    <td style={{padding: '8px', textAlign: 'right'}}>{tx.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Canvas 
        camera={{ 
          position: [0, 50, 100], 
          fov: 65,
          far: 2000,
          near: 0.1
        }} 
        onCreated={({ camera }) => {
          mainCameraRef.current = camera;
        }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.2} />
        <StableStars />

        {selectedGalaxy ? (
          <SpiralGalaxy 
            transactions={selectedGalaxy.transactions}
            position={[0, 0, 0]}
            isSelected={true}
            colorIndex={galaxies.findIndex(g => g === selectedGalaxy)}
            highlightedHash={searchResult}
          />
        ) : (
          <>
            {galaxies.map((galaxy, index) => (
              <SpiralGalaxy
                key={index}
                transactions={galaxy.transactions}
                position={calculateGalaxyPosition(index, galaxies.length)}
                onClick={() => setSelectedGalaxy(galaxy)}
                isSelected={false}
                colorIndex={index}
              />
            ))}

            {solitaryPlanets.map((tx, index) => (
              <Planet
                key={tx.hash}
                transaction={tx}
                position={calculateGalaxyPosition(
                  index + galaxies.length,
                  solitaryPlanets.length + galaxies.length
                )}
                baseSize={1.5}
                colorIndex={index}
                isHighlighted={tx.hash === searchResult}
              />
            ))}
          </>
        )}

        <OrbitControls 
          ref={controlsRef}
          enableZoom={true}
          maxDistance={selectedGalaxy ? 80 : 600}   // Increased from 40/300
          minDistance={selectedGalaxy ? 30 : 60}    // Increased from 15/30
          autoRotate={!selectedGalaxy}
          autoRotateSpeed={0.2}                     // Slowed down from 0.3
          maxPolarAngle={Math.PI * 0.8}            // Increased from 0.75
          minPolarAngle={Math.PI * 0.2}            // Decreased from 0.25
          zoomSpeed={1}
          rotateSpeed={0.5}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>

      <Minimap 
        mainCamera={mainCameraRef.current}
        galaxyPositions={galaxyPositions}
        onNavigate={handleMinimapNavigate}
        selectedGalaxy={selectedGalaxy ? galaxies.indexOf(selectedGalaxy) : null}
      />

      <div style={{ 
        position: 'absolute', 
        bottom: '1rem', 
        left: '1rem', 
        zIndex: 10, 
        display: 'flex', 
        gap: '1rem',
        color: 'white',
        background: 'rgba(0,0,0,0.5)',
        padding: '1rem',
        borderRadius: '0.5rem',
        fontFamily: 'monospace'
      }}>
        <div>Galaxies: {galaxies.length}</div>
        <div>|</div>
        <div>Solitary Planets: {solitaryPlanets.length}</div>
        <div>|</div>
        <div>Total Transactions: {
          galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
          solitaryPlanets.length
        }</div>
      </div>

      {selectedGalaxy && (
        <button
          style={{
            position: 'absolute',
            top: '20px',
            left: '220px',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '5px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          onClick={() => {
            setSelectedGalaxy(null);
            setSearchResult(null);
            if (mainCameraRef.current && controlsRef.current) {
              mainCameraRef.current.position.set(0, 50, 100);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
        >
          Back to Universe
        </button>
      )}
    </div>
  );
};

export default Universe;