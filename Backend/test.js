import { tokenMetricsService, grassToSol } from './database.js';

async function verifyTokenMetricsService() {
  console.log('Starting TokenMetricsService verification...\n');

  try {
    // 1. Check environment variables
    console.log('1. Checking environment variables...');
    if (!process.env.SOLSCAN_API_KEY) {
      throw new Error('SOLSCAN_API_KEY is missing');
    }
    if (!process.env.TOKEN_ADDRESS) {
      throw new Error('TOKEN_ADDRESS is missing');
    }
    console.log('✅ Environment variables are properly set\n');

    // 2. Test grassToSol conversion
    console.log('2. Testing grassToSol conversion...');
    try {
      const solAmount = await grassToSol(1);
      console.log(`✅ grassToSol conversion successful: 1 GRASS = ${solAmount} SOL\n`);
    } catch (error) {
      console.error('❌ grassToSol conversion failed:', error.message);
      throw error;
    }

    // 3. Test transaction fetching and storage
    console.log('3. Testing transaction fetching and storage...');
    try {
      await tokenMetricsService.fetchAndStoreTransactions();
      console.log('✅ Successfully fetched and stored transactions\n');
    } catch (error) {
      console.error('❌ Transaction fetch/store failed:', error.message);
      throw error;
    }

    // 4. Test metrics retrieval
    console.log('4. Testing metrics retrieval...');
    try {
      const metrics = await tokenMetricsService.getMetrics();
      console.log('Metrics retrieved successfully:');
      console.log('- Holders:', metrics.holders);
      console.log('- Total Transactions:', metrics.totalTransactions);
      console.log('- Total Volume:', metrics.totalVolume);
      console.log('- Token Price:', metrics.tokenPrice);
      console.log('✅ Metrics retrieval successful\n');
    } catch (error) {
      console.error('❌ Metrics retrieval failed:', error.message);
      throw error;
    }

    // 5. Test transaction retrieval
    console.log('5. Testing transaction retrieval...');
    try {
      const transactions = await tokenMetricsService.getTransactions(20);  // Now requesting 20 transactions
      console.log(`Retrieved ${transactions.length} recent transactions`);
      if (transactions.length > 0) {
        console.log('Most recent transaction:');
        console.log('- Hash:', transactions[0].hash);
        console.log('- Amount:', transactions[0].amount);
        console.log('- Timestamp:', transactions[0].timestamp);
      }
      console.log('✅ Transaction retrieval successful\n');
    } catch (error) {
      console.error('❌ Transaction retrieval failed:', error.message);
      throw error;
    }

    console.log('✅ All verifications completed successfully!');
  } catch (error) {
    console.error('\n❌ Verification failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the verification
verifyTokenMetricsService();