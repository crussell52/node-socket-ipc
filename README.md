# About

An event-driven IPC implementation for NodeJS using unix file sockets

[Docs](https://crussell52.github.io/node-socket-ipc/) |
[Source](https://github.com/crussell52/node-socket-ipc/) |
[Releases](https://github.com/crussell52/node-socket-ipc/releases) |
[NPM](https://www.npmjs.com/package/@crussell52/socket-ipc)

## Table of Contents
 
### [About](/) (you are here)
- [Quick Start](#quick-start)
  * [Install](#install)
  * [A Simple Example](#a-simple-example)
  * [More Examples](#more-examples)
- [Limitations](#limitations)
- [Alternate solutions](#alternate-solutions)
  * [Why this One](#why-this-one)
  
#### [Usage](/docs/USAGE.md)

#### [Advanced Usage](/docs/ADVANCED.md)
    
#### [API](/docs/API.md)
  
## Quick Start

Want to get up and running quickly? This is for you.

### Install

```
npm install --save @crussell52/socket-ipc
```

### A Simple Example

Client:
```js
const {Client} = require('@crussell52/socket-ipc');
const client = new Client({socketFile: '/tmp/myApp.sock'});

// Say hello as soon as we connect to the server with a simple message
// that give it our name.
client.on('connect', () => client.send('hello', {name: 'crussell52'}));

// Connect. It will auto-retry if the connection fails and auto-reconnect if the connection drops.
client.connect();
```

Server:
```js
const {Server} = require('@crussell52/socket-ipc');
const server = new Server({socketFile: '/tmp/myApp.sock'});

// Listen for errors so they don't bubble up and kill the app.
server.on('error', err => console.error('IPC Server Error!', err));

// Log all messages. Topics are completely up to the sender!
server.on('message', (message, topic) => console.log(topic, message));

// Say hello back to anybody that sends a message with the "hello" topic. 
server.on('message.hello', (message, clientId) => server.send('hello', `Hello, ${message.name}!`, clientId));

// Start listening for connections.
server.listen();

// Always clean up when you are ready to shut down your app to clean up socket files. If the app
// closes unexpectedly, the server will try to "reclaim" the socket file on the next start.
function shutdown() {
    server.close();
}
```

### More Examples

Check out the `/examples` directory in the [source](https://github.com/crussell52/node-socket-ipc) for more
code samples. (Make sure you set the `SOCKET_FILE` constant at the top of the example files before you run them!)

## Limitations

Let's get this out of the way early...

Requires:
  - NodeJS >= 8.x LTS (might work with perfectly fine with some older versions -- but not tested)

Transport Support:  
  - Unix socket files (might work with windows socket files too -- but not tested)

Unsupported Features:
  - TCP Sockets
  - UDP Sockets
  - Windows socket files (well *maybe* it does, I haven't tried )
  - Native client-to-client communication (although you could implement it!)
  
Love the project, but you need it to do something it doesn't? Open up a 
[feature request](https://github.com/crussell52/node-socket-ipc)!

## Alternate solutions

[node-ipc](https://www.npmjs.com/package/node-ipc)
[ZeroMQ](https://github.com/zeromq/zeromq.js)

### Why this one?

When I needed to solve this problem, most of what I found was tied to some extra external dependency or platform 
(electron, redis, etc). The `node-ipc` lib caught my eye for a time, but I wasn't in love with the interface and it 
was published under a non-standard (and sometimes considered "satirical") license.

So this package was born. Here are the goals of this project:

- Bidirectional communication over Unix sockets (maybe other transports, in the future)
- Simple interface for sending messages:
  * From the server to a specific client
  * From the server to all clients (broadcast)
  * From any client to the server
- Minimize dependencies (So far, `0`!).
- Event driven (using native NodeJS `EventEmitter`)
- Ability to listen for _all_ messages or to narrow in on specific _topics_.
- Built-in client resiliency (automatic reconnection, automatic connection retry)
- Extensible design: 
  * _Pluggable_ 
  * Stable API 
  * Thorough docs to make wrapping or extending easy
  * Leave domain details to the domain experts
