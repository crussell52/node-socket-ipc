/**
 * @author Chris Russell <crussell52@gmail.com>
 * @copyright Chris Russell 2018
 * @license MIT
 */

'use strict';

class DecodeError extends Error {
    /**
     * @param errorMessage - A description of what happened.
     * @param {*} rawData - The data which failed to decode.
     */
    constructor(errorMessage, rawData) {
        super(errorMessage);
        this.rawData = rawData;
    }
}

class EncodeError extends Error {
    /**
     * @param {string} errorMessage - A description of what happened.
     * @param {MessageWrapper} messageWrapper - The message which failed to encode and its topic.
     */
    constructor(errorMessage, messageWrapper) {
        super(errorMessage);
        this.topic = messageWrapper.topic;
        this.message = messageWrapper.message;
    }
}

module.exports = {
    EncodeError, DecodeError
};