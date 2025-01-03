import { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import Minimap from './Minimap';
import StableStars from './StableStars';
import GalaxyCulling from './GalaxyCulling';
import SpiralGalaxy from './SpiralGalaxy';
import Planet from './Planet';
import WalletSearch from './WalletSearch';
import InfoPanel from './InfoPanel';
import BackButton from './BackButton';
import { useWebSocket } from './hooks/useWebSocket';
import { useGalaxyManagement } from './hooks/useGalaxyManagement';
import { useKeyboardControls } from './hooks/useKeyboardControls';

const Universe = () => {
  const [galaxies, setGalaxies] = useState([]);
  const [solitaryPlanets, setSolitaryPlanets] = useState([]);
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchResult, setSearchResult] = useState(null);
  const [visibleGalaxies, setVisibleGalaxies] = useState([]);
  const mainCameraRef = useRef();
  const controlsRef = useRef();
  const processedTransactions = useRef(new Set());
  const galaxyPositionsRef = useRef(new Map());

  const { handleNewTransaction, calculateGalaxyPosition, groupTransactionsIntoGalaxies } = useGalaxyManagement({
    setGalaxies,
    setSolitaryPlanets,
    selectedGalaxy,
    setSelectedGalaxy,
    galaxyPositionsRef
  });

  const { wsConnected } = useWebSocket({
    handleNewTransaction,
    processedTransactions,
    groupTransactionsIntoGalaxies,
    setGalaxies,
    setSolitaryPlanets,
    galaxyPositionsRef
  });

  useKeyboardControls({ controlsRef, mainCameraRef });

  // Initial data fetch
  useEffect(() => {
    const fetchAndProcessTransactions = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/transactions?limit=10000');
        const data = await response.json();
        // Extract transactions from the response
        const transactions = data.transactions || [];
        
        const { galaxies: galaxyGroups, solitaryPlanets: remainingPlanets } = 
          groupTransactionsIntoGalaxies(transactions); // Pass the transactions array
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

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000000' }}>
      <WalletSearch 
        galaxies={galaxies}
        solitaryPlanets={solitaryPlanets}
        onSelectGalaxy={setSelectedGalaxy}
        onUpdateSearchResult={setSearchResult}
      />

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
        <GalaxyCulling 
          galaxies={galaxies}
          onVisibleGalaxiesChange={setVisibleGalaxies}
          calculateGalaxyPosition={calculateGalaxyPosition}
        />
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
            {visibleGalaxies.map((galaxy, index) => (
              <SpiralGalaxy
                key={index}
                transactions={galaxy.transactions}
                position={calculateGalaxyPosition(
                  galaxies.indexOf(galaxy),
                  galaxies.length
                )}
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
          maxDistance={selectedGalaxy ? 40 : 300}
          minDistance={selectedGalaxy ? 15 : 30}
          autoRotate={!selectedGalaxy}
          autoRotateSpeed={0.3}
          maxPolarAngle={Math.PI * 0.75}
          minPolarAngle={Math.PI * 0.25}
          zoomSpeed={1}
          rotateSpeed={0.5}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>

      <Minimap 
        mainCamera={mainCameraRef.current}
        galaxyPositions={galaxyPositions}
        selectedGalaxy={selectedGalaxy ? galaxies.indexOf(selectedGalaxy) : null}
      />

      <InfoPanel 
        galaxies={galaxies}
        solitaryPlanets={solitaryPlanets}
      />

      {selectedGalaxy && (
        <BackButton 
          onBack={() => {
            setSelectedGalaxy(null);
            setSearchResult(null);
            if (mainCameraRef.current && controlsRef.current) {
              mainCameraRef.current.position.set(0, 50, 100);
              controlsRef.current.target.set(0, 0, 0);
              controlsRef.current.update();
            }
          }}
        />
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
          Loading transactions...
        </div>
      )}
    </div>
  );
};

export default Universe;