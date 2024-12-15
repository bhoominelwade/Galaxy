import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { tokenMetricsService } from './database.js';

const app = express();
const PORT = 3000;

// Create HTTP server
const server = createServer(app);

// Create WebSocket server attached to HTTP server
const wss = new WebSocketServer({ server });
const sentTransactions = new Set();

app.use(cors());
app.use(express.json());

// Track connected clients
const clients = new Set();

// WebSocket connection handling
wss.on('connection', async (ws) => {
  console.log('Client connected to WebSocket');
  clients.add(ws);

  try {
    // Send all existing transactions at once
    const { transactions, total } = await tokenMetricsService.getTransactions(10000);
    
    if (transactions && Array.isArray(transactions)) {
      transactions.forEach(tx => sentTransactions.add(tx.hash));
      
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({
          type: 'initial',
          data: transactions,
          total: total,
          batchSize: transactions.length
        }));
      }
    } else {
      console.error('Invalid transactions data received:', transactions);
    }
  } catch (error) {
    console.error('Error sending initial data:', error);
  }

  // Handle client disconnection
  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clients.delete(ws);
  });
});

// Function to broadcast updates
const broadcastUpdate = async (transaction) => {
  try {
    const total = await tokenMetricsService.getRealTransactionCount();
    
    const message = JSON.stringify({
      type: 'update',
      data: transaction,
      total: total
    });

    for (const client of clients) {
      if (client.readyState === client.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          console.error('Error sending to client:', err);
          clients.delete(client);
        }
      }
    }
  } catch (error) {
    console.error('Error in broadcastUpdate:', error);
  }
};

// Transaction monitoring setup
let lastKnownTransaction = null;

const checkNewTransactions = async () => {
  try {
    const { transactions } = await tokenMetricsService.getTransactions(10);
    
    if (transactions && transactions.length > 0) {
      const newTransactions = transactions.filter(tx => 
        !sentTransactions.has(tx.hash) && 
        (!lastKnownTransaction || new Date(tx.timestamp) > new Date(lastKnownTransaction.timestamp))
      );

      if (newTransactions.length > 0) {
        console.log('New transactions found:', newTransactions.length);
        lastKnownTransaction = transactions[0];
        
        // Mark as sent and broadcast only new transactions
        for (const tx of newTransactions) {
          sentTransactions.add(tx.hash);
          await broadcastUpdate(tx);
        }
      }
    }
  } catch (error) {
    console.error('Error checking for new transactions:', error);
  }
};

// API routes
app.get('/api/transactions', async (req, res) => {
  try {
    const { transactions } = await tokenMetricsService.getTransactions(1000); // Increased limit
    
    if (!transactions || !Array.isArray(transactions)) {
      throw new Error('Invalid transactions data received from service');
    }
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      error: 'Failed to fetch transactions',
      details: error.message 
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    wsClients: clients.size,
    processedTransactions: sentTransactions.size
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something broke!',
    details: err.message
  });
});

// Start the server
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  // Start monitoring for new transactions
  setInterval(checkNewTransactions, 5000);  // Fixed typo here
});

// Handle cleanup on server shutdown
const cleanup = async () => {
  console.log('Cleaning up...');
  
  // Close all WebSocket connections
  for (const client of clients) {
    try {
      client.close();
    } catch (err) {
      console.error('Error closing client connection:', err);
    }
  }
  
  // Close the server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
};

// Handle different termination signals
process.on('SIGTERM', cleanup);
process.on('SIGINT', cleanup);
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  cleanup();
});