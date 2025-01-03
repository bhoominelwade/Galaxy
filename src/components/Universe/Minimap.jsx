import { Canvas } from '@react-three/fiber';
import MinimapContent from './MinimapContent';

const Minimap = ({ mainCamera, galaxyPositions, selectedGalaxy }) => {
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
          position: [0, 200, 0],
          fov: 50,
          near: 1,
          far: 1000,
          rotation: [-Math.PI / 2, 0, 0]
        }}
        style={{ cursor: 'pointer' }}
      >
        <MinimapContent 
          mainCamera={mainCamera}
          galaxyPositions={galaxyPositions}
          selectedGalaxy={selectedGalaxy}
        />
      </Canvas>
    </div>
  );
};

export default Minimap;