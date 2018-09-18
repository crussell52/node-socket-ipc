# @crussell52/node-ipc
An event-driven IPC implementation using unix file sockets.

## Why another IPC lib?

I had a need for high speed IPC. Simply put, I went looking at the IPC libraries that were
currently published and struggled to find one that met my needs.

In some cases, they were bound to specific message formats:
 * [avsc](https://www.npmjs.com/package/avsc) (implements the Avro specification) 
 * [json-ipc-lib](https://www.npmjs.com/package/json-ipc-lib) (implements JSON-RPC 2.0)
 * [BOSCAR](https://www.npmjs.com/package/boscar) (JSON-RPM 2.0 subset)

Several were linked to specific technologies:
 * [redux-electron-ipc](https://www.npmjs.com/package/redux-electron-ipc) (Electron)
 * [electron-ipc-responder](https://www.npmjs.com/package/electron-ipc-responder) (Electron)
 * [pg-ipc](https://www.npmjs.com/package/pg-ipc) (PostgreSQL)
 * [python-bridge](https://www.npmjs.com/package/python-bridge) (Python)
 * [node-jet](https://www.npmjs.com/package/node-jet) (jetbus.io)

 A few others covered specific use cases:
 * [ipc-event-emitter](https://www.npmjs.com/package/ipc-event-emitter) (Node Subprocesses)

Etc...

So, like the 50 billion other authors, I chose to make my own.

## Why is this one different?

I can't say that it is different than *all* of the others -- there really are a lot of projects tagged as IPC. But here are the goals:

- Simple server/client, bi-direction communication over Unix sockets (maybe other transports, one day)
- Simple interface for sending messages:
  * From the server to a specific client
  * From the server to all clients (broadcast)
  * From any client to the server
- Event driven, using native NodeJS `EventEmitter`
- Ability to listen for all messages or messages related to a specific "topic"
- Client resiliency (automatic reconnection, automatic connection retry)
- Generic enough that specific implementations can be built around it

## Limitations

- NodeJS >= 8.x LTS (might work with perfectly fine with some older versions -- but not tested)
- Unix socket files (might work with windows socket files too -- but not tested)

