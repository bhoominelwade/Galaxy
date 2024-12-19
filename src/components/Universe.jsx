import { useState, useEffect, useRef, useCallback, memo, useMemo } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SpiralGalaxy from './SpiralGalaxy';
import Planet from './Planet.jsx';
import { useIsInView } from '../hooks/useIsInView.js';
import ChunkAndLODManager from './optimizations/ChunkAndLODManager';
import { LOD_LEVELS } from './optimizations/constants';
import UniverseSpheres from './UniverseSperese.jsx'
import DynamicStarfield from './DynamicStarfield.jsx';
import Minimap from './Minimap';
import CullingManager from './CullingManager'
import HyperspaceTunnel from './HyperspaceTunnel'
import UniverseReveal from './UniverseReveal.jsx'
import AudioManager from './AudioManager'

const WS_URL = 'ws://localhost:3000';



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
  const [walletAddress, setWalletAddress] = useState('');
  const [userTransactions, setUserTransactions] = useState([]);
  const [isWalletView, setIsWalletView] = useState(false);
  const [walletSearchError, setWalletSearchError] = useState('');
  const [visibleObjects, setVisibleObjects] = useState(new Set());
  const wheelSpeed = useRef(1);
  const [objectLODs, setObjectLODs] = useState(new Map());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const allTransactionsRef = useRef(new Set());
  const [hyperspaceActive, setHyperspaceActive] = useState(false);
  const [targetGalaxyPosition, setTargetGalaxyPosition] = useState([0, 0, 0]);
  const [zoomPhase, setZoomPhase] = useState('none');
const [universeRevealActive, setUniverseRevealActive] = useState(false);

  const galaxyPositionsRef = useRef(new Map());
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

const handleGalaxyClick = useCallback((galaxy) => {
  const galaxyPosition = calculateGalaxyPosition(
    galaxies.indexOf(galaxy),
    galaxies.length
  );
  
  if (mainCameraRef.current && controlsRef.current) {
    const startPosition = mainCameraRef.current.position.clone();
    const startTarget = controlsRef.current.target.clone();
    const galaxyPos = new THREE.Vector3(...galaxyPosition);
    
    const startTime = Date.now();
    const duration = 1500; // 1.5 seconds

    setHyperspaceActive(true);

    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
        const eased = 1 - Math.pow(1 - progress, 3);
        mainCameraRef.current.position.lerp(new THREE.Vector3(0, 25, 50), eased);
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), eased);
        controlsRef.current.update();
      } else {
        setHyperspaceActive(false);
        setSelectedGalaxy(galaxy);
        mainCameraRef.current.position.set(0, 25, 50);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    };

    animate();
  }
}, [galaxies, calculateGalaxyPosition]);

const handleBackToUniverse = useCallback(() => {
  console.log('Back to Universe clicked');
  
  if (selectedGalaxy) {
    console.log('Setting last galaxy position');
    lastGalaxyPosition.current = calculateGalaxyPosition(
      galaxies.indexOf(selectedGalaxy),
      galaxies.length
    );
  }
  
  console.log('Starting hyperspace');
  setHyperspaceActive(true);
  
  setTimeout(() => {
    console.log('Hyperspace ending, starting universe reveal');
    setHyperspaceActive(false);
    setUniverseRevealActive(true);
    
    setTimeout(() => {
      console.log('Universe reveal ending, showing normal universe');
      setUniverseRevealActive(false);
      setSelectedGalaxy(null);
      setSearchResult(null);
      if (mainCameraRef.current && controlsRef.current) {
        mainCameraRef.current.position.set(0, 50, 100);
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }, 2000);
  }, 800);
}, [selectedGalaxy, galaxies, calculateGalaxyPosition]);

// Add useEffect to monitor state changes
useEffect(() => {
  console.log('Hyperspace active:', hyperspaceActive);
}, [hyperspaceActive]);

useEffect(() => {
  console.log('Universe reveal active:', universeRevealActive);
}, [universeRevealActive]);// Add galaxies to dependencies

  const handleKeyDown = useCallback((e) => {
  if (!controlsRef.current || !mainCameraRef.current) return;
  
  const camera = mainCameraRef.current;
  const controls = controlsRef.current;
  const moveSpeed = 50;
  
  switch(e.key) {
    case 'ArrowUp':
    case 'w':
      camera.position.z -= moveSpeed;
      controls.target.z -= moveSpeed;
      break;
    case 'ArrowDown':
    case 's':
      camera.position.z += moveSpeed;
      controls.target.z += moveSpeed;
      break;
    case 'ArrowLeft':
    case 'a':
      camera.position.x -= moveSpeed;
      controls.target.x -= moveSpeed;
      break;
    case 'ArrowRight':
    case 'd':
      camera.position.x += moveSpeed;
      controls.target.x += moveSpeed;
      break;
    case 'q':
      camera.position.y += moveSpeed;
      controls.target.y += moveSpeed;
      break;
    case 'e':
      camera.position.y -= moveSpeed;
      controls.target.y -= moveSpeed;
      break;
  }
  
  controls.update();
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

    if (!transactions || transactions.length === 0) {
      return { galaxies: [], solitaryPlanets: [] };
    }
    // First deduplicate transactions based on hash
    const uniqueTransactions = Array.from(
      new Map(transactions.map(tx => [tx.hash, tx])).values()
    );
    
    const sortedTransactions = [...uniqueTransactions].sort((a, b) => b.amount - a.amount);
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

 

  
  
  // Add smart galaxy management
  const handleNewTransaction = useCallback((newTransaction) => {
    // Add to processedTransactions if not already there
    if (!processedTransactions.current.has(newTransaction.hash)) {
      processedTransactions.current.add(newTransaction);
      
      // Add to allTransactionsRef if not already there
      if (!allTransactionsRef.current.has(newTransaction.hash)) {
        allTransactionsRef.current.add(newTransaction.hash);
        
        // Get all existing transactions plus the new one
        const existingTransactions = galaxies.flatMap(g => g.transactions);
        const allTransactions = [...existingTransactions, ...solitaryPlanets, newTransaction];
        
        // Regroup all transactions
        const { galaxies: newGalaxies, solitaryPlanets: newSolitaryPlanets } = 
          groupTransactionsIntoGalaxies(allTransactions);
        
        // Update state with all transactions
        setGalaxies(newGalaxies);
        setSolitaryPlanets(newSolitaryPlanets);
        
        console.log('Updated total transactions:', 
          newGalaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
          newSolitaryPlanets.length
        );
      }
    }
  }, [galaxies, solitaryPlanets, groupTransactionsIntoGalaxies]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
    };
  
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'initial') {
          // Ignore initial message if we already have transactions
          if (galaxies.length === 0 && solitaryPlanets.length === 0) {
            const transactions = message.data;
            transactions.forEach(tx => {
              if (!processedTransactions.current.has(tx.hash)) {
                processedTransactions.current.add(tx);
                allTransactionsRef.current.add(tx.hash);
              }
            });
            
            const { galaxies: newGalaxies, solitaryPlanets: newPlanets } = 
              groupTransactionsIntoGalaxies(transactions);
            
            setGalaxies(newGalaxies);
            setSolitaryPlanets(newPlanets);
          }
        } else if (message.type === 'update' && initialLoadComplete) {
          const tx = message.data;
          handleNewTransaction(tx);
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
  }, [handleNewTransaction, initialLoadComplete, galaxies, solitaryPlanets]);

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
        setLoading(true);
        let offset = 0;
        let allTransactions = [];
        let hasMore = true;
        let total = 0;
    
        // First get the total count
        const initialResponse = await fetch('http://localhost:3000/api/transactions?offset=0&limit=1');
        const initialData = await initialResponse.json();
        total = initialData.total;
        console.log(`Total transactions to load: ${total}`);
    
        // Then fetch all transactions in batches
        while (offset < total) {
          const response = await fetch(
            `http://localhost:3000/api/transactions?offset=${offset}&limit=1000`
          );
          const data = await response.json();
          
          if (!data.transactions || !Array.isArray(data.transactions)) {
            throw new Error("Received invalid data format");
          }
    
          allTransactions = [...allTransactions, ...data.transactions];
          
          // Log progress
          console.log(`Loaded ${allTransactions.length}/${total} transactions`);
          
          // Update state to show progress
          const { galaxies: galaxyGroups, solitaryPlanets: remainingPlanets } = 
            groupTransactionsIntoGalaxies(allTransactions);
          
          setGalaxies(galaxyGroups);
          setSolitaryPlanets(remainingPlanets);
          
          // Prepare for next batch
          offset += data.transactions.length;
          
          // Add small delay between batches
          await new Promise(resolve => setTimeout(resolve, 50));
        }
    
        // Process all transactions once loading is complete
        const { galaxies: finalGalaxies, solitaryPlanets: finalPlanets } = 
          groupTransactionsIntoGalaxies(allTransactions);
        
        setGalaxies(finalGalaxies);
        setSolitaryPlanets(finalPlanets);
        setLoading(false);
        setInitialLoadComplete(true);
        
        console.log(`Final load complete. Total transactions: ${allTransactions.length}`);
        
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
    
    // First check in galaxies
    const galaxyWithTx = galaxies.find(g => 
      g.transactions.some(tx => tx.hash === txHash)
    );
    
    if (galaxyWithTx) {
      setSelectedGalaxy(galaxyWithTx);
    } else {
      // Check in solitary planets
      const solitaryPlanet = solitaryPlanets.find(tx => tx.hash === txHash);
      
      if (solitaryPlanet) {
        setSelectedGalaxy(null);
        const planetPosition = calculateGalaxyPosition(
          solitaryPlanets.indexOf(solitaryPlanet) + galaxies.length,
          solitaryPlanets.length + galaxies.length
        );
        
        // Animate camera to focus on the solitary planet
        if (mainCameraRef.current && controlsRef.current) {
          const duration = 1500; // Increased duration for smoother animation
          const startPosition = {
            x: mainCameraRef.current.position.x,
            y: mainCameraRef.current.position.y,
            z: mainCameraRef.current.position.z
          };
          
          // Calculate a better viewing position
          const distance = 30; // Closer view of the planet
          const angle = Math.atan2(planetPosition[2], planetPosition[0]);
          const endPosition = {
            x: planetPosition[0] + Math.cos(angle) * distance,
            y: planetPosition[1] + 10, // Slight elevation
            z: planetPosition[2] + Math.sin(angle) * distance
          };
          
          const startTime = Date.now();
          const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3); // Cubic easing
            
            // Update camera position
            mainCameraRef.current.position.set(
              startPosition.x + (endPosition.x - startPosition.x) * eased,
              startPosition.y + (endPosition.y - startPosition.y) * eased,
              startPosition.z + (endPosition.z - startPosition.z) * eased
            );
            
            // Update controls target to center on planet
            controlsRef.current.target.set(
              planetPosition[0],
              planetPosition[1],
              planetPosition[2]
            );
            controlsRef.current.update();
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          
          animate();
        }
      }
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
<AudioManager hyperspaceActive={hyperspaceActive} />
      <Canvas 
  camera={{ 
    position: [0, 50, 100], 
    fov: 65,
    far: 2000,
    near: 0.1,
    up: [0, 1, 0]
  }} 
  onCreated={({ camera }) => {
    mainCameraRef.current = camera;
   
  }}
>
  {/* Hyperspace effect */}
   {hyperspaceActive && (
    <HyperspaceTunnel 
      active={true}
      galaxyPosition={targetGalaxyPosition}
    />
  )}

  {/* Universe reveal effect */}
  {universeRevealActive && (
    <UniverseReveal active={true} />
  )}

  {/* Only render scene elements when not in transition */}
  {!hyperspaceActive && !universeRevealActive && (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.2} />
      <UniverseSpheres 
        selectedGalaxy={selectedGalaxy}
        hyperspaceActive={hyperspaceActive}
        zoomPhase={zoomPhase}
      />
      <DynamicStarfield hyperspaceActive={hyperspaceActive} />
            
            <CullingManager
              galaxies={galaxies}
              solitaryPlanets={solitaryPlanets}
              selectedGalaxy={selectedGalaxy}
              searchResult={searchResult}
              calculateGalaxyPosition={calculateGalaxyPosition}
              onSetVisible={handleSetVisible}
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
                      onClick={() => handleGalaxyClick(galaxy)}
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
  enableZoom={!hyperspaceActive}
  maxDistance={selectedGalaxy ? 40 : 1000}
  minDistance={5}
  autoRotate={!selectedGalaxy && !hyperspaceActive}
  autoRotateSpeed={0.3}
  maxPolarAngle={Math.PI}
  minPolarAngle={0}
  zoomSpeed={1}
  rotateSpeed={0.5}
  panSpeed={5}
  enableDamping={true}
  dampingFactor={0.1}
  mouseButtons={{
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }}
  screenSpacePanning={true}
  enablePan={!hyperspaceActive}
  keyPanSpeed={25}
/>
          </>
        )}
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
          // In your Universe component, the Back to Universe button has an error:
// onClick={handleBackToUniverse}  // This is missing
onClick={(handleBackToUniverse) => {               // You have this nested incorrectly
  setSelectedGalaxy(null);
  setSearchResult(null);
  if (mainCameraRef.current && controlsRef.current) {
    mainCameraRef.current.position.set(0, 50, 100);
    controlsRef.current.target.set(0, 0, 0);
    controlsRef.current.update(); // This is incorrect syntax
  }
}}
        >
          Back to Universe
        </button>
      )}
      {loading && (
  <div style={{
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'white',
    background: 'rgba(0,0,0,0.8)',
    padding: '20px',
    borderRadius: '10px',
    zIndex: 1000
  }}>
    Loading Transactions: {
      galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
      solitaryPlanets.length
    }
  </div>
)}
    </div>
  );
};

export default Universe;