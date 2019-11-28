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
- [Important Changes](#important-changes)
- [Classes](#classes)
  * [Server](#server)
    - [new Server()](#new-serveroptions)
    - [Event: 'closed'](#event-closed)
    - [Event: 'connection'](#event-connection)
    - [Event: 'error'](#event-error)
    - [Event: 'listening'](#event-listening)
    - [Event: 'message'](#event-message)
    - [Event: 'message._topic_'](#event-messagetopic)
    - [server.close()](#serverclose)
    - [server.send(topic, message, clientId)](#serversendtopic-message-clientid)
    - [server.listen()](#serverlisten)
    - [server.broadcast(topic, message)](#serverbroadcasttopic-message)
  * [Client](#client)
    - [new Client()](#new-clientoptions)
    - [Event: 'closed'](#event-closed-1)
    - [Event: 'connect'](#event-connect)
    - [Event: 'connectError'](#event-connecterror)
    - [Event: 'disconnect'](#event-disconnect)
    - [Event: 'error'](#event-error-1)
    - [Event: 'message'](#event-message-1)
    - [Event: 'message._topic_'](#event-messagetopic-1)
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

## Important Changes
  
### v0.2.0:
  
  * Introduced `transcoder` option for both `Client` and `Server`
  * **(Breaking change)** Dropped `connectionClose` event. Applications should now listen for events on the underlying
    `net.Socket` (now provided as part of the `connection` event)
  * **(Breaking change)** `clientId` is now a `string` (It is still numeric, but applications should not rely on 
    this detail).
  * The server-side `connection` event and client-side `connect` event now provide the underlying `net.Socket` instance.
    [Some applications](/docs/USAGE.md#event-timing) may benefit from listening directly to socket events.
  * The client-side `connect` event now provides a `net.Socket` instance.
  * Documentation has been enhanced to make note that some events are in response to events the specific events
    being emitted from the underlying `net.Socket` events.
  * The `messageError` event has been removed. The `error` event has been enhanced to emit an `EncodeError`, 
    `SendError`, or `DecodeError` to cover cases previously covered by `messageError`.
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

Emitted when the server has stopped listening for connections **and** all existing connections have been ended.

#### Event: 'closed'

_Deprecated in v0.3.0 - scheduled for removal in v1.0.0_

Alias of `close` event.

#### Event: 'connection'
  - `clientId` (`string`) - The id of the client. Use this to send a message to the client.
  - `connection` (`net.Socket`) - The NodeJS [`net.Socket`](https://nodejs.org/docs/latest-v8.x/api/net.html#net_class_net_socket) 
  of the connection.  Some applications may [benefit from listening directly](/docs/USAGE.md#event-timing) to the socket 
  events.
  
Emitted when a client establishes a connection to the server.

#### Event: 'error'
  - `error` (`Error`) - The error that occurred. 

Emitted when an error occurs. 
    
After establishing a connection, the `Server` listens for `error` events from the underlying `net.Socket` and repeats
them as a local event. As a result, you do not need to listen directly for socket errors to avoid 
[unhandled exceptions](https://nodejs.org/docs/latest/api/events.html#events_error_events). However, some applications 
may [benefit from listening directly](/docs/USAGE.md#event-timing) to the socket events.

#### Event: 'listening'

Emitted when the server is ready for incoming connections.

#### Event: 'message'
  - `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
    type (including `null`) but a custom [Transcoder](#transcoder) can be used to change these rules.
  - `topic` (`string`) - The topic of the message as declared by the client.
  - `clientId` (`string`) - The id of the client. Use this to send a message to the client.

Emitted when a message is received, regardless of the _topic_.

#### Event: 'message._topic_'
  - `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
    type (including `null`) but a custom [Transcoder](#transcoder) can be used to change these rules.
  - `clientId` (`string`) - The connection id of the client. Use this to send a message to the client.

Emitted when a message with the specified _topic_ is received. For example, messages with a _topic_ of "dessert"
would emit the `message.dessert` event. (Yum!)

#### server.broadcast(topic, message)
  - `topic` (`string`) - The topic to publish the message under. If an empty value, `none` is
     used as the value.
  - `message` (`any`) - The message. May be any JSON serializable value (including `null`)
   
Sends a message to **all** connected clients. On the client-side, this message can be heard by
listening for the `message` or the `message.`_`topic`_ event.

If there are no connected clients, this method will quietly do nothing.

The following conditions will cause `Server` to emit an `error` event:

 - ([`EncodeError`](#encodeerror)) - When the message can not be encoded by the active [`Transcoder`](#transcoder). This
   will be emitted once, regardless of how many clients are connected.
 - ([`SendAfterCloseError`](#sendaftercloseerror)) - When this method is called after [`server.close()`](#serverclose) 
   is called. This will be emitted once, regardless of how many clients are connected.
   
Additionally, an `error` event will be emitted if an underlying `net.Socket` has stopped accepting data but the `Server`
is not yet aware of it. This is most common in when the client abruptly disconnects. In these cases, the 
[`error` event](#event-error) will simply be a repeat of the `net.Socket` error; some applications may 
[benefit from listening directly](/docs/USAGE.md#event-timing) to the socket events. Such `error` events will be emitted 
for every affected client.
  
#### server.listen()

Tells the server to start listening for client connections. This is an async operation and the 
[`listening`](#event-listening) event will emitted when the server is ready for connections.

This may only be called **once** per instance. Calling this method a second time will emit an `error` event.

#### server.send(topic, message, clientId)
  - `topic` (`string`) - The topic to publish the message under. If an empty value is given, `none` is
    used as the message topic.
  - `message` (`*`) - The message. By default, this may be any JSON serializable value (including `null`) but a
    custom [Transcoder](#transcoder) can be used to change these rules.
  - `clientId` (`string`) - The id of the client to send the message to. This is usually
    obtained by capturing it when the client connects or sends the server a message.

Sends a message to a specific, connected, client. On the client-side, this message can be heard by
listening for the `message` or the `message.`_`topic`_ event.

The following conditions will cause `Server` to emit an `error` event:

 - ([`EncodeError`](#encodeerror)) - When the message can not be encoded by the active [`Transcoder`](#transcoder).
 - ([`SendAfterCloseError`](#sendaftercloseerror)) - When this method is called after [`server.close()`](#serverclose) 
   is called.
 - ([`BadClientError`](#badclienterror)) - When this method targets a client which does not exist. To avoid this error, 
   stop sending messages to this client by responding to the appropriate socket event(s). (The socket is provided with 
   the [`connection`](#event-connection) event for this client).
   
Additionally, an `error` event may be emitted if the underlying `net.Socket` has stopped accepting data but the `Server`
is not yet aware of it. This is most common in when the client abruptly disconnects. In these cases, the 
[`error` event](#event-error) will simply be a repeat of the `net.Socket` error; some applications may 
[benefit from listening directly](/docs/USAGE.md#event-timing) to the socket events.

#### server.close()

Closes all active connections and stops listening for new connections. This is an asynchronous 
operation. Once the server is fully closed, the [`closed`](#event-closed) event will be emitted.

Any future calls to [`server.send()`](#serversendtopic-message-clientid) or 
[`server.broadcast()`](#serverbroadcasttopic-message) will cause the server to emit an [`error`](#event-error) event.

Once this method has been called, a new `Server` instance is needed to re-establish a connection with the server.

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

Emitted when [`client.close()`](#clientclose) has been called **and** the client connection has been fully closed.

#### Event: 'closed'

_Deprecated in v0.3.0 - scheduled for removal in v1.0.0_

Alias of `close` event.

#### Event: 'connect'
  - `connection` (`net.Socket`) - The NodeJS [`net.Socket`](https://nodejs.org/docs/latest-v8.x/api/net.html#net_class_net_socket) 
    of the connection. Some applications may [benefit from listening directly](/docs/USAGE.md#event-timing) to the 
    socket events.
    
Emitted when the `Client` establishes a connection with the server. This occurs during initial connection and during
reconnect scenarios.

#### Event: 'connectError'
  - `error` (`Error`) - The error that occurred.
  
Emitted when a connection attempt fails.

This event is common when the server is not yet listening. Because of the auto-retry mechanism, this event may be 
emitted several times while the client waits for the server to start listening. For some applications, waiting "forever"
for the server to start may make sense; for others, you can use this event count the number of connection attempts and 
"give up" after some limit.

#### Event: 'disconnect'
 
Emitted when a client unexpectedly loses connection. This is distinct from the [`closed`](#event-closed-1) event that is
a result of [`client.close()`](#clientclose) being called.

The client emits this when it both conditions are met:
  - A `close` event is heard from the underlying `net.Socket`
  - [`client.close()`](#clientclose) has not been called

This event is emitted when the client hears an `close` event from the underlying `net.Socket`. Some applications may 
[benefit from listening directly](/docs/USAGE.md#event-timing) to the socket events. 
  
#### Event: 'error'
  - `error` (`Error`) - The error that occurred.
  
Emitted when an error occurs.

After establishing a connection, the `Client` listens for `error` events from the underlying `net.Socket` and repeats
them as a local event. As a result, you do not need to listen directly for socket errors to avoid 
[unhandled exceptions](https://nodejs.org/docs/latest/api/events.html#events_error_events). However, some applications 
may [benefit from listening directly](/docs/USAGE.md#event-timing) to the socket events.

#### Event: 'message'
  - `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
    type (including `null`). By using of a custom _transcoder_ that can be expanded!
  - `topic` (`string`) - The topic of the message as declared by the server.

Emitted when a message is received, regardless of the _topic_.

#### Event: 'message._topic_'
  - `message` (`any`) - The message from the server. By default, this can be any JSON deserializable 
    type (including `null`) but a custom [Transcoder](#transcoder) can be used to influence the type range.

Emitted when a message with the specified _topic_ is received. For example, messages with a _topic_ of "dessert"
would emit the `message.dessert` event. (Yum!)

#### Event: 'reconnect'

An duplication of the [`connect`](#event-connect) that is only emitted when a client successfully performs an automatic 
reconnect. This event will always be immediately preceded by the `connect` event. It is useful when you want additional 
behavior in reconnect scenarios. You can also leverage `EventEmitter.once()` to handle initial connections and 
reconnects differently:

```js
client.once('connect', /* ... */);  // Only respond to the first connect event
client.on('reconnect', /* ... */);  // But respond to every reconnect event
```

#### client.close()

Permanently closes the connection. There will be no automatic reconnect attempts. This is an asynchronous
operation; the [`closed`](#event-closed-1) event will be emitted when the connection to the client has been completely
closed.

Any future call to [`client.send()`](#clientsendtopic-message) will cause the client to emit an [`error`](#event-error-1) 
event.

#### client.connect()

Tells the client to connect to the server. This is an async operation and the [`connect`](#event-connect) event will 
be emitted once the connection has been established.

This may only be called **once** per instance. Calling this method a second time will emit an 
[`error`](#event-error-1) event.

If the connection fails, a [`connectError`](#event-connecterror) event will be emitted and the client will automatically 
try again after a the delay defined by [`options.retryDelay`](#new-clientoptions). This cycle will be repeated until a 
connection is established or until [`client.close()`](#clientclose) is called. You can limit the number of retries by 
listening and counting the `connectError` events, then calling `client.close()` when you decide that it is time to 
"give up".

Once connected a [`connect`](#event-connect) will be emitted providing access to the underlying `net.Socket` instance.

If the underlying socket emits a [`close`](https://nodejs.org/docs/latest-v8.x/api/net.html#net_event_close) event, 
the behavior varies depending on whether or not [`client.close()`](#clientclose)` has been called:
  - If `client.close()` has been called, the client will emit a [`closed`](#event-closed-1) and no more messages may
    be sent from this instance.
  - if `client.close()` has NOT been called, the client will emit a [`disconnect`](#event-disconnect) event and
    it will automatically try to reconnect. The reconnection routine is identical to the initial connection routine with
    the exception that a [`reconnect`](#event-reconnect) event will be emitted _in addition to_ the `connect` event.

#### client.send(topic, message)
 - `topic` (string, required) - The topic to publish the message under. If an empty value, `none` is
    used as the value.
 - `message` (*, required) - The message. By default, this may be any JSON serializable value (including `null`) but a 
   custom [Transcoder](#transcoder) can be used to change these rules.
 
Sends a message to the server. On the server-side, this message can be heard by listening for the 
[`message`](#event-message-1) or the [`message.`_`topic`_](#event-messagetopic-1) event.

The following conditions will cause `Client` to emit an `error` event:

 - ([`EncodeError`](#encodeerror)) - When the message can not be encoded by the active [`Transcoder`](#transcoder).
 - ([`SendAfterCloseError`](#sendaftercloseerror)) - When this method is called after [`client.close()`](#serverclose) 
   is called.
 - ([`NoServerError`](#noservererror)) - When this method is called and there is no active server connection. The
   `connect`, `reconnect`, and `disconnect` events (or the related events from the underlying `net.Socket`) can be used
   to avoid this error.

Additionally, an `error` event will be emitted if the underlying `net.Socket` has stopped accepting data but the `Client`
is not yet aware of it. This is most common in when the server abruptly disconnects. In these cases, the 
[`error` event](#event-error) will simply be a repeat of the `net.Socket` error; some applications may 
[benefit from listening directly](/docs/USAGE.md#event-timing) to the socket events. 
      
### EncodeError
### DecodeError
### SendError
### SendAfterCloseError
### NoServerError
### BadClientError

## Interfaces (Classes)

## Interfaces (Callbacks/Functions)