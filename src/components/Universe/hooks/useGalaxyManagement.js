import { useCallback } from 'react';
import * as THREE from 'three';

export const useGalaxyManagement = ({
  setGalaxies,
  setSolitaryPlanets,
  selectedGalaxy,
  setSelectedGalaxy,
  galaxyPositionsRef
}) => {
  const calculateGalaxyPosition = useCallback((index, total) => {
    if (galaxyPositionsRef.current.has(index)) {
      return galaxyPositionsRef.current.get(index);
    }
  
    const minRadius = 100;
    const maxRadius = 300;
    const verticalSpread = 100;
    const horizontalSpread = 300;
    
    const phi = Math.acos((Math.random() * 2) - 1);
    const theta = Math.random() * Math.PI * 2;
    const radius = minRadius + Math.random() * (maxRadius - minRadius);
    
    const x = radius * Math.sin(phi) * Math.cos(theta) + (Math.random() - 0.5) * horizontalSpread;
    const y = radius * Math.cos(phi) + (Math.random() - 0.5) * verticalSpread;
    const z = radius * Math.sin(phi) * Math.sin(theta) + (Math.random() - 0.5) * horizontalSpread;
  
    const position = [x, y, z];
    galaxyPositionsRef.current.set(index, position);
    return position;
  }, []);

  const handleNewTransaction = useCallback((newTransaction) => {
    if (newTransaction.amount > 400) {
      setSolitaryPlanets(prev => [...prev, newTransaction]);
    } else {
      setGalaxies(prev => {
        const lastGalaxy = prev[prev.length - 1];
        const currentSum = lastGalaxy?.transactions.reduce((sum, tx) => sum + tx.amount, 0) || 0;
        
        if (lastGalaxy && currentSum + newTransaction.amount <= 400) {
          const updated = [...prev];
          updated[prev.length - 1] = {
            ...lastGalaxy,
            transactions: [...lastGalaxy.transactions, newTransaction],
            totalAmount: currentSum + newTransaction.amount
          };
  
          if (selectedGalaxy === lastGalaxy) {
            setSelectedGalaxy(updated[prev.length - 1]);
          }
  
          return updated;
        }
        
        const newGalaxy = {
          transactions: [newTransaction],
          totalAmount: newTransaction.amount
        };
  
        return [...prev, newGalaxy];
      });
    }
  }, [selectedGalaxy, setSolitaryPlanets, setGalaxies, setSelectedGalaxy]);

  const groupTransactionsIntoGalaxies = (transactions) => {
    const sortedTransactions = [...transactions].sort((a, b) => b.amount - a.amount);
    const galaxies = [];
    let currentGalaxy = [];
    let currentSum = 0;
    const TARGET_GALAXY_AMOUNT = 300;
    const MAX_GALAXY_AMOUNT = 400;
  
    const soloTransactions = sortedTransactions.filter(tx => tx.amount > MAX_GALAXY_AMOUNT);
    const galaxyTransactions = sortedTransactions.filter(tx => tx.amount <= MAX_GALAXY_AMOUNT);
  
    for (const tx of galaxyTransactions) {
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
      galaxies.push({
        transactions: currentGalaxy,
        totalAmount: currentSum
      });
    }
  
    return { galaxies, solitaryPlanets: soloTransactions };
  };

  return {
    handleNewTransaction,
    calculateGalaxyPosition,
    groupTransactionsIntoGalaxies
  };
};