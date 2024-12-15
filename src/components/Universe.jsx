import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SpiralGalaxy from './SpiralGalaxy';
import Planet from './Planet.jsx';
import { useIsInView } from '../hooks/useIsInView.js';
import ChunkAndLODManager from './optimizations/ChunkAndLODManager';
import { LOD_LEVELS } from './optimizations/constants';

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

// Add a new component for culling calculations
const CullingManager = memo(({ galaxies, solitaryPlanets, selectedGalaxy, searchResult, calculateGalaxyPosition, onSetVisible }) => {
  const { camera, size } = useThree();
  const frustum = useMemo(() => new THREE.Frustum(), []);
  const projScreenMatrix = useMemo(() => new THREE.Matrix4(), []);
  const visibleObjects = useRef(new Set());

  useFrame(() => {
    // Update the frustum
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const newVisibleObjects = new Set();
    const maxDistance = 1000; // Maximum render distance
    const minDistance = 50;   // Distance at which to start fading objects

    // Helper function to check if position is in view
    const isInView = (position) => {
      const point = new THREE.Vector3(...position);
      const distance = camera.position.distanceTo(point);
      
      // Early return if object is too far
      if (distance > maxDistance) return false;
      
      // Check if point is in frustum
      if (!frustum.containsPoint(point)) return false;
      
      // Calculate visibility factor based on distance
      const visibilityFactor = distance < minDistance ? 1 : 
        1 - Math.min(1, (distance - minDistance) / (maxDistance - minDistance));
      
      return visibilityFactor > 0.1; // Only render if more than 10% visible
    };

    // Check galaxies
    if (!selectedGalaxy) {
      galaxies.forEach((galaxy, index) => {
        const position = calculateGalaxyPosition(index, galaxies.length);
        if (isInView(position)) {
          newVisibleObjects.add(`galaxy-${index}`);
        }
      });

      // Check solitary planets
      solitaryPlanets.forEach((planet, index) => {
        const position = calculateGalaxyPosition(
          index + galaxies.length,
          solitaryPlanets.length + galaxies.length
        );
        if (isInView(position)) {
          newVisibleObjects.add(`planet-${index}`);
        }
      });
    } else {
      // If a galaxy is selected, only render that galaxy
      newVisibleObjects.add(`galaxy-${galaxies.indexOf(selectedGalaxy)}`);
    }

    // Update visibility if changed
    if (JSON.stringify([...visibleObjects.current]) !== JSON.stringify([...newVisibleObjects])) {
      visibleObjects.current = newVisibleObjects;
      onSetVisible(newVisibleObjects);
    }
  });

  return null;
});

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
  const [visibleObjects, setVisibleObjects] = useState(new Set());
  const wheelSpeed = useRef(1);
  const [objectLODs, setObjectLODs] = useState(new Map());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const allTransactionsRef = useRef(new Set());

  const handleKeyDown = useCallback((e) => {
    if (!controlsRef.current || !mainCameraRef.current) return;
    
    const camera = mainCameraRef.current;
    const moveSpeed = 15; // Increased speed
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    camera.getWorldDirection(forward);
    right.crossVectors(forward, camera.up);
    
    // Keep forward/right movement on xz plane
    forward.y = 0;
    forward.normalize();
    right.normalize();
  
    let moved = false;
  
    switch(e.key) {
      case 'ArrowUp':
      case 'w':
        camera.position.addScaledVector(forward, moveSpeed);
        moved = true;
        break;
      case 'ArrowDown':
      case 's':
        camera.position.addScaledVector(forward, -moveSpeed);
        moved = true;
        break;
      case 'ArrowLeft':
      case 'a':
        camera.position.addScaledVector(right, -moveSpeed);
        moved = true;
        break;
      case 'ArrowRight':
      case 'd':
        camera.position.addScaledVector(right, moveSpeed);
        moved = true;
        break;
      case 'q':
        camera.position.y += moveSpeed;
        moved = true;
        break;
      case 'e':
        camera.position.y -= moveSpeed;
        moved = true;
        break;
    }
    
    if (moved) {
      // Update controls target to follow camera
      controlsRef.current.target.set(
        camera.position.x + forward.x * 10,
        0,
        camera.position.z + forward.z * 10
      );
      controlsRef.current.update();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const handleWheel = (e) => {
      if (!controlsRef.current || !mainCameraRef.current) return;
  
      const camera = mainCameraRef.current;
      const forward = new THREE.Vector3();
      camera.getWorldDirection(forward);
  
      // Normalize the wheel delta
      const delta = -Math.sign(e.deltaY);
      const speed = 15; // Adjust this value to change movement speed
  
      // Move camera forward/backward
      camera.position.addScaledVector(forward, delta * speed);
  
      // Update the orbital controls target
      controlsRef.current.target.addScaledVector(forward, delta * speed);
      controlsRef.current.update();
    };
  
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => window.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    let totalPlanets = 0;
    galaxies.forEach((galaxy, index) => {
      console.log(`Galaxy ${index} has ${galaxy.transactions.length} planets`);
      totalPlanets += galaxy.transactions.length;
    });
    console.log(`Total planets in galaxies: ${totalPlanets}`);
    console.log(`Solitary planets: ${solitaryPlanets.length}`);
  }, [galaxies, solitaryPlanets]);

  const groupTransactionsIntoGalaxies = useCallback((transactions) => {
    const sortedTransactions = [...transactions].sort((a, b) => b.amount - a.amount);
    const galaxies = [];
    let currentGalaxy = [];
    let currentSum = 0;
    const TARGET_GALAXY_AMOUNT = 6000;
    const MAX_GALAXY_AMOUNT = 7000;
    
    // First separate out the large solo planets (> MAX_GALAXY_AMOUNT)
    const soloTransactions = sortedTransactions.filter(tx => tx.amount > MAX_GALAXY_AMOUNT);
    const galaxyTransactions = sortedTransactions.filter(tx => tx.amount <= MAX_GALAXY_AMOUNT);
    
    // Process remaining transactions sequentially into galaxies
    for (const tx of galaxyTransactions) {
      if (currentSum + tx.amount <= MAX_GALAXY_AMOUNT) {
        currentGalaxy.push(tx);
        currentSum += tx.amount;
      } else {
        if (currentGalaxy.length > 0) {
          galaxies.push({
            transactions: currentGalaxy,
            totalAmount: currentSum
          });
        }
        currentGalaxy = [tx];
        currentSum = tx.amount;
      }
    }
    
    if (currentGalaxy.length > 0) {
      galaxies.push({
        transactions: currentGalaxy,
        totalAmount: currentSum
      });
    }
    
    return { galaxies, solitaryPlanets: soloTransactions };
  }, []);

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
    // Add to processedTransactions if not already there
    if (!processedTransactions.current.has(newTransaction)) {
      processedTransactions.current.add(newTransaction);
    }
    
    // Add to allTransactionsRef if not already there
    if (!allTransactionsRef.current.has(newTransaction.hash)) {
      allTransactionsRef.current.add(newTransaction.hash);
      
      // Get all processed transactions
      const allTransactions = Array.from(processedTransactions.current);
      
      // Regroup all transactions
      const { galaxies: newGalaxies, solitaryPlanets: newSolitaryPlanets } = 
        groupTransactionsIntoGalaxies(allTransactions);
      
      // Update state with all transactions
      setGalaxies(newGalaxies);
      setSolitaryPlanets(newSolitaryPlanets);
      
      // Log the update
      console.log('Updated total transactions:', 
        newGalaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
        newSolitaryPlanets.length
      );
    }
  }, [groupTransactionsIntoGalaxies]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };
  
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'update' && initialLoadComplete) {
          const tx = message.data;
          if (!processedTransactions.current.has(tx.hash)) {
            processedTransactions.current.add(tx);
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
  }, [handleNewTransaction, initialLoadComplete]);

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
        
        if (!Array.isArray(data)) {
          console.error("Received invalid data format:", data);
          return;
        }
        
        // Create a temporary array to hold all transaction objects
        const allTransactions = [];
        
        // Process each transaction
        data.forEach(tx => {
          if (!processedTransactions.current.has(tx)) {
            processedTransactions.current.add(tx);
          }
          if (!allTransactionsRef.current.has(tx.hash)) {
            allTransactionsRef.current.add(tx.hash);
          }
          allTransactions.push(tx);
        });
    
        // Log the number of transactions being processed
        console.log('Processing initial transactions:', allTransactions.length);
        
        // Group all transactions
        const { galaxies: galaxyGroups, solitaryPlanets: remainingPlanets } = 
          groupTransactionsIntoGalaxies(allTransactions);
        
        // Set state with all transactions
        setGalaxies(galaxyGroups);
        setSolitaryPlanets(remainingPlanets);
        
        // Log the results
        console.log('Initial galaxies:', galaxyGroups.length);
        console.log('Initial solitary planets:', remainingPlanets.length);
        console.log('Total transactions processed:', 
          galaxyGroups.reduce((sum, g) => sum + g.transactions.length, 0) + 
          remainingPlanets.length
        );
        
        setLoading(false);
        setInitialLoadComplete(true);
      } catch (error) {
        console.error('Error:', error);
        setLoading(false);
      }
    };

    fetchAndProcessTransactions();
  }, [groupTransactionsIntoGalaxies]);

  const galaxyPositions = galaxies.map((_, index) => 
    calculateGalaxyPosition(index, galaxies.length)
  );


  
  const handleWalletSearch = async (e) => {
    e.preventDefault();
    setWalletSearchError('');
    
    // Create a Set to store unique transaction hashes
    const seenHashes = new Set();
    
    // Get transactions from galaxies, ensuring uniqueness
    const buyTransactions = galaxies.flatMap(galaxy => 
      galaxy.transactions.filter(tx => {
        if (tx.toAddress.toLowerCase() === walletAddress.toLowerCase() && !seenHashes.has(tx.hash)) {
          seenHashes.add(tx.hash);
          return true;
        }
        return false;
      })
    );
  
    // Get transactions from solitary planets, ensuring uniqueness
    const solitaryBuyTransactions = solitaryPlanets.filter(tx =>
      tx.toAddress.toLowerCase() === walletAddress.toLowerCase() && !seenHashes.has(tx.hash)
    );
  
    // Combine unique transactions
    const transactions = [...buyTransactions, ...solitaryBuyTransactions];
    
    // Sort by amount (optional)
    transactions.sort((a, b) => b.amount - a.amount);
    
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

    const handleSetVisible = useCallback((newVisible) => {
      setVisibleObjects(newVisible);
    }, []);
  
   

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
    padding: '10px',
    borderRadius: '4px',
    width: '100%',
    maxHeight: '300px', // Reduced from 400px
    backdropFilter: 'blur(10px)',
    display: 'flex',
    flexDirection: 'column',
    fontSize: '13px' // Added smaller base font size
  }}>
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '6px', // Reduced from 8px
      color: 'white',
      padding: '0 6px', // Reduced padding
      fontSize: '12px' // Slightly larger than table text
    }}>
      <span>Wallet: {walletAddress.slice(0, 8)}...</span>
      <span>{userTransactions.length} transactions</span>
    </div>
    
    <div style={{
      overflowY: 'auto',
      maxHeight: '250px', // Reduced from 350px
      scrollbarWidth: 'thin',
      scrollbarColor: 'rgba(255,255,255,0.3) transparent'
    }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        color: 'white',
      }}>
        <thead style={{
          position: 'sticky',
          top: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          zIndex: 1,
          fontSize: '10px' // Smaller header text
        }}>
          <tr>
            <th style={{padding: '6px', textAlign: 'left'}}>Transaction ID</th>
            <th style={{padding: '6px', textAlign: 'right'}}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {userTransactions.map(tx => (
            <tr 
              key={tx.hash} 
              style={{
                borderTop: '1px solid rgba(255,255,255,0.1)',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onClick={() => handleTransactionHighlight(tx.hash)}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{padding: '4px 6px'}}>{tx.hash.slice(0,10)}...</td>
              <td style={{padding: '4px 6px', textAlign: 'right'}}>{tx.amount.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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

        <CullingManager
          galaxies={galaxies}
          solitaryPlanets={solitaryPlanets}
          selectedGalaxy={selectedGalaxy}
          searchResult={searchResult}
          calculateGalaxyPosition={calculateGalaxyPosition}
          onSetVisible={handleSetVisible}
        />

<ChunkAndLODManager
    galaxies={galaxies}
    solitaryPlanets={solitaryPlanets}
    selectedGalaxy={selectedGalaxy}
    calculateGalaxyPosition={calculateGalaxyPosition}
    onUpdateVisible={handleSetVisible}
    onUpdateLOD={setObjectLODs}
  />

{selectedGalaxy ? (
  <SpiralGalaxy 
    transactions={selectedGalaxy.transactions}
    position={[0, 0, 0]}
    isSelected={true}
    colorIndex={galaxies.findIndex(g => g === selectedGalaxy)}
    highlightedHash={searchResult}
    lodLevel={objectLODs.get(`galaxy-${galaxies.findIndex(g => g === selectedGalaxy)}`) || 'HIGH'}
  />
) : (
  <>
    {galaxies.map((galaxy, index) => (
      visibleObjects.has(`galaxy-${index}`) && (
        <SpiralGalaxy
          key={index}
          transactions={galaxy.transactions}
          position={calculateGalaxyPosition(index, galaxies.length)}
          onClick={() => {
            setSelectedGalaxy(galaxy);
            if (mainCameraRef.current && controlsRef.current) {
              mainCameraRef.current.position.set(0, 25, 50);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
          isSelected={false}
          colorIndex={index}
          lodLevel={objectLODs.get(`galaxy-${index}`) || 'HIGH'}
        />
      )
    ))}

    {solitaryPlanets.map((tx, index) => (
      visibleObjects.has(`planet-${index}`) && (
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
          lodLevel={objectLODs.get(`planet-${index}`) || 'HIGH'}
        />
      )
    ))}
  </>
)}

<OrbitControls 
  ref={controlsRef}
  enableZoom={true}
  maxDistance={selectedGalaxy ? 40 : 300}
  minDistance={0.0001}
  autoRotate={!selectedGalaxy}
  autoRotateSpeed={0.3}
  maxPolarAngle={Math.PI} // Changed from 0.75 to allow full vertical movement
  minPolarAngle={0} // Changed from 0.25 to allow full vertical movement
  zoomSpeed={2}
  rotateSpeed={0.8}
  enableDamping={true}
  dampingFactor={0.05}
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    RIGHT: THREE.MOUSE.PAN
  }}
  panSpeed={15}
  screenSpacePanning={true} // Changed to true for full 3D panning
  enablePan={true}
  keyPanSpeed={15}
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