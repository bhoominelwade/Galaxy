import React, { useState, useEffect } from 'react';
import { TrendingUp } from 'lucide-react';

//TransactionAnalytics Component - Displays top 3 transactions in a floating panel
const TransactionAnalytics = ({ transactions = [] }) => {
  const [topTransactions, setTopTransactions] = useState([]);

  // Update top transactions periodically
  useEffect(() => {
    const updateTopTransactions = () => {
      const sorted = [...transactions].sort((a, b) => b.amount - a.amount);
      setTopTransactions(sorted.slice(0, 3));
    };

    updateTopTransactions();
    const interval = setInterval(updateTopTransactions, 30000);
    return () => clearInterval(interval);
  }, [transactions]);

  // Styles
  const styles = {
    container: {
      position: 'absolute',
      bottom: '1rem',
      left: '1rem',
      zIndex: 10,
      color: 'white',
      background: 'rgba(0, 0, 0, 0.7)',
      padding: '1rem',
      borderRadius: '0.5rem',
      fontFamily: 'monospace',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      minWidth: '300px'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginBottom: '0.75rem',
      borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
      paddingBottom: '0.5rem'
    },
    title: {
      fontWeight: 'bold'
    },
    transactionList: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem'
    },
    transactionItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.5rem',
      background: 'rgba(255, 255, 255, 0.05)',
      borderRadius: '0.25rem',
    },
    hash: {
      opacity: 0.8
    },
    amount: {
      color: '#4ade80'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <TrendingUp size={20} />
        <span style={styles.title}>NOVA Analytics</span>
      </div>

      <div style={styles.transactionList}>
        {topTransactions.map((tx) => (
          <div key={tx.hash} style={styles.transactionItem}>
            <span style={styles.hash}>{tx.hash.slice(0, 8)}...</span>
            <span style={styles.amount}>{tx.amount.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionAnalytics;