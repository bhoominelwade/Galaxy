//Manages the spatial distribution of planets in orbital rings


export class PlanetSpacingManager {
  // Default orbital configurations
  static DEFAULT_ORBIT_RANGES = [
    { radius: 15, width: 0.2, maxPlanets: 2 },
    { radius: 25, width: 0.2, maxPlanets: 3 },
    { radius: 35, width: 0.2, maxPlanets: 3 },
    { radius: 45, width: 0.2, maxPlanets: 4 },
    { radius: 55, width: 0.2, maxPlanets: 4 },
    { radius: 65, width: 0.2, maxPlanets: 5 }
  ];

 
  constructor(minDistance = 8) {
    this.occupiedPositions = [];
    this.minDistance = minDistance;
    this.orbitRanges = PlanetSpacingManager.DEFAULT_ORBIT_RANGES;
    this.orbitOccupancy = new Map(
      this.orbitRanges.map(orbit => [orbit.radius, []])
    );
  }


//Find largest angular gap in an orbit
  findLargestGap(angles) {
    angles.sort((a, b) => a - b);
    let maxGap = 0;
    let gapStart = 0;
    
    for (let i = 0; i < angles.length; i++) {
      const nextIndex = (i + 1) % angles.length;
      const gap = nextIndex === 0 
        ? (Math.PI * 2 - angles[i]) + angles[0]
        : angles[nextIndex] - angles[i];
        
      if (gap > maxGap) {
        maxGap = gap;
        gapStart = angles[i];
      }
    }
    
    return { gapStart, maxGap };
  }


  //Calculate optimal angle for new planet placement
  calculateOptimalAngle(existingAngles) {
    if (existingAngles.length === 0) {
      return Math.random() * Math.PI * 2;
    }

    const { gapStart, maxGap } = this.findLargestGap(existingAngles);
    return gapStart + (maxGap / 2);
  }


//Select least occupied available orbit
  selectOptimalOrbit() {
    const availableOrbits = this.orbitRanges.filter(orbit => 
      (this.orbitOccupancy.get(orbit.radius) || []).length < orbit.maxPlanets
    );

    if (availableOrbits.length === 0) {
      return null;
    }

    return availableOrbits.reduce((prev, curr) => 
      (this.orbitOccupancy.get(curr.radius) || []).length <
      (this.orbitOccupancy.get(prev.radius) || []).length ? curr : prev
    );
  }

  //Calculate position coordinates from angle and orbit
  calculatePosition(angle, orbitRadius) {
    return [
      Math.cos(angle) * orbitRadius,
      (Math.random() - 0.5) * 0.2, // Minimal vertical variation
      Math.sin(angle) * orbitRadius
    ];
  }


//Find valid position for new planet
  findValidPosition(attempt = 0, maxAttempts = 50) {
    if (attempt >= maxAttempts) {
      console.warn('Max attempts reached for finding valid position');
      return [0, 0, 0];
    }

    const orbit = this.selectOptimalOrbit();
    if (!orbit) {
      return [0, 0, 0];
    }

    const existingAngles = (this.orbitOccupancy.get(orbit.radius) || [])
      .map(p => p.angle);
    
    const angle = this.calculateOptimalAngle(existingAngles);
    const position = this.calculatePosition(angle, orbit.radius);

    if (this.isPositionValid(position, orbit.radius, angle)) {
      this.addPosition(position, orbit.radius, angle);
      return position;
    }

    return this.findValidPosition(attempt + 1, maxAttempts);
  }
};