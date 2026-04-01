const express = require('express');
const http = require('http');
const cors = require('cors');
const { setupRoutes } = require('./src/routes');
const { setupWebSocket } = require('./src/websocket');
const { loadState } = require('./src/state');

const app = express();
app.use(cors());

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

loadState();
setupRoutes(app);
setupWebSocket(server);

server.listen(PORT, () => {
  console.log(`Collage server running on port ${PORT}`);
});
