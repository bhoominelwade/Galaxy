import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import SpiralGalaxy from './SpiralGalaxy';
import Planet from './Planet';

const Universe = () => {
  const [galaxies, setGalaxies] = useState([]);
  const [solitaryPlanets, setSolitaryPlanets] = useState([]);
  const [selectedGalaxy, setSelectedGalaxy] = useState(null);
  const [loading, setLoading] = useState(true);

  
  // Your existing groupTransactionsIntoGalaxies function remains the same...

  const groupTransactionsIntoGalaxies = (transactions) => {
    const sortedTransactions = [...transactions].sort((a, b) => b.amount - a.amount);
    const galaxies = [];
    let currentGalaxy = [];
    let currentSum = 0;
    const MAX_GALAXY_AMOUNT = 700;
    let remainingPlanets = [];
  
    for (const tx of sortedTransactions) {
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
      if (currentSum >= 200) {
        galaxies.push({
          transactions: currentGalaxy,
          totalAmount: currentSum
        });
      } else {
        remainingPlanets.push(...currentGalaxy);
      }
    }
  
    return { galaxies, solitaryPlanets: remainingPlanets };
  };


  useEffect(() => {
    const fetchAndProcessTransactions = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/transactions');
        const data = await response.json();
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

  // Optimized galaxy positioning
  const calculateGalaxyPosition = (index, total) => {
    // Increased base parameters for wider spread
    const minRadius = 35;    // Increased from 25
    const maxRadius = 70;    // Increased from 45
    const verticalSpread = 35;  // Increased from 20
    const spiralFactor = 3;     // Increased from 2
    
    // Enhanced random factors
    const randomRadius = minRadius + Math.random() * (maxRadius - minRadius);
    const randomVerticalOffset = (Math.random() - 0.5) * verticalSpread;
    const randomSpread = (Math.random() - 0.5) * 25; // Increased from 10
    
    // More chaotic angle calculation
    const baseAngle = (index / total) * Math.PI * spiralFactor;
    const randomAngleOffset = (Math.random() - 0.5) * 1.0; // Increased from 0.3
    const finalAngle = baseAngle + randomAngleOffset;
    
    // Add more random variation to each axis
    const xSpread = (Math.random() - 0.5) * 20;
    const ySpread = (Math.random() - 0.5) * 15;
    const zSpread = (Math.random() - 0.5) * 20;
    
    // Calculate base position
    const x = Math.cos(finalAngle) * (randomRadius + index * 2) + randomSpread;
    const y = randomVerticalOffset + Math.sin(baseAngle * 2) * (verticalSpread / 1.5);
    const z = Math.sin(finalAngle) * (randomRadius + index * 2) + randomSpread;

    // Add final random offsets
    const jitter = 8;  // Increased from 3
    const finalPosition = [
      x + xSpread + (Math.random() - 0.5) * jitter,
      y + ySpread + (Math.random() - 0.5) * jitter,
      z + zSpread + (Math.random() - 0.5) * jitter
    ];

    return finalPosition;
  };

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000000' }}>
      <Canvas camera={{ position: [0, 50, 100], fov: 65 }}>  {/* Slightly wider FOV */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.8} />
        
        <Stars 
          radius={100}
          depth={40}
          count={5000}
          factor={10}
          saturation={1}
          fade={true}
          speed={0.3}
        />
        
        <Stars 
          radius={80}
          depth={30}
          count={2000}
          factor={15}
          saturation={1}
          fade={true}
          speed={0.2}
        />

        {selectedGalaxy ? (
          <SpiralGalaxy 
            transactions={selectedGalaxy.transactions}
            position={[0, 0, 0]}
            isSelected={true}
            colorIndex={galaxies.findIndex(g => g === selectedGalaxy)}
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
                size={0.5 + (tx.amount / 1000)}
                colorIndex={index}
              />
            ))}
          </>
        )}

        <OrbitControls 
          enableZoom={true}
          maxDistance={selectedGalaxy ? 40 : 150}  // Closer zoom limit when galaxy selected
          minDistance={selectedGalaxy ? 15 : 60}   // Allows closer inspection of planets
          autoRotate={!selectedGalaxy}
          autoRotateSpeed={0.3}
          maxPolarAngle={Math.PI * 0.65}
          minPolarAngle={Math.PI * 0.25}
          zoomSpeed={0.5}
          rotateSpeed={0.5}
          enableDamping={true}
          dampingFactor={0.05}
        />
      </Canvas>

      {/* Back button remains the same */}
      {selectedGalaxy && (
        <button
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            padding: '10px 20px',
            background: 'rgba(255,255,255,0.1)',
            color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '5px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            ':hover': {
              background: 'rgba(255,255,255,0.2)'
            }
          }}
          onClick={() => setSelectedGalaxy(null)}
        >
          Back to Universe
        </button>
      )}
    </div>
  );
};

export default Universe;