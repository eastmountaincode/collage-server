const { WebSocketServer } = require('ws');
const state = require('./state');

function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  function broadcast(data, exclude) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client !== exclude && client.readyState === 1) {
        client.send(msg);
      }
    });
  }

  function broadcastAll(data) {
    const msg = JSON.stringify(data);
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(msg);
      }
    });
  }

  function getUserCount() {
    let count = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === 1) count++;
    });
    return count;
  }

  wss.on('connection', (ws) => {
    // Send current state to new client
    ws.send(JSON.stringify({ type: 'init', images: state.getAll() }));

    // Broadcast user count to all
    broadcastAll({ type: 'users', count: getUserCount() });

    ws.on('message', (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        return;
      }

      switch (msg.type) {
        case 'move': {
          state.updatePosition(msg.id, msg.x, msg.y);
          broadcast(msg, ws);
          break;
        }

        case 'resize': {
          state.updateSize(msg.id, msg.x, msg.y, msg.width, msg.height);
          broadcast(msg, ws);
          break;
        }

        case 'transform': {
          state.updateTransform(msg.id, msg.x, msg.y, msg.width, msg.height, msg.rotation);
          broadcast(msg, ws);
          break;
        }

        case 'uploaded': {
          state.addImage(msg.id, msg.width, msg.height, msg.x || 0, msg.y || 0);
          broadcast(msg, ws);
          break;
        }

        case 'delete': {
          state.removeImage(msg.id);
          broadcast(msg, ws);
          break;
        }

        case 'deleteAll': {
          state.removeAll();
          broadcast(msg, ws);
          break;
        }

        case 'toFront': {
          state.sendToFront(msg.id);
          broadcast({ type: 'toFront', id: msg.id }, ws);
          break;
        }

        case 'toBack': {
          state.sendToBack(msg.id);
          broadcast({ type: 'toBack', id: msg.id }, ws);
          break;
        }
      }
    });

    ws.on('close', () => {
      broadcastAll({ type: 'users', count: getUserCount() });
    });
  });
}

module.exports = { setupWebSocket };
