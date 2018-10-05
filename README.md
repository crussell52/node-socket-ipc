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
- [Why another IPC lib?](#why-another-ipc-lib)
  * [A Strong Alternative](#a-strong-alternative)
  * [Why is this one different?](why-is-this-one-different)
    
#### [Usage](/docs/USAGE.md)

#### [Advanced Usage](/docs/ADVANCED.md)
    
#### [API](/docs/API.md)
  
# About  

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

## Why another IPC lib?

I had a need for high speed IPC. I went looking at the IPC modules that were available and found a LOT of them. None
of them really met my needs...

In some cases, they were bound to specific message formats:
 - [avsc](https://www.npmjs.com/package/avsc) (implements the Avro specification) 
 - [json-ipc-lib](https://www.npmjs.com/package/json-ipc-lib) (implements JSON-RPC 2.0)
 - [BOSCAR](https://www.npmjs.com/package/boscar) (JSON-RPM 2.0 subset)

Several were linked to specific technologies:
 - [redux-electron-ipc](https://www.npmjs.com/package/redux-electron-ipc) (Electron)
 - [electron-ipc-responder](https://www.npmjs.com/package/electron-ipc-responder) (Electron)
 - [pg-ipc](https://www.npmjs.com/package/pg-ipc) (PostgreSQL)
 - [python-bridge](https://www.npmjs.com/package/python-bridge) (Python)
 - [node-jet](https://www.npmjs.com/package/node-jet) (jetbus.io)

A few others covered specific use cases:
 * [ipc-event-emitter](https://www.npmjs.com/package/ipc-event-emitter) (Node Subprocesses)

Etc...

So, like the 50 billion other authors, I chose to make my own. Not because I thought any of the others were particularily 
_bad_, but they did not seem to meet _my_ goals for IPC.

### A strong alternative

I have to give a shoutout to [node-ipc](https://www.npmjs.com/package/node-ipc). It offers a very robust IPC implementation 
which checks a lot of the boxes when compared against my humble lib's goals **and** covers many more transport protocols. You
should **seriously** check that lib out if you need wider transport and OS support or just want to use a more mature library.

_For me_, `node-ipc` did not make sense to use for a number of reasons. Upon review, I found it to appear dormant and it has
more complexity than I need (a tough combination). I also struggle with its choice in licensing. That said, it's mere existence
**did** make me _seriously_ wonder whether or not I should bother publishing this library. (Obviously I decided it was worth it!)

### Why is this one different?

I can't say that it is different than *all* of the others -- there really are a lot of projects tagged as IPC and I honestly didn't
review them all. But from what I was able to review, I did feel like this one is worth adding to the pile... 

Here are the goals:

- Bidirectional communication over Unix sockets (maybe other transports, in the future)
- Simple interface for sending messages:
  * From the server to a specific client
  * From the server to all clients (broadcast)
  * From any client to the server
- Minimize dependencies (So far, `0`!). They may creep in where they make sense, but I'm looking to raw NodeJS
  for solutions, _first_.
- Event driven (using native NodeJS `EventEmitter`)
- Ability to listen for _all_ messages or to narrow in on specific _topics_.
- Built-in client resiliency (automatic reconnection, automatic connection retry)
- Extensible design: 
  * _Pluggable_ where it makes sense
  * Stable API with thorough docs to make wrapping or extending easy
  * Leave domain details to the domain experts
