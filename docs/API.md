# API

An event-driven IPC implementation for NodeJS using unix file sockets

[Docs](https://crussell52.github.io/node-socket-ipc/) |
[Source](https://github.com/crussell52/node-socket-ipc/) |
[Releases](https://github.com/crussell52/node-socket-ipc/releases) |
[NPM](https://www.npmjs.com/package/@crussell52/socket-ipc)

## Table of Contents
 
#### [About](/)
    
#### [Usage](/docs/USAGE.md)

#### [Advanced Usage](/docs/ADVANCED.md)
    
### [API](/docs/API.md) (you are here)
- [Recent Changes](#recent-changes)
- [Classes](#classes)
  * [Server](#server)
    - [new Server()](#server-1)
    - [Event: 'close'](#event-close)
    - [Event: 'connection'](#event-connection)
    - [Event: 'connectionClose'](#event-connectionclose)
    - [Event: 'error'](#event-error)
    - [Event: 'listening'](#event-listening)
    - [Event: 'message'](#event-message)
    - [Event: 'message._topic_'](#event-messagetopic)
    - [server.close()](#serverclose)
    - [server.send(topic, message, clientId)](#serversendtopic-message-clientid)
    - [server.listen()](#serverlisten)
    - [server.broadcast(topic, message)](#serverbroadcasttopic-message)
  * [Client](#client)
    - [new Client()](#client-1)
    - [Event: 'close'](#event-close-1)
    - [Event: 'connect'](#event-connect)
    - [Event: 'connectError'](#event-connecterror)
    - [Event: 'disconnect'](#event-disconnect)
    - [Event: 'error'](#event-error)
    - [Event: 'message'](#event-message)
    - [Event: 'message._topic_'](#event-messagetopic)
    - [Event: 'reconnect'](#event-reconnect)
    - [client.close()](#clientclose)
    - [client.connect()](#clientconnect)
    - [client.send(topic, message)](#clientsendtopic-message)
- [Interfaces (Classes)](#interfaces-classes)
  * [Transcoder](#transcoder)
    - [transcoder.createDecoder()](#transcodercreatedecoder)
    - [transcoder.socketEncoding](#transcodersocketencoding)
    - [transcoder.createEncoder()](#transcodercreateencoder)
  * [MessageWrapper](#messagewrapper)
    - [messageWrapper.topic](#messagewrappertopic)
    - [messageWrapper.message](#messagewrappermessage)
- [Interfaces (Callbacks/Functions)](#interfaces-callbacksfunctions)
  * [decoderFunc](#decoderfunc)
  * [decodedCallback](#decodedcallback)
  * [decoderFactoryFunc](#decoderfactoryfunc)
  * [encodedCallback](#encodedcallback)
  * [encoderFunc](#encoderfunc)
  * [encoderFactoryFunc](#encoderfactoryfunc)

## Recent Changes
  
  - `v0.2.0`:
    * Introduced `transcoder` option for both `Client` and `Server`
    * The `messageError` event has been removed. The `error` event has been enhanced to emit an `EncodeError` or 
      `DecodeError` to cover cases previously covered by `messageError`. This was done to simplify the code and API.
    * Some `error` events would include a second, undocumented arg which provided the client id. This is no longer
      the case; `error` listeners will now always be given exactly one argument -- the `Error`.
    * Calling `client.connect()` or `server.listen()` a second time will now emit an `error` event instead of throwing
      the Error. This is more consistent than have a couple of cases which throw instead of emitting an error event.

## Classes

These are instantiable classes what will pass an `instanceof` check. There are also a number of 
[`interfaces`](#interfaces) in the next section which are, at best, duck-typed at key spots in the module.

### Server

This library follows a standard server/client pattern. There is one server which listens for connections
from one or more clients.  Intuitively, the `Server` class provides the interface for establishing the
server side of the equation.

The server can receive messages from any of the clients. It can also `send()` messsages to a specific client
or it can `broadcast()` a message to all connected clients.

#### new Server(options)
  - `options` (`object`) - The server configuration options
    * `socketFile` (`string`): The path to the socket file to use when it is told to "listen". See 
      [`server.listen()`](#serverlisten) for more details on how this file is handled.
    * `[transcoder=jsonTranscoder]` (`Transcoder`) - A custom [`Transcoder`](#transcoder). Useful when encoding/decoding
      messages with JSON is not sufficient.

Creates a new server, but it does not start listening until you call [`server.listen()`](#serverlisten). You can 
immediately attach listeners to the `Server` instance.
    
#### Event: 'close'

Emitted when the server has stopped listening for connections **and** all existing connections have ended.

#### Event: 'connection'
  - `clientId` (`number`) - The id of the client. Use this to send a message to the client.
  
Emitted when a client establishes a connection to the server.

#### Event: 'connectionClose'
  - `clientId` (`number`) - The connection id of the client.

Emitted when a client's connection closes for any reason.
  
#### Event: 'error'
  - `error` (`Error`) - The error that occurred. If the error occurred while encoding a message, it will be an 
    [`EncodeError`](#encodeerror). Similarly, a decoding error will emit a [`DecodeError`](#decodeerror).

Emitted when an error occurs. If the error was the result of a decoding error, the connection to the sender will
be closed.

#### Event: 'listening'

Emitted when the server is ready for incoming connections.

#### Event: 'message'
  - `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
    type (including `null`). By using of a custom _transcoder_ that can be expanded!
  - `topic` (`string`) - The topic of the message as declared by the client.
  - `clientId` (`number`) - The id of the client. Use this to send a message to the client.

Emitted when a message is received, regardless of the _topic_.

#### Event: 'message._topic_'
  - `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
    type (including `null`) but a custom [Transcoder](#transcoder) can be used to influence the type range.
  - `clientId` (`number`) - The connection id of the client.

Emitted when a message with the specified _topic_ is received. For example, messages with a _topic_ of "dessert"
would emit the `message.dessert` event. (Yum!)

#### server.broadcast(topic, message)
  - `topic` (`string`) - The topic to publish the message under. If an empty value, `none` is
     used as the value.
  - `message` (`any`) - The message. May be any JSON serializable value (including `null`)
   
Sends a message to **all** connected clients. On the client-side, this message can be heard by
listening for the `message` or the `message.`_`topic`_ event.

#### server.listen()

Tells the server to start listening for client connections. This is an async operation and the 
[`listening`](#event-listening) event will emitted when the server is ready for connections.

This may only be called **once** per instance. Calling this method a second time will emit an `error` event.

#### server.send(topic, message, clientId)
  - `topic` (`string`) - The topic to publish the message under. If an empty value is given, `none` is
    used as the message topic.
  - `message` (`*`) - The message. May be any JSON serializable value (including `null`)
  - `clientId` (`number`) - The id of the client to send the message to. This is usually
    obtained by capturing it when the client connects or sends the server a message.

Sends a message to a specific, connected, client. On the client-side, this message can be heard by
listening for the `message` or the `message.`_`topic`_ event.
   
#### server.close()

Closes all active connections and stops listening for new connections. This is an asynchronous 
operation. Once the server is fully closed, the `close` event will be emitted.

Once a server has been "closed", it can not start listening again. A new instance must be created. If
you have a scenario that requires servers to be routinely closed and restarted, a factory function can be
effective of handling the server setup.

### Client

This library follows a standard server/client pattern. There is one server which listens for connections
from one or more clients.  Intuitively, the `Client` class provides the interface for establishing the
client side of the equation.

The client can receive messages from the server and it can [`send()`](#clientsend) messages to the server.

#### new Client(options)
  - `options` (`object`) - The client configuration options
    * `socketFile` (`string`): The path to the socket file to connect to.
    * `[transcoder=jsonTranscoder]` (`Transcoder`) - A custom [`Transcoder`](#transcoder). Useful when encoding/decoding
      messages with JSON is not sufficient.
    * `[retryDelay=1000]` (`number`) - The number of milliseconds to wait between connection attempts.
    * `[reconnectDelay=100]` (`number`) - The number of milliseconds to wait before automatically
            reconnecting after an unexpected disconnect.

Creates a new client, but it does not connect until you call `client.connect()`. You can immediately
attach listeners to the client instance.

#### Event: 'close'

Emitted when [`client.close()`](#clientclose) has been called **and** the client has disconnected from the server.

#### Event: 'connect'
  
Emitted when the `Client` establishes its **initial** connection with the server. 

Note: This is distinct from the [`reconnect`](#event-reconnect) event which is emitted after the client has experienced 
an unexpected disconnect and successfully reconnects to the server.

#### Event: 'connectError'
  - `error` (`Error`) - The error that occurred.
  
Emitted when a connection attempt fails.

This event is common when the server is not yet listening. Because of the auto-retry mechanism, this event may be 
emitted several times while the client waits for the server to start listening. For some applications, waiting "forever"
for the server to start may make sense; for others, you can use this event count the number of connection attempts and 
"give up" after some limit.

#### Event: 'disconnect'
 
Emitted when a client unexpectedly loses connection. This is distinct from the [`close`](#event-close-1) event that is
emitted when the client disconnects because [`client.close()`](#clientclose) was called.

#### Event: 'error'
  - `error` (`Error`) - The error that occurred. If the error occurred while encoding a message, it will be an 
    [`EncodeError`](#encodeerror). Similarly, a decoding error will emit a [`DecodeError`](#decodeerror).

Emitted when an error occurs. If the error was the result of a decoding error, the connection to the sender will
be closed.

#### Event: 'message'
  - `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
    type (including `null`). By using of a custom _transcoder_ that can be expanded!
  - `topic` (`string`) - The topic of the message as declared by the client.
  - `clientId` (`number`) - The id of the client. Use this to send a message to the client.

Emitted when a message is received, regardless of the _topic_.

#### Event: 'message._topic_'
  - `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
    type (including `null`) but a custom [Transcoder](#transcoder) can be used to influence the type range.
  - `clientId` (`number`) - The connection id of the client.

Emitted when a message with the specified _topic_ is received. For example, messages with a _topic_ of "dessert"
would emit the `message.dessert` event. (Yum!)

#### Event: 'reconnect'

- Emitted when the client successfully **reconnects** with the server after an unexpected disconnect. This is distinct 
from the [`connect`](#event-connect) that is emitted when the server successfully establishes its initial connection 
with the server.

#### client.close()

Permanently closes the connection. There will be no automatic reconnect attempts. This is an asynchronous
operation; the [`close`](#event-close-1) event will be emitted when the close operation is complete.

Once a client has been "closed", it can not reconnect. A new instance must be created. If you have a scenario that 
requires clients to be routinely closed and restarted, a factory function can be effective for handling the client 
setup.

#### client.connect()

Tells the client to connect to the server. This is an async operation and the [`connect`](#event-connect) event will 
be emitted once the connection has been established.

This may only be called **once** per instance. Calling this method a second time will emit an 
[`error`](#event-error-1) event.

If the server is unavailable when the client attempts to connect, a [`connectError`](#event-connecterror) event will be 
emitted and the client will automatically retry after a delay defined by the value of `options.retryDelay`. This
sequence (`connectError` event followed by a delayed retry) will repeat until a connection is established or until 
[`client.close()`](#clientclose) is called. If you want to limit the number of retries, you can count the `connectError` 
events and  call`client.close()` after some threshold. 

Once connected, if an unexpected disconnect occurs (e.g. not an explicit call to `client.close()`) a 
[`disconnect`](#event-disconnect) event will be emitted and the client will automatically start attempting to reconnect 
to the server. The reconnection routine is almost identical to the connection routine described above, including the 
automatic retry behavior. The only difference is that a successful connection will emit a [`reconnect`](#event-reconnect)
event instead of a `connect` event.

#### client.send(topic, message)
 - `topic` (string, required) - The topic to publish the message under. If an empty value, `none` is
    used as the value.
 - `message` (*, required) - The message. May be any JSON serializable value (including `null`)
 
Sends a message to the server. On the server-side, this message can be heard by listening for the 
[`message`](#event-message-1) or the [`message.`_`topic`_](#event-messagetopic-1) event.
      
### EncodeError

### DecodeError

## Interfaces (Classes)

## Interfaces (Callbacks/Functions)