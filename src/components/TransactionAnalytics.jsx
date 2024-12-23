import React from 'react';
import { TrendingUp } from 'lucide-react';

const TransactionAnalytics = ({ galaxies = [], solitaryPlanets = [], handleTransactionHighlight }) => {
  return (
    <div style={{
      position: 'absolute',
      bottom: '1rem',
      left: '76rem',
      zIndex: 10,
      color: 'white',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '1rem',
      borderRadius: '0.5rem',
      fontFamily: 'monospace',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      minWidth: '300px',
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
        <span style={{ fontWeight: 'bold' }}>NOVA Analytics</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
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
      </div>
    </div>
  );
};

export default TransactionAnalytics;