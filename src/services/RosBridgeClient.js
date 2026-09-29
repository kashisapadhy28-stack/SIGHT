/**
 * SIGHT ROSBridgeClient Service
 * Manages WebSocket connection to ROS 2 rosbridge_server (JSON protocol v2.0).
 * Handles topic subscription, auto-reconnect, deserialization, and state dispatching.
 */

export class RosBridgeClient {
  constructor(options = {}) {
    this.url = options.url || 'ws://localhost:9090';
    this.ws = null;
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectTimer = null;
    this.reconnectIntervalMs = 3000;

    // Callbacks map: topic -> Array of callback functions
    this.subscribers = new Map();
    
    // Lifecycle listeners
    this.onStatusChange = options.onStatusChange || (() => {});
    this.onError = options.onError || (() => {});
  }

  setUrl(url) {
    this.url = url;
    if (this.isConnected || this.isConnecting) {
      this.disconnect();
      this.connect();
    }
  }

  connect() {
    if (this.isConnected || this.isConnecting) return;

    this.isConnecting = true;
    this.onStatusChange({ connected: false, status: 'CONNECTING', url: this.url });

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.isConnecting = false;
        console.log(`[ROS2 Bridge] Connected to SIGHT AMR at ${this.url}`);
        this.onStatusChange({ connected: true, status: 'CONNECTED', url: this.url });

        // Resubscribe to all active topics
        for (const [topic, { type }] of this.subscribers.entries()) {
          this._sendSubscribe(topic, type);
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.op === 'publish' && msg.topic) {
            const entry = this.subscribers.get(msg.topic);
            if (entry && entry.callbacks) {
              entry.callbacks.forEach(cb => cb(msg.msg));
            }
          }
        } catch (err) {
          console.warn('[ROS2 Bridge] Error parsing message payload:', err);
        }
      };

      this.ws.onclose = () => {
        const wasConnected = this.isConnected;
        this.isConnected = false;
        this.isConnecting = false;
        this.onStatusChange({ connected: false, status: 'DISCONNECTED', url: this.url });

        if (wasConnected) {
          console.log('[ROS2 Bridge] Connection lost. Attempting reconnect...');
        }
      };

      this.ws.onerror = (err) => {
        this.onError(err);
      };
    } catch (err) {
      this.isConnecting = false;
      this.isConnected = false;
      this.onStatusChange({ connected: false, status: 'ERROR', url: this.url, error: err });
    }
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.isConnecting = false;
    this.onStatusChange({ connected: false, status: 'DISCONNECTED', url: this.url });
  }

  subscribe(topic, messageType, callback) {
    if (!this.subscribers.has(topic)) {
      this.subscribers.set(topic, { type: messageType, callbacks: [] });
      if (this.isConnected) {
        this._sendSubscribe(topic, messageType);
      }
    }

    const entry = this.subscribers.get(topic);
    entry.callbacks.push(callback);
  }

  unsubscribe(topic, callback) {
    if (!this.subscribers.has(topic)) return;
    const entry = this.subscribers.get(topic);
    entry.callbacks = entry.callbacks.filter(cb => cb !== callback);

    if (entry.callbacks.length === 0) {
      this.subscribers.delete(topic);
      if (this.isConnected) {
        this._sendUnsubscribe(topic);
      }
    }
  }

  _sendSubscribe(topic, type) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const subMsg = {
      op: 'subscribe',
      topic: topic,
      type: type
    };
    this.ws.send(JSON.stringify(subMsg));
  }

  _sendUnsubscribe(topic) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const unsubMsg = {
      op: 'unsubscribe',
      topic: topic
    };
    this.ws.send(JSON.stringify(unsubMsg));
  }
}
