// src/components/Universe/hooks/useWebSocket.js
import { useState, useEffect, useRef } from 'react';

const WS_URL = 'ws://localhost:3000';
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const useWebSocket = ({
  handleNewTransaction,
  processedTransactions,
  groupTransactionsIntoGalaxies,
  setGalaxies,
  setSolitaryPlanets,
  galaxyPositionsRef
}) => {
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const mountedRef = useRef(true);
  const reconnectTimeoutRef = useRef(null);
  const initialDataReceivedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    const cleanup = () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
      reconnectAttemptsRef.current = 0;
    };

    const handleMessage = async (message) => {
      try {
        switch (message.type) {
          case 'initial':
            if (!initialDataReceivedRef.current && Array.isArray(message.data)) {
              console.log('Received initial data:', message.data.length, 'transactions');
              const uniqueTransactions = message.data.filter(tx => {
                if (!tx || !tx.hash || processedTransactions.current.has(tx.hash)) return false;
                processedTransactions.current.add(tx.hash);
                return true;
              });
              
              if (uniqueTransactions.length > 0) {
                const result = groupTransactionsIntoGalaxies(uniqueTransactions);
                setGalaxies(prevGalaxies => {
                  const newGalaxies = [...prevGalaxies];
                  if (result.galaxies) {
                    newGalaxies.push(...result.galaxies);
                  }
                  return newGalaxies;
                });
                setSolitaryPlanets(prevPlanets => {
                  const newPlanets = [...prevPlanets];
                  if (result.solitaryPlanets) {
                    newPlanets.push(...result.solitaryPlanets);
                  }
                  return newPlanets;
                });
              }
              initialDataReceivedRef.current = true;
            }
            break;

          case 'update':
            if (message.data && message.data.hash && !processedTransactions.current.has(message.data.hash)) {
              console.log('Received new transaction:', message.data.hash);
              processedTransactions.current.add(message.data.hash);
              handleNewTransaction(message.data);
            }
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    };

    const connectWebSocket = () => {
      if (!mountedRef.current || wsRef.current) return;

      try {
        console.log('Attempting WebSocket connection...');
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!mountedRef.current) return;
          console.log('WebSocket connected successfully');
          setWsConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        ws.onclose = (event) => {
          if (!mountedRef.current) return;
          console.log(`WebSocket closed with code: ${event.code}`);
          setWsConnected(false);
          wsRef.current = null;

          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttemptsRef.current++;
            console.log(`Scheduling reconnection attempt ${reconnectAttemptsRef.current}`);
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, RECONNECT_DELAY);
          }
        };

        ws.onerror = (error) => {
          if (!mountedRef.current) return;
          console.error('WebSocket error:', error);
        };

        ws.onmessage = (event) => {
          if (!mountedRef.current) return;
          try {
            const message = JSON.parse(event.data);
            handleMessage(message);
          } catch (error) {
            console.error('Error parsing message:', error);
          }
        };
      } catch (error) {
        console.error('Error creating WebSocket:', error);
        wsRef.current = null;
        
        if (mountedRef.current && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, RECONNECT_DELAY);
        }
      }
    };

    connectWebSocket();
    return cleanup;
  }, [handleNewTransaction, groupTransactionsIntoGalaxies, setGalaxies, setSolitaryPlanets]);

  return {
    wsConnected,
    reconnectAttempts: reconnectAttemptsRef.current
  };
};