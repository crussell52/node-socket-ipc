'use strict';

const {EventEmitter} = require('events');
const net = require('net');
const fs = require('fs');
const delimeter = '%<EOM>%\n';

/**
 * Takes in a value and make sure it looks like a reasonable socket file path.
 * 
 * Nodejs does some auto-detection in some cases to determine what type of connection
 * to make. This helps guard against misconfiguration leading to other types of
 * connections.
 * 
 * @param {*} value - The value to test
 */
const validateSocketFileOption = (value) => {
    // See if the value is empty.
    if (!value) {
        return `Is empty`
    }
    
    // See if it looks like a port (all digits)
    if (/^\d+$/.test(value)) {
        return `Looks like a port`;
    }
};

const parseMessage = raw => {

    // Decode as JSON
    let message;
    try {
         message = JSON.parse(raw);
    } catch(cause) {
        // Not able to parse as JSON. Tell the server to emit an error and move on.
        throw new MessageError('Failed to parse as JSON', raw);
    }

    // It is valid JSON, but it is a valid message?
    if (!message.topic) {
        // No topic, not a valid message. Tell the server to emit an error and move on.
        throw new MessageError('Invalid message structure.', raw);
    }

    return message;
};

class MessageError extends Error {
    constructor(errorMessage, receivedMessage) {
        super(errorMessage);
        this.message = receivedMessage;
    }
}

const send = (socket, data, topic) => {
    socket.write(JSON.stringify({
        topic: topic || 'none',
        data: data
    }) + delimeter);
};

class MessageBuffer {
    constructor() {
        this.buffer = '';
    }

    data(chunk) {

        // Use the buffer plus this chunk as the data that we need to process.
        let data = this.buffer += chunk;

        // Split on the delimeter to find distinct and complete messages.
        let messages = data.split(delimeter);

        // Pop the last element off of the message array. It is either an incomplete message
        // or an empty string. Use it as the new buffer value.
        this.buffer = messages.pop();

        return messages;
    }
};

/**
 * @fires message (message, topic, clientId)
 * @fires message.topic (message, clientId)
 * @fires connection (clientId)
 * @fires connectionClose (had_error, clientId)
 * @fires listening
 * @fires messageError (error, clientId) 
 * @fires close
 * @fires error (error)
 */
class Server extends EventEmitter {
    /**
     * @param {string} options.socketFile - Path to the socket file to use. 
     */
    constructor(options) {
        super();

        // See if the given socket file looks like a port. We don't support running the server on a port.
        let invalidSockFileReason = validateSocketFileOption(options.socketFile);
        if (invalidSockFileReason) {
            throw new Error(`Invalid value for 'options.socketFile' (${options.socketFile}): ${invalidSockFileReason}`);
        }
        
        this._socketFile = options.socketFile;
        this._nextClientId = 1;

        // In the socket map, the keys are the sockets and the values are the client id. This allows incoming messages
        // to be easily associated with their client id.
        this._sockets = new Map();

        // In the socket lookup, the ids are the keys and the sockets are the value. This allows an application
        // to send a message to a particular client by just knowing the client id. 
        this._clientLookup = new Map();
    }

    /**
     * Creates a standard Node net server and immediately starts listening to the provided socket file.
     *  
     * This method may only be called once.
     */
    listen() {
        if (this._server) {
            throw new Error('Can not listen twice.');
        }

        // Create the server. 
        this._server = net.createServer();
        this._server.on('error', err => {
            if (err.code == 'EADDRINUSE') {
                // See if it is a valid server by trying to connect to it.
                const testSocket = net.createConnection({path: this._socketFile});
                
                // If the connection is established, then there is an active server and the originl
                // error stands.
                testSocket.on('connect', () => this.emit('error', err));
                
                // If the connection errors out, then there is a chance we can recover.
                testSocket.on('error', testErr => {
                    if (testErr.code !== 'ECONNREFUSED') {
                        // We didn't connect, but it does NOT look like its because it is a dead sock file.
                        // Let the original error stand.
                        this.emit('error', err);
                        return;
                    }

                    // conn-refused implies that this is a dead sock file. Attempt to unlink it.
                    try {
                        fs.unlinkSync(this._socketFile);
                    } catch (unlinkErr) {
                        // Nope... unlink failed. Possibly because we don't have the perms to remove the sock.
                        // Emit the original error.
                        console.log('no unlink for you!', unlinkErr);
                        this.emit('error', err);
                        return;
                    }

                    // Try listening again.
                    this._server.listen(this._socketFile);
                });
            } else {
                this.emit('error', err);
            }
        });
        this._server.on('close', () => this.emit('close') );

        this._server.on('listening', () => {
            this.emit('listening');
        })
        
        this._server.on('connection', socket => {
            
            const buffer = new MessageBuffer();
            const id = this._nextClientId++;
            this._sockets.set(socket, id);
            this._clientLookup.set(id, socket);

            socket.setEncoding('utf8');
            socket.on('close', had_error => {
                this._sockets.delete(socket);
                this._clientLookup.delete(id);
                this.emit('connectionClose', had_error, id);
            });

            this.emit('connection', id);

            // Listen for messages on the socket.
            socket.on('data', chunk => {
                // Process each message.
                buffer.data(chunk).forEach(raw => {
                    let message;
                    try {
                        message = parseMessage(raw);
                    } catch(e) {
                        this.emit('messageError', e, id);
                        return;
                    }

                    // Message events get emitted by the server.
                    this.emit('message', message.data, message.topic, id);
                    this.emit(`message.${message.topic}`, message.data, id);
                });
            });
        });

        this._server.listen(this._socketFile);
    }

    close() {
        // Close the server to stop incoming connections, then destroy all known sockets.   
        this._server.close();
        this._sockets.forEach((id, socket) => {
             socket.destroy();
        });        
    }

    broadcast(topic, message) {
        // Broadcast the message to all known sockets. 
        this._sockets.forEach((id, socket) => {
            send(socket, message, topic);
        });
    }

    send(topic, message, clientId) {
        if (!this._clientLookup.has(clientId)) {
            this.emit(`error`, new Error(`Invalid client id: ${clientId}`));
            return;
        }

        send(this._clientLookup.get(clientId), message, topic);
    }
};

/**
 * @fires connect
 * @fires noServer (error)
 * @fires disconnect (had_error)
 * @fires close (had_error)
 * @fires message (message, topic)
 * @fires message.topic (message)
 * @fires messageError (error) 
 * @fires error (error)
 */
class Client extends EventEmitter {
    /**
     * @param {int} [options.retryDelay=1000] - The number of milliseconds to wait between connection attempts.
     * @param {int} [options.reconnectDelay=100] - The number of milliseconds to wait before reconnecting.
     * @param {string} options.socketFile - The path to the socket file to use.
     */
    constructor(options) {
        super();
        
        // See if the given socket file looks like a port. We don't support running the server on a port.
        let invalidSockFileReason = validateSocketFileOption(options.socketFile);
        if (invalidSockFileReason) {
            throw new Error(`Invalid value for 'options.socketFile' (${options.socketFile}): ${invalidSockFileReason}`);
        }
        this._socketFile = options.socketFile;
    }

    connect() {
        // Only allow a single call to connect()
        if (this._connectCalled) {
            throw new Error('ipc.Client.connect() already called.');
        }

        this._connectCalled = true;
        this._connect(false);
    }

    _connect(isReconnect) {
        
        const socket = net.createConnection({path: this._socketFile});
        socket.setEncoding('utf8');

        socket.on('connect', () => {
            this._socket = socket;
            isReconnect ? this.emit('reconnect') : this.emit('connect');
            socket.on('close', had_error => {
                // "Forget" the socket.
                this._socket = null;
    
                // See if this was an explicit close.
                if (this._explicitClose) {
                    // Emit the "close" event.
                    this.emit('close', had_error);
                } else {
                    // Announce the disconnect, then try to reconnect after a brief delay.
                    
                    this.emit('disconnect', had_error);
                    setTimeout(() => this._connect(true), this._reconnectDelay);
                }
            });
        });
        
        socket.on('error', err => {
            // Look for a failure to find the socket file.
            if (err.code == 'ENOENT' || err.code == 'ECONNREFUSED') {
                // Socket file does not exist, or there is no server using it. Try again in 1s.
                this.emit('noServer', err);
                setTimeout(() => {
                    this._connect(isReconnect);
                }, this._retryDelay);
                return;
            }

            // Some other error... just emit the error event.
            this.emit('error', err);
        });

        const buffer = new MessageBuffer();
        socket.on('data', chunk => {
                // Process each message.
                buffer.data(chunk).forEach(raw => {
                    let message;
                    try {
                        message = parseMessage(raw);
                    } catch(e) {
                        this.emit('messageError', e);
                        return;
                    }

                    // Emit the events.
                    this.emit('message', message.data, message.topic);
                    this.emit(`message.${message.topic}`, message.data);
                });
        });
    }

    close() {
        this._explicitClose = true;
        clearTimeout(this._retryTimeoutId);
        if (this._socket) {
            this._socket.close();
        }
    }

    send(topic, message) {
        send(this._socket, message, topic);
    }
}

module.exports = {
    Client,
    Server,
    MessageError
}