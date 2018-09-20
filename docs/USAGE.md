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

## Throughput

