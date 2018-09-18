# @crussell52/socket-ipc
An event-driven IPC implementation using unix file sockets.

# About

## Limitations

Let's start with what this lib can't do so you can move on if it isn't a good fit for your project.

Supports:
  - NodeJS >= 8.x LTS (might work with perfectly fine with some older versions -- but not tested)
  - Unix socket files (might work with windows socket files too -- but not tested)

Doesn't Support:
  - TCP Sockets
  - UDP Sockets
  - Windows socket files (well *maybe* it does, I haven't tried )
  - Native client-to-client communication (although you could implement it!)

## Why another IPC lib?

I had a need for high speed IPC. Simply put, I went looking at the IPC libraries that were
currently published and struggled to find one that met my needs.

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

## A strong alternative

I have to give a shoutout to [node-ipc](https://www.npmjs.com/package/node-ipc). It offers a very robust IPC implementation 
which checks a lot of the boxes when compared against my humble lib's goals **and** covers many more transport protocols. You
should **seriously** check that lib out if you need wider transport and OS support or just want to use a more mature library.

_For me_, `node-ipc` did not make sense to use for a number of reasons. Upon review, I found it to appear dormant and it has
more complexity than I need (a tough combination). I also struggle with its choice in licensing. That said, it's mere existence
**did** make me _seriously_ wonder whether or not I should bother publishing this library. (Obviously I decided it was worth it!)

## Why is this one different?

I can't say that it is different than *all* of the others -- there really are a lot of projects tagged as IPC and I honestly didn't
review them all. But from what I was able to review, I did feel like this one is worth adding to the pile... 

Here are the goals:

- Simple server/client, bi-direction communication over Unix sockets (maybe other transports, one day)
- Simple interface for sending messages:
  * From the server to a specific client
  * From the server to all clients (broadcast)
  * From any client to the server
- Event driven, using native NodeJS `EventEmitter`
- Ability to listen for all messages or messages related to a specific "topic"
- Client resiliency (automatic reconnection, automatic connection retry)
- Generic enough that specific implementations can be built around it

# Usage

Phew... Sorry it took so long to get here. IPC is a crowded space and I thought that background was important.

## Quick Start

Server:
```js
const {Server} = require('@crussell52/socket-ipc');
const server = new Server({socketFile: '/tmp/myApp.sock'});

// Log all messages. Topics are completely up to the sender!
server.on('message', (message, topic) => console.log(topic, message));

// Say hello back to anybody that sends a message with the "hello" topic. 
// The recevier has complete control over which topics they listen to!
server.on('message.hello', (message, clientId) => {
    server.send('hello', `Hello, ${message.name}!`, clientId);
});

// Start listening for clients.
server.listen();

//...
function shutdown() {
    // Shutdown the server with your app to clean up the socket file!
    // If you crash without doing cleanup, don't worry. The server will
    // "reclaim" (delete + recreate) abandoned socket files.
    server.close();
}
```
Client:
```js
const {Client} = require('@crussell52/socket-ipc');
const client = new Client({socketFile: '/tmp/myApp.sock'});

// Say hello as soon as we connect to the server.
client.on('connect', () => {
    // Message is whatever your application needs it to be!
    // Here, we are telling the server our name.
    client.send('hello', {name: 'crussell52'});
});

// Start the connection. If the server isn't up yet, that's okay. 
// There is a built in auto-retry. If the server drops after you
// connect, that's okay too; the client will stubbornly attempt
// to reconnect.
client.connect();
```

## More Examples

Check out the `/examples` directory of the source code for more samples!

## A note about security

Unix socket files exist on the file system. This library does not provide any special handling of their
creation; it leaves that up to the expert: the [NodeJs net module](https://nodejs.org/api/net.html). In fact, 
that page has a section dedicated to Node's [IPC support](https://nodejs.org/api/net.html#net_ipc_support)
that you should probably read, if you are not already famliar with it.

Because they are files, they are subject to permissions. Make sure you understand how those permissions work 
for sockets on your target OS. Use approriate caution to not expose your application's messages to unintended
audiences **or expose your application to messages from unintended clients!**.

## API

Here are the full details of this the `@crussell52/socket-ipc` API.

### Server

This library follows a standard server/client pattern. There is one server which listens for connections
from one or more clients.  Intuitively, the `Server` class provides the interface for establishing the
server side of the equation.

The server can receive messages from any of the clients. It can also `send()` messsages to a specific client
or it can `broadcast()` a message to all connected clients.

#### Constructor

Creates a new server, but it does not start listening until you call `server.listen()`. You can immediately
attach listeners to the server instance.

Possible signatures:
  - `Server(options)`
    * `options` (object, required) - The server configuration options
      - `socketFile` (string, required): The path to the socket file to use when it is told to "listen". See 
        `server.listen()` for more details on how this file is handled.


#### `server.listen()`

Tells the server to start listening for client connections. This is an async operation and the `listening` 
event will fire once the server is ready for connections.

This may only be called **once** per instance. Calling this method a second time will result in an `Error`
being thrown (note, the `error` event will not fire in this case).

Possible signatures:
  - `server.listen()`

#### `server.send(topic, message, clientId)`

Sends a message to a specific, connected, client. On the client-side, this message can be heard by
listening for the `message` or the `message.`_`topic`_ event.

Possible signatures:
 - `server.send(topic, message, clientId)`
   * `topic` (string, required) - The topic to publish the message under. If an empty value, `none` is
     used as the value.
   * `message` (*, required) - The message. May be any JSON serializable value (including `null`)
   * `clientId` (number, required) - The id of the client to send the message to. This is usually
     obtained by capturing it when the client connects or sends the server a message. Attempting to
     send to a clientId which does not exist will fire an `error` event.

#### `server.broadcast(topic, message)`

Sends a message to **all** connected clients. On the client-side, this message can be heard by
listening for the `message` or the `message.`_`topic`_ event.

Possible signatures:
 - `server.broadcast(topic, message)`
   * `topic` (string, required) - The topic to publish the message under. If an empty value, `none` is
     used as the value.
   * `message` (any, required) - The message. May be any JSON serializable value (including `null`)
   
#### `server.close()`

Closes all active connections and stops listening for new connections. This is an asynchronous 
operation. Once the server is fully closed, the `close` event will be fired.

Once a server has been "closed", it can not start listening again. A new instance must be created. If
you have a scenario that requires servers to be routinely closed and restarted, a factory function can be
effective for handling the server setup.

Possible signatures:
  - `server.close()`

#### Events

  - `listening` - Fires when the server is ready for incoming connections.

  - `connection` (clientId) - Fires when a client connects to the server.
    * `clientId` (number) - The id of the client. Use this to send a message to the client.

  - `message` (message, topic, clientId) - Fired whenever a message is received from a client, regardless
    of the `topic`.
    * `message` (any) - The message from the client. This could be any JSON deserializable 
      type (including `null`) 
    * `topic` (string) - The topic of the message as declared by the client.
    * `clientId` (number) - The id of the client. Use this to send a message to the client.

  - `message.`_`topic`_ (message, clientId) - Fired whenever a message of a specific topic is received. This
    is a dynamic event type. If a message with the topic of `desserts` (yum) is receive, it would be published
    under the `message.desserts` event.
    * `message` (any) - The message from the client. This could be any JSON deserializable 
      type (including `null`) 
    * `clientId` (number) - The id of the client. Use this to send a message to the client.

  - `messageError` (error, clientId ) - Fires when a data is received, but could not be understood.
    * `error` (MessageError) - The error containing the raw data that was received.
    * `clientId` (number) - The id of the client that sent the bad data.

  - `connectionClose` (clientId) - Fires when a client's connection closes.
    * `clientId` (number) - The id of the client. Do not send messages to clients that have disconnected.
  
  - `close` - Fires when the server is closed and all connections have been ended.

  - `error` - Fires when an error occurs. `Node` provides special treatment of `error` events.
    * `error` (Error) - The error that occurred. 