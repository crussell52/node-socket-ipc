/**
 * All-in-one script (e.g. clients and server both defined here) which demonstrates
 * a brief conversation between client and server.
 * 
 * Since IPC is free-flow, bidirectional communication, replies are not implicitly
 * related to the original messages. Implementations need to include some sort of 
 * identifier to indicate that messages are part of the same conversation.
 * (JSON-RPC 2.0 provides a simple protocol which provides a way to do that.)
 * 
 * Every conversation in this example, starts with an incrementing value. That
 * value is repeated for every message within the conversation. The example does
 * not intrinsically use that value, but it is printed in the console so that you
 * can visually relate the messages.
 * 
 * The conversations go like this:
 * 
 *   - Server: "hello" 
 *   - Client: "helloback"
 *   - Server: (if client name is "charlie") "helloagain"
 *
 * All messages are logged to the console when they are received by the server or a client.
 * 
 * Hint: Don't forget to define the SOCKET_FILE before running!
 * 
 * @author Chris Russell <crussell52@gmail.com>
 * @copyright Chris Russell 2018
 * @license MIT
 */

const SOCKET_FILE = undefined;

const {Server, Client} = require ('../src/index');

const createClient = (clientName) => {
    // DO NOT pass the server in; DO NOT return the client.
    // They must both be able to send messages without first-hand knowledge of the other.

    // Create the client and give it a unique local id.
    const client = new Client({socketFile: SOCKET_FILE});

    // Log ALL messages from the server, regardless of the topic.
    client.on('message', (message, topic) => {
        console.log(`Server -> Client (${clientName}): `, `[${topic}]`, message);
    })

    // Whenever the server says hello, send a "helloback" message. Include
    // the original server message and this client's name.
    client.on('message.hello', (original) => client.send('helloback', {clientName, original}));

    // Go ahead and connect.
    client.connect();
};

// Create the server.
const server = new Server({socketFile: SOCKET_FILE});

// Log all messages coming into the server. Note, that server-side callbacks get an
// extra argument which provides a client id.
server.on('message', (message, topic, clientId) => {
    console.log(`Client (${clientId}) -> Server: `, `[${topic}]`, message);
})

// When the client replies to our "hello" with a "helloback", reply with a "helloagain"... BUT only for
// clients named "charlie".
server.on('message.helloback', (message, clientId) => {
    // Inspect the name in the message.
    if (message.clientName === 'charlie') {
        // Use the client id to say hello again, repeating the original message which the client
        // was nice enough to include.
        server.send('helloagain', message.original, clientId);
    }
})

// Start everything up. 
let helloCounter = 1;
server.listen();
server.on('listening', () => {
    // make note of the fact that the server is listening.
    console.log('server listening');
    
    // Start broadcasting hello immediately, even though we don't have any clients.
    // The first few messages will be missed.
    setInterval(() => {
        server.broadcast('hello', helloCounter++);
    }, 1000);

    // After about 3 seconds, make the first client (bob) and then at the 6 second mark add in the other (charlie)
    setTimeout(() => createClient('bob'), 3000);
    setTimeout(() => createClient('charlie'), 3000);
});