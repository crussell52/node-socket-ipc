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

const {Client} = require('../../index');

const SOCKET_FILE = undefined;

const client = new Client({socketFile: SOCKET_FILE});
client.on('connectError', () => console.log('no server'));
client.on('connect', () => console.log('connected to server'));
client.on('disconnect', () => console.log('disconnected from server'));
client.on('reconnect', () => console.log('reconnected to server'));
client.on('message', (message, topic) => console.log(`Heard: [${topic}]`, message));
client.connect();
