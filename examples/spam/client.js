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

const {Client} = require('../../src/index');

const SOCKET_FILE = undefined;


let spamInterval;
function spam() {
    spamInterval = setInterval(() => {
        for (let i = 0; i < 300; i++) {
            client.send('hello', i + ':' + data[Math.floor(Math.random() * Math.floor(999))]);
        }
    }, 5);
}


function generate_random_data1(size){
    let chars = 'abcdefghijklmnopqrstuvwxyz'.split('');
    let len = chars.length;
    let random_data = [];

    while (size--) {
        random_data.push(chars[Math.random()*len | 0]);
    }

    return random_data.join('');
}

let data = [];
for (let i = 0; i < 1000; i++) {
    data.push(generate_random_data1(32));
}


const client = new Client({socketFile: SOCKET_FILE});
client.on('connect', (socket) => {
    socket.on('close', () => {
        console.log('Server went away (close).');
        clearInterval(spamInterval);
    });

    socket.on('end', () => {
        console.log('Server went away.');
        clearInterval(spamInterval);
    });

    console.log('connected to server');
    spam()
});

client.on('error', (e) => {
    console.log(e);
});

client.connect();

function shutdown(reason) {
    // Stop all processing and let node naturally exit.
    console.log('shutting down: ', reason);
    clearInterval(spamInterval);
    client.close();
}

process.on('SIGTERM', () => shutdown('sigterm'));
process.on('SIGINT', () => shutdown('sigint'));
