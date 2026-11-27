import app from './app';
import { config } from './config/env';

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 PeopleCore Core Backend Service Started Successfully`);
  console.log(`📡 URL:       http://localhost:${config.port}`);
  console.log(`📋 API Base:  http://localhost:${config.port}/api/${config.apiVersion}`);
  console.log(`🏥 Health:    http://localhost:${config.port}/api/${config.apiVersion}/system/health`);
  console.log(`⚙️  Env:       ${config.nodeEnv}`);
  console.log(`=======================================================`);
});

// Graceful Shutdown
const handleShutdown = (signal: string) => {
  console.log(`\n[PeopleCore Backend] Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('[PeopleCore Backend] HTTP server closed cleanly. Exiting.');
    process.exit(0);
  });
  // Force exit after 10s if connections refuse to close
  setTimeout(() => {
    console.error('[PeopleCore Backend] Forceful shutdown initiated after timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));
