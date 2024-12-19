export class PlanetSpacingManager {
  constructor(minDistance = 8) {  // Increased minimum distance
    this.occupiedPositions = [];
    this.minDistance = minDistance;
    this.orbitRanges = [
      { radius: 15, width: 0.2, maxPlanets: 2 },  // Reduced maxPlanets and increased spacing
      { radius: 25, width: 0.2, maxPlanets: 3 },
      { radius: 35, width: 0.2, maxPlanets: 3 },
      { radius: 45, width: 0.2, maxPlanets: 4 },
      { radius: 55, width: 0.2, maxPlanets: 4 },
      { radius: 65, width: 0.2, maxPlanets: 5 }
    ];
    this.orbitOccupancy = new Map(
      this.orbitRanges.map(orbit => [orbit.radius, []])
    );
  }

  // ... [previous methods remain the same until findValidPosition]

  findValidPosition(attempt = 0, maxAttempts = 50) {
    if (attempt >= maxAttempts) {
      console.warn('Max attempts reached for finding valid position');
      return [0, 0, 0];
    }

    // Select orbit with preference for less occupied ones
    const availableOrbits = this.orbitRanges.filter(orbit => 
      (this.orbitOccupancy.get(orbit.radius) || []).length < orbit.maxPlanets
    );

    if (availableOrbits.length === 0) {
      return [0, 0, 0];
    }

    // Prefer orbits with fewer planets
    const orbit = availableOrbits.reduce((prev, curr) => 
      (this.orbitOccupancy.get(curr.radius) || []).length <
      (this.orbitOccupancy.get(prev.radius) || []).length ? curr : prev
    );

    // Generate angle with wider spacing
    const existingAngles = (this.orbitOccupancy.get(orbit.radius) || [])
      .map(p => p.angle);
    let angle;
    
    if (existingAngles.length > 0) {
      // Find the largest gap between existing planets
      existingAngles.sort((a, b) => a - b);
      let maxGap = 0;
      let gapStart = 0;
      
      for (let i = 0; i < existingAngles.length; i++) {
        const gap = i === existingAngles.length - 1 
          ? (Math.PI * 2 - existingAngles[i]) + existingAngles[0]
          : existingAngles[i + 1] - existingAngles[i];
          
        if (gap > maxGap) {
          maxGap = gap;
          gapStart = existingAngles[i];
        }
      }
      
      // Place new planet in the middle of the largest gap
      angle = gapStart + (maxGap / 2);
    } else {
      // Random angle for first planet in orbit
      angle = Math.random() * Math.PI * 2;
    }

    // Calculate position with reduced vertical variation
    const x = Math.cos(angle) * orbit.radius;
    const z = Math.sin(angle) * orbit.radius;
    const y = (Math.random() - 0.5) * 0.2; // Reduced vertical variation

    const position = [x, y, z];

    if (this.isPositionValid(position, orbit.radius, angle)) {
      this.addPosition(position, orbit.radius, angle);
      return position;
    }

    return this.findValidPosition(attempt + 1, maxAttempts);
  }
}