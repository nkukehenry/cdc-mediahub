#!/usr/bin/env node

import dotenv from 'dotenv';
import { FileManagerServer } from './server';
import { getLogger } from './utils/Logger';

// Load environment variables
dotenv.config({ path: './config.env' });

const logger = getLogger('Main');

async function main() {
  try {
    logger.info('Starting Mutindo File Manager...');
    
    const server = new FileManagerServer();
    await server.start();
    
    logger.info('File Manager started successfully');
  } catch (error) {
    logger.error('Failed to start File Manager', error as Error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection', reason as Error, { promise });
  process.exit(1);
});

// Start the application
main();
