/**
 * This file provides an IPC server with a TERRIBLE uptime record.
 * 
 * It says "hello" to every client that connects but always closes 10 seconds
 * after its first "hello".
 * 
 * 10 seconds after the server closes, a new one spins up to replace it.
 * 
 * Run one copy of this file in conjuction with `client.js` from the same directory
 * to see a demonstration of client resliency.
 * 
 * Hint: Don't forget to define the SOCKET_FILE before running!
 * 
 * @author Chris Russell <crussell52@gmail.com>
 * @copyright Chris Russell 2018
 * @license MIT
 */
const {Server} = require('../../index');

const SOCKET_FILE = undefined;


let newServerTimeout;
let nextServerNum = 1;
function createServer() {
    clearTimeout(newServerTimeout);
    const serverNum = nextServerNum++;
    console.log(`creating server (${serverNum})`);
    
    const server = new Server({socketFile: SOCKET_FILE});
    server.on('listening', () => console.log(`server (${serverNum}) is listening`));
    server.on('connection', (clientId) => {
        // Say hello to the client.
        console.log(`Client ${clientId} connected... saying "hello"`);
        server.send('hello', `Hello, Client ${clientId}!`, clientId);
    });

    // After the first client connects, start a time to shut down the server.
    // This will show what happens to the client(s) when a server disappears.
    server.once('connection', () => {
        console.log(`Server (${serverNum}) will shut down in 10 second.`)
        setTimeout(() => server.close(), 10000);
    });

    // When the server closes, auto-spawn a new one after a second.
    server.on('close', () => {
        console.log(`server (${serverNum}) closed. Starting a replacement server in 5 second.`);
        newServerTimeout = setTimeout(() => createServer(), 5000);
    });

    // Start listening.
    server.listen();
}

createServer();
