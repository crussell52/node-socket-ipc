/**
 * @author Chris Russell <crussell52@gmail.com>
 * @copyright Chris Russell 2018
 * @license MIT
 */

'use strict';

const {EventEmitter} = require('events');
const net = require('net');
const fs = require('fs');
const jsonTranscoder = require('./lib/transcoder/jsonTranscoder');
const {MessageError} = require('./lib/error');

/**
 * @interface MessageWrapper
 *
 * @property {string} topic - A non-empty topic for the message.
 * @property {*} message - The message. This may be any value that can be encoded by the current Transcoder. Unless a
 *     custom Transcoder is configured, this must be a JSON serializable object.
 */

/**
 * @interface Transcoder
 *
 * @property {string} socketEncoding - The encoding to use when reading/writing data on the underlying socket.
 * @property {encoderFactoryFunc} createEncoder - A no-argument factory function which returns an `encoderFunc`. The
 *     returned `encoderFunc` may be used to encode across multiple connections making it impossible to predict which
 *     encoder instance is used for which connection. For this reason, attempting to make an encoder which "buffers"
 *     data from several messages before sending it will result in undefined behavior.
 * @property {decoderFactoryFunc} createDecoder - A no-argument factory function which returns a `decoder`. Each unique
 *     connection is guaranteed to receive its own decoder instance. In most cases, each returned decoder should
 *     contain some sort of stateful "buffer" to handle cases where a message's data is spread across multiple
 *     encoder calls.
 */

/**
 * @callback encoderFactoryFunc
 * @returns {encoderFunc}
 */

/**
 * @callback decoderFactoryFunc
 * @returns {decoderFunc}
 */

/**
 * Invoked by an `encoderFunc` when it has finished its work.
 *
 * The `EncoderFunc` MUST invoke this callback when it is done working with either the first or second argument
 * populated.
 *
 * @callback encodedCallback
 * @param {Error, EncodeError} error - If an error occurred, an `Error` should be passed as the first arg.
 * @param {*} data - The encoded data. The encoder MAY use `null` as a data value to indicate that the message was
 *     skipped; no data will be sent in this case and the message will be silently discarded. The return value must
 *     be ready to be written to the `net.Socket` so it should be in agreement with the socket encoding set by
 *     `Transcoder#socketEncoding`.
 */

/**
 * Invoked by an `decoderFunc` when it has finished its work.
 *
 * The `EncoderFunc` MUST invoke this callback when it is done working with either the first or second argument
 * populated.
 *
 * @callback decodedCallback
 * @param {Error, DecodeError} error - If an error occurred, an `Error` should be passed as the first arg.
 * @param {MessageWrapper[]} data - An array `MessageWrapper` objects that each include a single message and its topic.
 *     This may be an empty array in cases where the `decoderFunc` did not receive enough data for a complete message.
 */

/**
 * Encodes a `MessageWrapper` so that it can be placed on the socket.
 *
 * @callback encoderFunc
 * @param {MessageWrapper} msgWrapper - The message to be encoded and its topic.
 * @param {encodedCallback} callback - The callback to invoke after all work is complete.
 */

/**
 * Decodes raw data.
 *
 * @callback decoderFunc
 * @param {*} chunk - A chunk of data to be decoded. This may contain a full message, a partial message, or multiple
 *     messages. The data type will depend on the socket encoding defined by `Transcoder#socketEncoding`.
 * @param {decodedCallback} callback - The callback to invoke after all work is complete.
 */


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

/**
 * Factory method for listening to incoming data on an underlying socket.
 *
 * @param {Socket} socket - The socket to listen to.
 * @param {EventEmitter} emitter - Where to emit events from.
 * @param {Transcoder} transcoder - The transcoder to use.
 * @param {int} [clientId] - Only relevant in the server context. The id of the client the socket is attached to.
 */
const attachDataListener = (socket, emitter, transcoder, clientId) => {

    /** @type {decoderFunc} */
    const decoder = transcoder.createDecoder();
    const emitError = (err) => {
        socket.destroy(err);
        emitter.emit('error', err, clientId);
    };
    const emitMessage = (msgWrapper) => {
        emitter.emit('message', msgWrapper.message, msgWrapper.topic, clientId);
        emitter.emit(`message.${msgWrapper.topic}`, msgWrapper.message, clientId);
    };

    socket.on('data', chunk => {
        // Run the decoder with a callback that either emits an error or messages.
        decoder(chunk, (err, msgWrappers) => {
            if (err) {
                emitError(err);
                return;
            }

            for (let i = 0; i < msgWrappers.length; i++) {
                try {
                    emitMessage(msgWrappers[i]);
                } catch (err) {
                    // Emit the error and stop processing messages.
                    emitError(err);
                    return;
                }
            }
        });
    });
};

class Server extends EventEmitter {
    /**
     * @param {string} options.socketFile - Path to the socket file to use.
     * @param {Transcoder} [options.transcoder] - The transcoder to use to prepare messages to be written to the
     *     underlying socket or to process data being read from the underlying socket.
     */
    constructor(options) {
        super();

        this._transcoder = options.transcoder || jsonTranscoder;
        this._encoder = this._transcoder.createEncoder();

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
            if (err.code === 'EADDRINUSE') {
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
        });
        
        this._server.on('connection', socket => {
            
            const id = this._nextClientId++;
            this._sockets.set(socket, id);
            this._clientLookup.set(id, socket);

            socket.setEncoding('utf8');
            socket.on('close', () => {
                this._sockets.delete(socket);
                this._clientLookup.delete(id);
                this.emit('connectionClose', id);
            });

            this.emit('connection', id);

            // Listen for messages on the socket.
            attachDataListener(socket, this, this._transcoder, id);
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
        // Encode once, send many
        this._encoder({topic, message}, (err, data) => {
            if (err) {
                this.emit('error', err);
                return;
            }

            // Broadcast the message to all known sockets.
            this._sockets.forEach((id, socket) => {
                socket.write(data)
            });
        });
    }

    send(topic, message, clientId) {
        if (!this._clientLookup.has(clientId)) {
            this.emit(`error`, new Error(`Invalid client id: ${clientId}`));
            return;
        }

        const socket = this._clientLookup.get(clientId);
        this._encoder({topic, message}, (err, data) => {
            if (err) {
                this.emit('error', err);
            } else {
                socket.write(data);
            }
        });
    }
}

class Client extends EventEmitter {
    /**
     * @param {Transcoder} [options.transcoder] - The transcoder to use to prepare messages to be written to the
     *     underlying socket or to process data being read from the underlying socket.
     * @param {int} [options.retryDelay=1000] - The number of milliseconds to wait between connection attempts.
     * @param {int} [options.reconnectDelay=100] - The number of milliseconds to wait before reconnecting.
     * @param {string} options.socketFile - The path to the socket file to use.
     */
    constructor(options) {
        super();

        this._transcoder = options.transcoder || jsonTranscoder;
        this._encoder = this._transcoder.createEncoder();
        
        // See if the given socket file looks like a port. We don't support running the server on a port.
        let invalidSockFileReason = validateSocketFileOption(options.socketFile);
        if (invalidSockFileReason) {
            throw new Error(`Invalid value for 'options.socketFile' (${options.socketFile}): ${invalidSockFileReason}`);
        }
        this._socketFile = options.socketFile;
        this._retryDelay = options.retryDelay || 1000;
        this._reconnectDelay = options.reconnectDelay || 100;
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

        // Until a connection is established, handle errors as connection errors.
        const handleConnectError = (err) => {
            this.emit('connectError', err);
            this._retryTimeoutId = setTimeout(() => this._connect(isReconnect), this._retryDelay);
        };
        socket.on('error', handleConnectError);

        socket.on('connect', () => {
            this._socket = socket;
            isReconnect ? this.emit('reconnect') : this.emit('connect');
            
            // Swap out the connection error handling for standard error handling.
            socket.removeListener('error', handleConnectError);
            socket.on('error', (err) => this.emit('error', err));
            
            // Handle closed sockets.
            socket.on('close', () => {
                // "Forget" the socket.
                this._socket = null;
    
                // See if this was an explicit close.
                if (this._explicitClose) {
                    // Emit the "close" event.
                    this.emit('close');
                } else {
                    // Announce the disconnect, then try to reconnect after a brief delay.
                    
                    this.emit('disconnect');
                    this._reconnectDelayTimeoutId = setTimeout(() => this._connect(true), this._reconnectDelay);
                }
            });
        });

        // Listen for data on the socket.
        attachDataListener(socket, this, this._transcoder);
    }

    close() {
        this._explicitClose = true;
        // Stop any retry or reconnect timers.
        clearTimeout(this._retryTimeoutId);
        clearTimeout(this._reconnectDelayTimeoutId);
        if (this._socket) {
            this._socket.close();
        }
    }

    send(topic, message) {
        this._encoder({topic, message}, (err, data) => {
            if (err) {
                this.emit('error', err);
            } else {
                this._socket.write(data);
            }
        });
    }

}

module.exports = {
    Client,
    Server,
    MessageError
};