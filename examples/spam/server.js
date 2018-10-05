/**
 * Provides a simple client which makes a lot of noise about the server state.
 *
 * Run one or more copies of in conjunction with `server.js` in the same directory to
 * see how the client deals with an unreliable server.
 *
 * Hint: Don't forget to define the SOCKET_FILE before running!
 *
 * @author Chris Russell <crussell52@gmail.com>
 * @copyright Chris Russell 2018
 * @license MIT
 */

const {Server} = require('../../src/index');

const SOCKET_FILE = undefined;

const server = new Server({socketFile: SOCKET_FILE});
server.on('listen', () => {
    console.log('listening');
});


let msgCount = 0;
let clientCount = 0;
server.on('connection', (id, socket) => {
    clientCount++;
    socket.on('close', () => clientCount--);
});
server.on('message', (message) => msgCount++);
let statusInterval = setInterval(() => {
    console.log(`~${msgCount} messages in last 1s from ${clientCount} clients.`);
    msgCount = 0;
}, 1000);
server.listen();


function shutdown(reason) {
    // Stop all processing and let node naturally exit.
    console.log('shutting down: ', reason);
    clearInterval(statusInterval);
    server.close();
}

process.on('SIGTERM', () => shutdown('sigterm'));
process.on('SIGINT', () => shutdown('sigint'));