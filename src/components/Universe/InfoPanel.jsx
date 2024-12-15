const InfoPanel = ({ galaxies, solitaryPlanets }) => (
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
  );
  
  export default InfoPanel;