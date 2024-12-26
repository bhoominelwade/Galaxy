import { useState, useEffect, useRef, useCallback, memo, useMemo, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import * as THREE from 'three';
import SpiralGalaxy from './SpiralGalaxy';
import Planet from './Planet.jsx';
import UniverseSpheres from './UniverseSperese.jsx';
import DynamicStarfield from './DynamicStarfield.jsx';
import MapNavigation from './Minimap';
import CullingManager from './CullingManager';
import UniverseReveal from './UniverseReveal.jsx';
import AudioManager from './AudioManager';
import WalletSearch from './WalletSearch';
import  TransactionAnalytics from './TransactionAnalytics'
import WebGL from './WebGL'


// Constants
/* const WS_URL = window.location.protocol === 'https:' 
  ? `wss://${window.location.host}`
  : `ws://${window.location.host}`; */
const WS_URL = 'ws://localhost:3000';
const TARGET_GALAXY_AMOUNT = 6000;
const MAX_GALAXY_AMOUNT = 7000;
const PLANETS_PER_GALAXY = 10;



const Universe = () => {

  // State Management
  const [galaxies, setGalaxies] = useState([]);
  const [solitaryPlanets, setSolitaryPlanets] = useState([]);
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [userTransactions, setUserTransactions] = useState([]);
  const [isWalletView, setIsWalletView] = useState(false);
  const [walletSearchError, setWalletSearchError] = useState('');
  const [visibleObjects, setVisibleObjects] = useState(new Set());
  const [objectLODs, setObjectLODs] = useState(new Map());
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [zoomPhase, setZoomPhase] = useState('none');
  const [universeRevealActive, setUniverseRevealActive] = useState(false);
  const [statusInfo, setStatusInfo] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [wsReconnectAttempt, setWsReconnectAttempt] = useState(0);
  const reconnectTimeoutRef = useRef(null);

  // Refs
  const mainCameraRef = useRef();
  const controlsRef = useRef();
  const wsRef = useRef(null);
  const lastGalaxyRef = useRef(null);
  const processedTransactions = useRef(new Set());
  const wheelSpeed = useRef(1);
  const allTransactionsRef = useRef(new Set());
  const galaxyPositionsRef = useRef(new Map());



 
// Galaxy Position Calculator
  const calculateGalaxyPosition = useCallback((index, total) => {
    if (galaxyPositionsRef.current.has(index)) {
      return galaxyPositionsRef.current.get(index);
    }

    // Calculate position with improved distribution
    const layerSize = Math.ceil(Math.sqrt(total));
    const layer = Math.floor(index / layerSize);
    const indexInLayer = index % layerSize;
    
    const minRadius = 200;
    const maxRadius = 800;
    const verticalSpread = 300;
    const spiralFactor = 6;
    
    const layerRadiusMultiplier = (layer + 1) / Math.ceil(total / layerSize);
    const baseRadius = minRadius + (maxRadius - minRadius) * layerRadiusMultiplier;
    
    const angleOffset = (layer * Math.PI * 0.5) + (Math.random() * Math.PI * 0.25);
    const layerHeight = (layer - Math.floor(total / layerSize) / 2) * (verticalSpread / 2);
    
    const angle = (indexInLayer / layerSize) * Math.PI * 2 * spiralFactor + angleOffset;
    const radiusJitter = (Math.random() - 0.5) * baseRadius * 0.3;
    const finalRadius = baseRadius + radiusJitter;
    
    const position = [
      Math.cos(angle) * finalRadius,
      layerHeight + (Math.random() - 0.5) * verticalSpread,
      Math.sin(angle) * finalRadius
    ];
    
    galaxyPositionsRef.current.set(index, position);
    return position;
  }, []);

  const handleGalaxyClick = useCallback((galaxy) => {
    if (!mainCameraRef.current || !controlsRef.current) {
      console.warn('Camera or controls not initialized');
      return;
    }
  
    
    const initialGalaxy = {
      ...galaxy,
      transactions: galaxy.transactions.slice(0, 15) 
    };
    setSelectedGalaxy(initialGalaxy);
    
    const camera = mainCameraRef.current;
    const controls = controlsRef.current;
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 2000;
    const startTime = Date.now();
  
    // Side view position (more to the side and slightly elevated)
    const finalPosition = new THREE.Vector3(50, 15, 0);
    const finalTarget = new THREE.Vector3(0, 0, 0);
    
    const zoomAnimation = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const eased = 1 - Math.pow(1 - progress, 4);
      
      // Calculate spiral path but maintaining side view approach
      const angle = progress * Math.PI * 1.5; // Reduced rotation for side approach
      const radius = startPosition.length() * (1 - eased) + 50 * eased;
      const spiralX = Math.cos(angle) * radius * (1 - eased) + finalPosition.x * eased;
      const spiralZ = Math.sin(angle) * radius * (1 - eased);
      const height = startPosition.y * (1 - eased) + finalPosition.y * eased;
      
      camera.position.set(
        spiralX,
        height,
        spiralZ
      );
      
      // Smoothly move target
      controls.target.lerpVectors(startTarget, finalTarget, eased);
      controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(zoomAnimation);
      } else {
        // Animation complete - now progressively add remaining planets
        loadRemainingPlanets();
      }
    };
    
    const loadRemainingPlanets = () => {
      let currentCount = 15;
      const batchSize = 5; // Add 5 planets at a time
      const totalPlanets = galaxy.transactions.length;
      
      const addNextBatch = () => {
        if (currentCount >= totalPlanets) return;
        
        const nextBatch = Math.min(currentCount + batchSize, totalPlanets);
        setSelectedGalaxy(prev => ({
          ...galaxy,
          transactions: galaxy.transactions.slice(0, nextBatch)
        }));
        
        currentCount = nextBatch;
        
        // Schedule next batch
        setTimeout(() => requestAnimationFrame(addNextBatch), 50);
      };
      
      // Start adding planets
      requestAnimationFrame(addNextBatch);
    };
    
    // Start the animation
    zoomAnimation();
  }, [galaxies, calculateGalaxyPosition]);

  const handleBackToUniverse = useCallback(() => {
    if (!mainCameraRef.current || !controlsRef.current) {
      console.warn('Camera or controls not initialized');
      return;
    }
  
    console.log('Back to Universe clicked');
    setStatusInfo('');
    
    const camera = mainCameraRef.current;
    const controls = controlsRef.current;
    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const duration = 2000;
    const startTime = Date.now();

    // Final universe view position
    const finalPosition = new THREE.Vector3(0, 50, 100);
    const finalTarget = new THREE.Vector3(0, 0, 0);
    
    const zoomOutAnimation = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing function
      const eased = 1 - Math.pow(1 - progress, 4);
      
      // Calculate spiral path outward
      const angle = progress * Math.PI * 1.5; // Matching zoom-in rotation
      const radius = startPosition.length() * (1 - eased) + finalPosition.length() * eased;
      const spiralX = Math.cos(angle) * radius;
      const spiralZ = Math.sin(angle) * radius;
      const height = startPosition.y * (1 - eased) + finalPosition.y * eased;
      
      camera.position.set(
        spiralX,
        height,
        spiralZ
      );
      
      // Smoothly move target
      controls.target.lerpVectors(startTarget, finalTarget, eased);
      controls.update();
      
      if (progress < 1) {
        requestAnimationFrame(zoomOutAnimation);
      } else {
        // Only reset selection after animation completes
        setSelectedGalaxy(null);
        setSearchResult(null);
      }
    };
    
    zoomOutAnimation();
  }, [selectedGalaxy, galaxies, calculateGalaxyPosition]);

// Add useEffect to monitor state changes

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

    const uniqueTransactions = Array.from(
      new Map(transactions.map(tx => [tx.hash, tx])).values()
    );
    
    const sortedTransactions = [...uniqueTransactions].sort((a, b) => b.amount - a.amount);
    const galaxies = [];
    let currentGalaxy = [];
    let currentSum = 0;
    
    for (const tx of sortedTransactions) {
      currentGalaxy.push(tx);
      currentSum += tx.amount;
      
      if (currentGalaxy.length >= PLANETS_PER_GALAXY) {
        galaxies.push({
          transactions: currentGalaxy,
          totalAmount: currentSum
        });
        currentGalaxy = [];
        currentSum = 0;
      }
    }

    if (currentGalaxy.length > 0) {
      if (currentGalaxy.length >= 13) {
        galaxies.push({
          transactions: currentGalaxy,
          totalAmount: currentSum
        });
      } else {
        currentGalaxy.forEach((tx, index) => {
          const targetGalaxy = galaxies[index % galaxies.length];
          targetGalaxy.transactions.push(tx);
          targetGalaxy.totalAmount += tx.amount;
        });
      }
    }

    return { galaxies, solitaryPlanets: [] };
  }, []);
 


  // Add smart galaxy management
  const handleNewTransaction = useCallback((newTransaction) => {
    console.log('Processing new transaction:', newTransaction.hash);
    
    // Don't process if already seen
    if (processedTransactions.current.has(newTransaction.hash)) {
      console.log('Transaction already processed:', newTransaction.hash);
      return;
    }
    
    processedTransactions.current.add(newTransaction.hash);
    
    // Update state
    setGalaxies(prevGalaxies => {
      const existingTransactions = prevGalaxies.flatMap(g => g.transactions);
      const allTransactions = [...existingTransactions, ...solitaryPlanets, newTransaction];
      
      const { galaxies: newGalaxies, solitaryPlanets: newSolitaryPlanets } = 
        groupTransactionsIntoGalaxies(allTransactions);
      
      // Update solitary planets
      setSolitaryPlanets(newSolitaryPlanets);
      
      return newGalaxies;
    });
    
    console.log('Transaction processed:', newTransaction.hash);
  }, [solitaryPlanets, groupTransactionsIntoGalaxies]);

  const transactionProcessor = useMemo(() => {
    let processingQueue = [];
    let isProcessing = false;
    
    return {
      addTransaction: (transaction) => {
        processingQueue.push(transaction);
        if (!isProcessing) {
          isProcessing = true;
          setTimeout(() => {
            const batch = processingQueue.splice(0, 50);
            batch.forEach(tx => handleNewTransaction(tx));
            isProcessing = false;
          }, 100);
        }
      }
    };
  }, [handleNewTransaction]);

  useEffect(() => {
    console.log('Establishing WebSocket connection...');
    const ws = new WebSocket(WS_URL);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setWsConnected(true);
      ws.send(JSON.stringify({ type: 'requestInitial' }));
    };
  
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        if (message.type === 'initial') {
          if (galaxies.length === 0 && solitaryPlanets.length === 0) {
            const { galaxies: newGalaxies, solitaryPlanets: newPlanets } = 
              groupTransactionsIntoGalaxies(message.data);
            setGalaxies(newGalaxies);
            setSolitaryPlanets(newPlanets);
          }
        } else if (message.type === 'update') {
          transactionProcessor.addTransaction(message.data);
        }
      } catch (error) {
        console.error('Error processing WebSocket message:', error);
      }
    };
  
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  
    ws.onclose = (event) => {
      if (event.code !== 1000) {
        console.log('WebSocket disconnected unexpectedly, attempting to reconnect...');
        setWsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(() => {
          wsRef.current = new WebSocket(WS_URL);
        }, 5000);
      }
    };
  
    wsRef.current = ws;
  
    // Cleanup function
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close(1000, 'Component unmounting');
      }
    };
  }, [transactionProcessor]); // Empty dependency array - only run on mount

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
        try {
          const initialResponse = await fetch('http://localhost:3000/api/transactions?offset=0&limit=1');
          if (!initialResponse.ok) {
            throw new Error(`HTTP error! status: ${initialResponse.status}`);
          }
          const initialData = await initialResponse.json();
          total = initialData.total;
          console.log(`Total transactions to load: ${total}`);
        } catch (error) {
          console.error('Error fetching initial count:', error);
          setLoading(false);
          return;
        }
      
        // Then fetch all transactions in batches
        while (offset < total) {
          try {
            const response = await fetch(
              `http://localhost:3000/api/transactions?offset=${offset}&limit=1000`
            );
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.transactions || !Array.isArray(data.transactions)) {
              throw new Error("Received invalid data format");
            }
      
            allTransactions = [...allTransactions, ...data.transactions];
            console.log(`Loaded ${allTransactions.length}/${total} transactions`);
            
            // Do not update state during batch loading to improve performance
            offset += data.transactions.length;
            
            // Small delay between batches
            await new Promise(resolve => setTimeout(resolve, 50));
          } catch (error) {
            console.error('Error fetching batch:', error);
            break;
          }
        }
  
        // Process all transactions at once after loading is complete
        const { galaxies: finalGalaxies, solitaryPlanets: finalPlanets } = 
          groupTransactionsIntoGalaxies(allTransactions);
        
        // Update state only once at the end
        setGalaxies(finalGalaxies);
        setSolitaryPlanets(finalPlanets);
        setInitialLoadComplete(true);
        setLoading(false);
  
        console.log(`Final load complete. Total transactions: ${allTransactions.length}`);
        
      } catch (error) {
        console.error('Error in fetchAndProcessTransactions:', error);
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
    
    const galaxyWithTx = galaxies.find(g => 
      g.transactions.some(tx => tx.hash === txHash)
    );
    
    if (galaxyWithTx) {
      setSelectedGalaxy(galaxyWithTx);
      setStatusInfo(`Selected Transaction: ${txHash.slice(0, 8)}... in Galaxy with ${galaxyWithTx.transactions.length} planets`);
    } else {
      const solitaryPlanet = solitaryPlanets.find(tx => tx.hash === txHash);
      if (solitaryPlanet) {
        setSelectedGalaxy(null);
        setStatusInfo(`Selected Solitary Planet - Amount: ${solitaryPlanet.amount.toFixed(2)}`);
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

    useEffect(() => {
      const camera = mainCameraRef.current;
      const controls = controlsRef.current;
      if (camera && controls) {
        console.log('Camera and controls initialized');
      }
    }, [mainCameraRef, controlsRef]);
    
  
    
    useEffect(() => {
      if (selectedGalaxy) {
        console.log('Selected galaxy:', galaxies.indexOf(selectedGalaxy));
        console.log('Galaxy transactions:', selectedGalaxy.transactions.length);
      }
    }, [selectedGalaxy, galaxies]);
   

    return (
      <div style={{ width: '100vw', height: '100vh', background: '#000000' }}>
       <AudioManager 
        isMapExpanded={isMapExpanded}
      />
  
        <WalletSearch 
      galaxies={galaxies}
      solitaryPlanets={solitaryPlanets}
      onTransactionSelect={(hash, galaxy) => {
        setSearchResult(hash);
        setSelectedGalaxy(galaxy);
      }}
      mainCameraRef={mainCameraRef}
      controlsRef={controlsRef}
      calculateGalaxyPosition={calculateGalaxyPosition}
    />
  
  <div style={{
  position: 'fixed',
  bottom: 0,
  right: 200, // Changed from left: 1300 to right: 0
  zIndex: 10,
  maxWidth: '100%', // Ensure it doesn't overflow on smaller screens
  width: 'auto', // Let it take natural width
  padding: '20px', // Add some padding from screen edge
  display: 'flex',
  justifyContent: 'flex-end', // Align to the right
  '@media (max-width: 768px)': { // Add responsive behavior for smaller screens
    width: '100%', // Full width on mobile
    padding: '10px' // Smaller padding on mobile
  }
}}>
  <TransactionAnalytics 
    galaxies={galaxies}
    solitaryPlanets={solitaryPlanets}
    handleTransactionHighlight={handleTransactionHighlight}
  />
</div>
  
        {/* Main Canvas */}
        <Canvas 
          camera={{ 
            position: [0, 50, 100], 
            fov: 65,
            far: 2000,
            near: 0.1,
            up: [0, 1, 0]
          }} 
          onCreated={({ gl, camera }) => {
            mainCameraRef.current = camera;
            
            gl.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            gl.shadowMap.enabled = true;
            gl.shadowMap.type = THREE.PCFSoftShadowMap;
            gl.powerPreference = 'high-performance';
            gl.preserveDrawingBuffer = true;
          }}
          fallback={
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              color: 'white',
              background: 'rgba(0,0,0,0.8)',
              padding: '20px',
              borderRadius: '10px'
            }}>
              Loading 3D Scene...
            </div>
          }
        >
          <Suspense fallback={null}>
            <WebGL/>
  
            {universeRevealActive && (
              <UniverseReveal active={true} />
            )}
  
            {!universeRevealActive && (
              <>
                <ambientLight intensity={0.4} />
                <pointLight position={[10, 10, 10]} intensity={1.2} />
                <UniverseSpheres 
                  selectedGalaxy={selectedGalaxy}
                  zoomPhase={zoomPhase}
                />
                <DynamicStarfield />
                
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
                          baseSize={2}
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
                  maxDistance={selectedGalaxy ? 40 : 1000}
                  minDistance={5}
                  autoRotate={!selectedGalaxy}
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
                  enablePan={true}
                  keyPanSpeed={25}
                />
              </>
            )}
          </Suspense>
        </Canvas>
  
        {/* Status Info */}
        {
        <div style={{ 
          position: 'absolute', 
          bottom: '5rem',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          color: 'white',
          background: 'rgba(0,0,0,0.7)',
          padding: '0.75rem 1.5rem',
          borderRadius: '0.5rem',
          fontFamily: 'monospace',
          fontSize: '1.1rem',
          maxWidth: '80%',
          textAlign: 'center',
          opacity: statusInfo ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }}>
          {statusInfo}
        </div>
}
  
        {/* Minimap */}
        {!selectedGalaxy && (
  <MapNavigation 
    mainCamera={mainCameraRef.current}
    controlsRef={controlsRef}
    galaxyPositions={galaxyPositions}
    onNavigate={() => {}}
    selectedGalaxy={null}
    onExpandChange={setIsMapExpanded} 
  />
)}
  
        {/* Stats */}
        {/* <div style={{ 
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
        </div> */}
  
        {/* Back to Universe Button */}
        {selectedGalaxy && (
         <button
        style={{
      position: 'absolute',
      top: '20px',
      left: '20px',
      padding: '10px',
      background: 'rgba(0, 0, 0, 0.3)',
      color: 'white',
      border: '1px solid rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',  // Changed to make it perfectly circular
      cursor: 'pointer',
      backdropFilter: 'blur(4px)',
      transition: 'all 0.4s ease-in-out',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',  // Added to center the icon
      gap: '8px',
      fontSize: '14px',
      height: '55px',
      width: '55px',  // Changed minWidth to width for exact sizing
      outline: 'none',  // Added to remove focus outline
      zIndex: 1000,   // Match other button widths
        }}
       onMouseEnter={(e) => {
      e.target.style.border = '1px solid rgba(0, 157, 255, 0.8)';  // Added blue border
      e.target.style.boxShadow = '0 0 10px rgba(0, 157, 255, 0.3)';  // Added subtle blue glow
    }}
    onMouseLeave={(e) => {
      e.target.style.background = 'rgba(0, 0, 0, 0.3)';
      e.target.style.transform = 'scale(1)';
      e.target.style.border = '1px solid rgba(255, 255, 255, 0.2)';  // Reset border
      e.target.style.boxShadow = 'none';  // Remove glow
    }}
    onClick={handleBackToUniverse}
    aria-label="Back to Universe"
  >
    <i 
      className="ri-arrow-left-line" 
      style={{ 
        fontSize: '1.2em',
        pointerEvents: 'none',
        transition: 'color 0.4s ease-in-out' // Added to prevent icon from interfering with hover
      }} 
    />
  </button>
      )}
      {loading && galaxies.length === 0 && (
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
    <div>Loading Initial Transactions...</div>
    {galaxies.length > 0 && (
      <div>
        Processed: {
          galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + 
          solitaryPlanets.length
        }
      </div>
    )}
  </div>
)}
    </div>
  );
};

export default Universe;