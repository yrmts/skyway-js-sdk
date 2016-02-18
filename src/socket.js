'use strict';

const io           = require('socket.io-client');

const EventEmitter = require('events');

class Socket extends EventEmitter {
  constructor(secure, host, port, key) {
    super();

    this.disconnected = true;
    this._queue = [];

    this._socket = null;
    this._key   = key;

    let httpProtocol = secure ? 'https://' : 'http://';
    this._httpUrl = `${httpProtocol}${host}:${port}`;
  }

  start(id, token) {
    this._socket = io(this._httpUrl, {
      'force new connection': true,
      'query':                `apiKey=${this._key}&token=${token}&peerId=${this.id}`
    });

    this._socket.on('OPEN', peerId => {
      if (peerId) {
        this.disconnected = false;
      }

      // This may be redundant, but is here to match peerjs:
      this._sendQueuedMessages();

      // To inform the peer that the socket successfully connected
      this.emit('OPEN');
    });
  }

  send(data) {
    // If we are not connected yet, queue the message
    if (this.disconnected) {
      this._queue.push(data);
      return;
    }

    if (!data.type) {
      this._socket.emit('ERR', 'Invalid message');
      return;
    }

    var message = JSON.stringify(data);
    if (this._socket.connected === true) {
      this._socket.emit('MSG', message);
    }
  }

  close() {
    // if (!this.disconnected && (this._socket.readyState === 1)) {
    if (!this.disconnected) {
      this._socket.disconnect();
      this.disconnected = true;
    }
  }

  _sendQueuedMessages() {
    for (var i = 0; i < this._queue.length; i++) {
      // Remove each item from queue in turn and send
      this.send(this._queue.shift());
    }
  }
}

module.exports = Socket;
