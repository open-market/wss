
/**
 * Dependencies
 */

var debug     = require('debug')('open-market:wss'),
    WebSocket = require('ws').Server,
    redis     = require('redis'),
    env       = process.env;

var redisClient = redis.createClient(env.REDIS_PORT, env.REDIS_HOST,
                                    { auth_pass: env.REDIS_PASS }),
    wss         = new WebSocket({ port: 8080 });

/**
 * Clients currently connected
 * @type {Set}
 */
var connectedClients = new Set();

// Listen for incoming transactions
redisClient.subscribe('transaction');

redisClient.on('message', function (channel, message) {

  'use strict';

  debug('New message from channel %s - %s', channel, message);

  // Don't emit anything if no clients are connected
  if (!connectedClients.size)
    return;

  // Send incoming message to all connected clients
  for (let client of connectedClients)
    client.send(message);

});

wss.on('connection', function (client) {

  debug('Client connected');

  client.on('message', function (message) {

    debug('New message from client: %s', message);

    try {

      var parsedMessage = JSON.parse(message);

      if (parsedMessage.type === 'subscribe' && parsedMessage.event === 'transaction' && !connectedClients.has(client))
        connectedClients.add(client);

      else
        console.error('Invalid message:', message);

    } catch (err) {

      console.error('Failed to parse message from client:', err);

    }

  });

  client.on('close', function () {

    debug('Client disconnected');

    if (connectedClients.has(client))
      connectedClients.delete(client);

  });

});
