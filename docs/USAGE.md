# Usage

General knowledge for the simplest use cases. 

## A Note on Safety

Unix socket files exist on the file system. This library does not provide any special handling of their
creation; it leaves that up to the expert: the [NodeJs net module](https://nodejs.org/api/net.html). In fact, 
that page has a section dedicated to Node's [IPC support](https://nodejs.org/api/net.html#net_ipc_support)
that you should probably read, if you are not already famliiar with it.

Because they are files, they are subject to permissions. Make sure you understand how those permissions work 
for sockets on your target OS. Use appropriate caution to not expose your application's messages to unintended
audiences **or expose your application to messages from unintended clients!**.

Socket files are very commonly used. You could use this library to tap into any socket file that your process has
access to! That could be _very_ interesting... but it could also be hazardous. In particular, the `Server` will
try to use _any_ socket file you tell it to -- even if that socket file is normally used by another service. Now, it 
can't "hijack" a socket file that another server is actively using, but if you occupy it, the other service may fail
to start or its client's may think you are their server and start sending unexpected data!

The details of how socket files work and the traps that might lurk in the shadows are **far** beyond the scope of this
module's documentation. Like any good module, `socket-ipc` tries to hide this complexity from you and get you up
and running fast. But if this is your first time stepping into this territory, it might still be worth the effort to
learn a bit about them.  

## Automatic Retry

## Automatic Reconnect

## Working with client ids

## Event Timing

The [API Docs](/docs/API.md) provide tips on minimizing errors by reacting to particular events. The natural question
is, "Why _minimize_ instead of _eliminate_?"

The simple(ish) answer is because sockets may disconnect at _any moment_, but events listeners are only executed at a 
very specific phase of the node [event loop](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/). More 
significantly, an abrupt disconnect (e.g. client/server does not gracefully close connection) is only detectable when
you attempt to write data to the socket. In other words, it is _always_ possible that the socket may be made unavailable 
before event listeners can handle the case.

This module tries to strike a balance between usability and giving you the ability to quickly respond to socket events.

For convenience, `socket-ipc` events will listen for key socket events and either emit more specific events or simply
_echo_ the original event. For example, whenever a `socket` emits an `error` event `socket-ipc` will handle it by 
repeating it as its own `error` event. Because of the way the Node event loop works, that means the socket-ipc `error` 
event may (will?) be "emitted" at least one event loop iteration later than the original socket `error` event. For many 
cases these _repeats_ should be good enough. However, this is application dependent. 

To allow high-throughput applications respond just a _little bit_ faster to socket events, we expose the actual 
`net.Socket` instance upon connection. We have also sprinkled "hints" in our API docs about when these applications may 
want to attach listeners directly to the socket event. There are also important events which we do even attempt to 
repeat, such as `end` and `close` events; for these, you will need to listen directly to the socket.

Our "official" recommendation is that you listen to the `socket-ipc` events unless the timing is causing specific 
problems in your application. If you suspect timing side effects, _try_ listening directly to the socket and see if that 
makes a _meaningful_ difference. (**Note, in running simulations, we were not able to find ) 