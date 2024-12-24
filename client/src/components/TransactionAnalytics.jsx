import React, { useEffect, useState } from 'react';
import { TrendingUp, BarChart2, CircleDot } from 'lucide-react';

const TransactionAnalytics = ({ galaxies = [], solitaryPlanets = [], handleTransactionHighlight }) => {
  const [newPlanet, setNewPlanet] = useState(null);
  const [prevTransactions, setPrevTransactions] = useState([]);
  const [totalVolume, setTotalVolume] = useState(0);

  useEffect(() => {
    const currentTransactions = [...galaxies.flatMap(g => g.transactions), ...solitaryPlanets];
    
    // Check for new transactions
    if (prevTransactions.length < currentTransactions.length) {
      const newestTransaction = currentTransactions[currentTransactions.length - 1];
      setNewPlanet({
        hash: newestTransaction.hash,
        amount: newestTransaction.amount,
        timestamp: Date.now()
      });
      setTimeout(() => setNewPlanet(null), 5000);
    }

    // Calculate total volume
    const volume = currentTransactions.reduce((sum, tx) => sum + tx.amount, 0);
    setTotalVolume(volume);
    
    setPrevTransactions(currentTransactions);
  }, [galaxies, solitaryPlanets]);

  return (
    
    <div style={{
      position: 'absolute',
      bottom: '1rem',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10,
      color: 'white',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '1rem',
      borderRadius: '0.5rem',
      fontFamily: 'monospace',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      minWidth: '400px',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.75rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        paddingBottom: '0.5rem'
      }}>
        <TrendingUp size={20} />
        <span style={{ fontWeight: 'bold' }}>Universe Analytics</span>
      </div>
{/* New Planet Alert */}
      {newPlanet && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.5rem',
          background: 'rgba(74, 222, 128, 0.2)',
          borderRadius: '0.25rem',
          marginBottom: '0.75rem',
          animation: 'fadeIn 0.5s ease-in'
        }}>
          <CircleDot size={16} color="#4ade80" />
          <span style={{ color: '#4ade80' }}>New Planet Found!</span>
          <span style={{ opacity: 0.8, fontSize: '0.8em' }}>
            {newPlanet.hash.slice(0, 8)}...
          </span>
        </div>
      )}
      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        marginBottom: '1rem',
        textAlign: 'center',
        padding: '0.5rem',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '0.25rem'
      }}>
        <div>
          <div style={{ opacity: 0.7, fontSize: '0.8em' }}>Galaxies</div>
          <div style={{ fontSize: '1.2em' }}>{galaxies.length}</div>
        </div>
        <div>
          <div style={{ opacity: 0.7, fontSize: '0.8em' }}>Planets</div>
          <div style={{ fontSize: '1.2em' }}>{
            galaxies.reduce((sum, g) => sum + g.transactions.length, 0) + solitaryPlanets.length
          }</div>
        </div>
        <div>
          <div style={{ opacity: 0.7, fontSize: '0.8em' }}>Volume</div>
          <div style={{ fontSize: '1.2em' }}>{totalVolume.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          })}</div>
        </div>
      </div>

      

      {/* Recent Transactions */}
      {/* <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.9em', opacity: 0.7, marginBottom: '0.25rem' }}>
          <BarChart2 size={14} style={{ marginRight: '0.5rem', display: 'inline' }}/>
          Top Transactions
        </div>
        {[...galaxies.flatMap(g => g.transactions), ...solitaryPlanets]
          .sort((a, b) => b.amount - a.amount)
          .slice(0, 3)
          .map((tx, index) => (
            <div key={tx.hash} 
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '0.5rem',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onClick={() => handleTransactionHighlight(tx.hash)}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.1)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.05)'}
            >
              <span style={{ opacity: 0.8 }}>{tx.hash.slice(0, 8)}...</span>
              <span style={{ color: '#4ade80' }}>{tx.amount.toFixed(2)}</span>
            </div>
          ))}
      </div> */}

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default TransactionAnalytics;