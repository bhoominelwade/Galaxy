import * as THREE from 'three';

class UniverseOptimizer {
  constructor() {
    this.chunks = new Map();
    this.chunkSize = 100; // Size of each chunk
    this.visibleChunks = new Set();
    this.frustum = new THREE.Frustum();
    this.projScreenMatrix = new THREE.Matrix4();
    this.boundingSpheres = new Map();
    this.dynamicParams = {
      minRadius: 200,
      maxRadius: 800,
      verticalSpread: 300,
      densityFactor: 0.8
    };
  }

  // Calculate universe size based on number of galaxies
  calculateUniverseParams(galaxyCount) {
    const scaleFactor = Math.cbrt(galaxyCount / 100); // Base scaling on cubic root
    
    this.dynamicParams = {
        minRadius: 200,    // Match your current minRadius
        maxRadius: 800,    // Match your current maxRadius
        verticalSpread: 300,  // Match your current verticalSpread
        densityFactor: 0.8
    };

    return this.dynamicParams;
  }

  // Organize galaxies into spatial chunks
  updateChunks(galaxies, positions) {
    this.chunks.clear();
    
    galaxies.forEach((galaxy, index) => {
      const pos = positions[index];
      const chunkKey = this.getChunkKey(pos);
      
      if (!this.chunks.has(chunkKey)) {
        this.chunks.set(chunkKey, []);
      }
      this.chunks.get(chunkKey).push({ galaxy, position: pos, index });
      
      // Create bounding sphere for the galaxy
      const sphere = new THREE.Sphere(
        new THREE.Vector3(...pos),
        galaxy.transactions.length * 0.5 // Radius based on size
      );
      this.boundingSpheres.set(index, sphere);
    });
  }

  // Get chunk key from position
  getChunkKey(position) {
    const x = Math.floor(position[0] / this.chunkSize);
    const y = Math.floor(position[1] / this.chunkSize);
    const z = Math.floor(position[2] / this.chunkSize);
    return `${x},${y},${z}`;
  }

  // Update visible chunks based on camera position
  updateVisibleChunks(camera) {
    this.visibleChunks.clear();
    this.frustum.setFromProjectionMatrix(
      this.projScreenMatrix.multiplyMatrices(
        camera.projectionMatrix,
        camera.matrixWorldInverse
      )
    );

    const cameraChunk = this.getChunkKey(camera.position.toArray());
    const renderDistance = 2; // Number of chunks to render in each direction

    // Check nearby chunks
    for (let x = -renderDistance; x <= renderDistance; x++) {
      for (let y = -renderDistance; y <= renderDistance; y++) {
        for (let z = -renderDistance; z <= renderDistance; z++) {
          const [baseX, baseY, baseZ] = cameraChunk.split(',').map(Number);
          const checkChunk = `${baseX + x},${baseY + y},${baseZ + z}`;
          
          if (this.chunks.has(checkChunk)) {
            this.visibleChunks.add(checkChunk);
          }
        }
      }
    }
  }

  // Check if a galaxy should be rendered
  shouldRenderGalaxy(galaxyIndex, position) {
    const chunkKey = this.getChunkKey(position);
    if (!this.visibleChunks.has(chunkKey)) return false;

    // Frustum culling check
    const sphere = this.boundingSpheres.get(galaxyIndex);
    if (!sphere) return true;
    
    return this.frustum.intersectsSphere(sphere);
  }

  // LOD system for galaxies
  getLODLevel(distance) {
    if (distance > 1000) return 0; // Lowest detail
    if (distance > 500) return 1; // Medium detail
    return 2; // Highest detail
  }

  // Get optimized transaction count based on LOD
  getOptimizedTransactionCount(originalCount, lodLevel) {
    switch (lodLevel) {
      case 0: return Math.min(originalCount, 50);  // Show max 50 transactions
      case 1: return Math.min(originalCount, 200); // Show max 200 transactions
      case 2: return originalCount;                // Show all transactions
      default: return originalCount;
    }
  }

  // Memory management
  clearUnusedData() {
    const unusedChunks = Array.from(this.chunks.keys())
      .filter(key => !this.visibleChunks.has(key));
    
    unusedChunks.forEach(key => {
      this.chunks.delete(key);
    });
  }

  // Calculate optimal rendering parameters based on performance
  getOptimalRenderParams(fps) {
    return {
      particleCount: fps < 30 ? 1000 : 5000,
      enableBloom: fps > 40,
      enableSSAO: fps > 50,
      chunkSize: fps < 30 ? 150 : 100
    };
  }
}

export default UniverseOptimizer;