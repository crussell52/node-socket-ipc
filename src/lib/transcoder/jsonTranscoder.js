/**
 * @author Chris Russell <crussell52@gmail.com>
 * @copyright Chris Russell 2018
 * @license MIT
 */

'use strict';

const {DecodeError, EncodeError} = require('../error');
const delimiter = "\0\0";

module.exports = {
    socketEncoding: 'utf8',

    createEncoder: () => {
        // Return an encoder function.
        return (msgWrapper, cb) => {
            try {
                cb(null, JSON.stringify(msgWrapper) + delimiter);
            } catch (err) {
                cb(new EncodeError('Failed to encode, caused by: ' + err.message, msgWrapper));
            }
        };
    },

    createDecoder: () => {
        // Each decoder gets it own buffer.
        let buffer = '';

        // Return an encoder function.
        return (chunk, cb) => {

            // Use the buffer plus this chunk as the data that we need to process.
            let data = buffer += chunk;

            // Split on the delimiter to find distinct and complete messages.
            let rawMessages = data.split(delimiter);

            // Pop the last element off of the message array. It is either an incomplete message
            // or an empty string. Use it as the new buffer value.
            buffer = rawMessages.pop();

            // Build out the list of decoded messages.
            const messages = [];
            for (let i = 0; i < rawMessages.length; i++) {
                try {
                    messages.push(JSON.parse(rawMessages[i]));
                } catch (err) {
                    // Invoke the callback with a DecodeError and stop processing.
                    cb(new DecodeError('Failed to decode, caused by: ' + err.message, rawMessages[i]));
                    return;
                }
            }

            cb(null, messages);
        }
    }
};