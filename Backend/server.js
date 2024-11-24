import express from 'express';
import cors from 'cors';
import { tokenMetricsService } from './database.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await tokenMetricsService.getTransactions(100); // Get more transactions
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});