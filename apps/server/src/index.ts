import { createServer } from 'http';
import { createApp } from './app';
import { setupSocket } from './socketManager';

const PORT = process.env.PORT ?? 3001;

const app = createApp();
const httpServer = createServer(app);
setupSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
