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
        this.clientId = clientId;
    }
}

class SendError extends Error {
    /**
     * @param {string} errorMessage - A description of what went wrong.
     * @param {*} message - The message being sent.
     * @param {string} topic - The topic of the message being sent.
     */
    constructor(errorMessage, message, topic) {
        super(errorMessage);
        this.sentTopic = topic;
        this.sentMessage = message;
    }
}

class SendAfterCloseError extends SendError { }
class NoServerError extends SendError { }

class BadClientError extends SendError {
    /**
     * @param {string} errorMessage - A description of what went wrong.
     * @param {*} message - The message being sent.
     * @param {string} topic - The topic of the message being sent.
     * @param {string} clientId - The client id which is invalid.
     */
    constructor(errorMessage, message, topic, clientId) {
        super(errorMessage, message, topic);
        this.clientId = clientId;
    }
}

/**
 * Indicates that an error happened during the encoding phase of sending a message.
 */
class EncodeError extends SendError {
    /**
     * @param {string} errorMessage - A description of what went wrong.
     * @param {MessageWrapper} msgWrapper - The message being sent and its topic.
     */
    constructor(errorMessage, msgWrapper) {
        super(errorMessage, msgWrapper.message, msgWrapper.topic);
    }
}

module.exports = {
    EncodeError, DecodeError, SendError, SendAfterCloseError, NoServerError, BadClientError
};