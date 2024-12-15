// src/components/universe/WalletSearch.jsx
import { useState } from 'react';

const WalletSearch = ({ galaxies, solitaryPlanets, onSelectGalaxy, onUpdateSearchResult }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [userTransactions, setUserTransactions] = useState([]);
  const [isWalletView, setIsWalletView] = useState(false);
  const [walletSearchError, setWalletSearchError] = useState('');

  const handleWalletSearch = async (e) => {
    e.preventDefault();
    setWalletSearchError('');
    
    const buyTransactions = galaxies.flatMap(galaxy => 
      galaxy.transactions.filter(tx => 
        tx.toAddress.toLowerCase() === walletAddress.toLowerCase()
      )
    );
  
    const solitaryBuyTransactions = solitaryPlanets.filter(tx =>
      tx.toAddress.toLowerCase() === walletAddress.toLowerCase()
    );
  
    const transactions = [...buyTransactions, ...solitaryBuyTransactions];
    setUserTransactions(transactions);
    setIsWalletView(true);
  
    if (transactions.length === 0) {
      setWalletSearchError('No transactions found for this wallet');
    }
  };

  const handleTransactionHighlight = (txHash) => {
    onUpdateSearchResult(txHash);
    
    const galaxyWithTx = galaxies.find(g => 
      g.transactions.some(tx => tx.hash === txHash)
    );
    
    onSelectGalaxy(galaxyWithTx || null);
  };

  const clearWalletSearch = () => {
    setWalletAddress('');
    setUserTransactions([]);
    setIsWalletView(false);
    setWalletSearchError('');
    onUpdateSearchResult(null);
  };

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end',
      gap: '10px',
      maxWidth: '400px'
    }}>
      <form onSubmit={handleWalletSearch} style={{
        display: 'flex',
        gap: '10px',
        width: '100%'
      }}>
        <input
          type="text"
          value={walletAddress}
          onChange={(e) => setWalletAddress(e.target.value)}
          placeholder="Enter wallet address..."
          style={{
            padding: '8px 12px',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
            color: 'white',
            outline: 'none',
            width: '250px',
            backdropFilter: 'blur(10px)',
          }}
        />
        <button type="submit" style={{
          padding: '8px 16px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
        }}>
          Search
        </button>
        {isWalletView && (
          <button
            type="button"
            onClick={clearWalletSearch}
            style={{
              padding: '8px',
              background: 'rgba(255, 77, 77, 0.2)',
              border: '1px solid rgba(255, 77, 77, 0.3)',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        )}
      </form>

      {walletSearchError && (
        <div style={{
          color: '#ff6b6b',
          background: 'rgba(0, 0, 0, 0.7)',
          padding: '8px',
          borderRadius: '4px',
        }}>
          {walletSearchError}
        </div>
      )}

      {isWalletView && userTransactions.length > 0 && (
        <div style={{
          background: 'rgba(0, 0, 0, 0.8)',
          padding: '12px',
          borderRadius: '4px',
          width: '100%',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
            color: 'white',
          }}>
            <span>Wallet: {walletAddress.slice(0, 8)}...</span>
            <span>{userTransactions.length} transactions</span>
          </div>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            color: 'white',
          }}>
            <thead>
              <tr>
                <th style={{padding: '8px', textAlign: 'left'}}>Transaction ID</th>
                <th style={{padding: '8px', textAlign: 'right'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {userTransactions.map(tx => (
                <tr key={tx.hash} style={{
                  borderTop: '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onClick={() => handleTransactionHighlight(tx.hash)}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                  <td style={{padding: '8px'}}>{tx.hash.slice(0,10)}...</td>
                  <td style={{padding: '8px', textAlign: 'right'}}>{tx.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default WalletSearch;