import { createApp } from './app.js';
import env from './config/env.js';

const app = createApp();

const server = app.listen(env.port, () => {
  console.info(`[server] BalanceVault backend running on port ${env.port}`);
  console.info(`[server] Environment: ${env.nodeEnv}`);
  console.info(`[server] CORS origin: ${env.corsOrigin}`);
});

// Graceful shutdown
function shutdown(signal) {
  console.info(`\n[server] ${signal} received, shutting down...`);
  server.close(() => {
    console.info('[server] closed');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    console.error('[server] forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
