#!/usr/bin/env node

const dotenv = require('dotenv');
const { FileManagerServer } = require('./dist/server');
const { getLogger } = require('./dist/utils/Logger');

// Load environment variables
dotenv.config({ path: './config.env' });

const logger = getLogger('TestRunner');

async function testServer() {
  try {
    logger.info('Starting File Manager Server for testing...');
    
    const server = new FileManagerServer();
    await server.start();
    
    logger.info('✅ File Manager Server started successfully!');
    logger.info('🌐 Server is running on http://localhost:3001');
    logger.info('📋 Use requests.rest file to test API endpoints');
    logger.info('📚 Swagger documentation available at http://localhost:3001/api-docs');
    logger.info('🛑 Press Ctrl+C to stop the server');
    
    // Keep the server running
    process.on('SIGINT', async () => {
      logger.info('Shutting down server...');
      await server.shutdown();
    });
    
  } catch (error) {
    logger.error('❌ Failed to start File Manager Server', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason, { promise });
  process.exit(1);
});

// Start the test
testServer();
