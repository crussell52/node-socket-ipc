# API

Here are the full details of the `@crussell52/socket-ipc` API.

## Classes

These are instantiable classes what will pass an `instanceof` check. There are also a number of 
[`interfaces`](#interfaces) in the next section which are, at best, duck-typed at key spots in the module.

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

  - `connection (clientId)` - Fires when a client connects to the server.
    * `clientId` (`number`) - The id of the client. Use this to send a message to the client.

  - `message (message, topic, clientId)` - Fired whenever a message is received from a client, regardless
    of the `topic`.
    * `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
      type (including `null`). By using of a custom _transcoder_ that can be expanded!
    * `topic` (`string`) - The topic of the message as declared by the client.
    * `clientId` (`number`) - The id of the client. Use this to send a message to the client.

  - `message.`_`topic`_` (message, topic, clientId)` - Fired whenever a message of a specific topic is received. This
    is a dynamic event type. If a message with the topic of `desserts` (yum) is receive, it would be published
    under the `message.desserts` event.
    * `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
      type (including `null`). By using of a custom _transcoder_ you control the type range!
    * `clientId` (`number`) - The id of the client. Use this to send a message to the client.

  - `connectionClose (clientId)` - Fires when a client's connection closes.
    * `clientId` (`number`) - The id of the client. Do not send messages to clients that have disconnected.
  
  - `close` - Fires when the server is closed and all connections have been ended.

  - `error (error)` - Fires when an error occurs. `Node` provides special treatment of `error` events; if you do not
    listen for this event, it will throw the `Error`. If this is the result of an error while decoding messages, the
    connection to the client that sent the message will be closed.
    * `error` (`Error`) - The error that occurred. If the error occurred while encoding a message, it will be an 
      `EncodeError`. Similarly a decoding error will emit a `DecodeError`.
      
**Recent Changes**

  - `v0.2.0`:
    * The `messageError` event has been removed. The `error` event has been enhanced to emit an `EncodeError` or 
      `DecodeError` to cover cases previously covered by `messageError`. This was done to simplify the code and API.
    * Some `error` events would include a second, undocumented arg which provided the client id. This is no longer
      the case.
     

### Client

This library follows a standard server/client pattern. There is one server which listens for connections
from one or more clients.  Intuitively, the `Client` class provides the interface for establishing the
client side of the equation.

The client can receive messages from the server and tt can `send()` messsages.

#### Constructor

Creates a new client, but it does not connect until you call `client.connect()`. You can immediately
attach listeners to the client instance.

Possible signatures:
  - `Client(options)`
    * `options` (object, required) - The client configuration options
      - `socketFile` (string, required): The path to the socket file to use to establish a connection.
      - `retryDelay` (number, optional, default=1000) - The number of milliseconds to wait between connection attempts.
      - `reconnectDelay` (number, optional, default=100) - The number of milliseconds to wait before automatically
        reconnecting after an unexpected disconnect.

#### `client.connect()`

Tells the client to connect to the server. This is an async operation and the `connect` event will fire once the 
a connection has been established.

This may only be called **once** per instance. Calling this method a second time will result in an `Error`
being thrown (note, the `error` event will not fire in this case).

If the server is unavailable when the client attempts to connect, a `connectError` event will be fired and the client will
automatically retry after a delay defined by the `options.retryDelay` value that was passed into the constructor. This
cycle of a `connectError` event followed by a delayed retry will continue to happen until a connection is established or 
until `client.close()` is called. If you want to limit the number of retries, you can count the `connectError` events and 
call`client.close()` after some threshold. 

Once connected, if an unexpected disconnect occurs (e.g. not an explicit call to `client.close()`) a `disconnect` event
will be fired and the client will automatically start attempting to reconnect to the server. The connection process will
occur as described above, including the automatic retry behavior. The only difference is that, once a new connection is
established, a `reconnect` event will fire instead of a `connect` event.

Possible signatures:
  - `client.connect()`

#### `client.send(topic, message)`

Sends a message to the server. On the server-side, this message can be heard by listening for the `message` or the `message.`_`topic`_ event.

Possible signatures:
 - `client.send(topic, message)`
   * `topic` (string, required) - The topic to publish the message under. If an empty value, `none` is
     used as the value.
   * `message` (*, required) - The message. May be any JSON serializable value (including `null`)
      
#### `client.close()`

Permanently closes the connection. There will be no automatic reconnect attempts. This is an aysnchronous
operation; the `close` event will fire after the close operation is complete.

Once a client has been "closed", it can not reconnect. A new instance must be created. If you have a scenario that 
requires clients to be routinely closed and restarted, a factory function can be effective for handling the client 
setup.

Possible signatures:
  - `client.close()`

#### Events

  - `connectError (error)` - Fires when a connection attempt fails and a connection retry is queued.
    * `error` (`Error`) - The error that occurred.

  - `connect` - Fires when the client establishes an **initial** connection with the server.

  - `disconnect` - Fires when a client unexpectedly loses connection. This is distinct from the `close` event which 
    indicates completion of a deliberate call to `client.close()`.

  - `reconnect` - Fires when the client reestablishes a connection with the server after an unexpected disconnect.

  - `message (message, topic)` - Fired whenever a message is received from the server, regardless of the `topic`.
    * `message` (`any`) - The message from the client. By default, this can be any JSON deserializable 
      type (including `null`). By using of a custom _transcoder_ you control the type range! 
    * `topic` (string) - The topic of the message as declared by the server.

  - `message.`_`topic`_` (message, topic, clientId)` - Fired whenever a message of a specific topic is received. This
    is a dynamic event type. If a message with the topic of `desserts` (yum) is receive, it would be published
    under the `message.desserts` event.
    * `message` (`any`) - The message from the client. By default, this can be any JSON deserializable
    type (including `null`). By using of a custom _transcoder_ you control the type range! 
    
  - `close` - Fires when the client is fully closed after a call to `client.close()`.

  - `error (error)` - Fires when an error occurs. `Node` provides special treatment of `error` events; if you do not
    listen for this event, it will throw the `Error`. If this is the result of an error while decoding messages, the
    connection to the server that sent the message will be closed.
    * `error` (`Error`) - The error that occurred. If the error occurred while encoding a message, it will be an 
      `EncodeError`. Similarly a decoding error will emit a `DecodeError`.
    
**Recent Changes**

  - `v0.2.0`:
    * The `messageError` event has been removed. The `error` event has been enhanced to emit an `EncodeError` or 
      `DecodeError` to cover cases previously covered by `messageError`. This was done to simplify the code and API.
    * Some `error` events would include a second, undocumented arg which provided the client id. This is no longer
      the case.
      
### EncodeError

### DecodeError

## Interfaces