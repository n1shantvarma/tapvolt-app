type SocketServiceCallbacks = {
  onOpen?: () => void;
  onClose?: (event: WebSocketCloseEvent) => void;
  onError?: () => void;
  onMessage?: (data: unknown) => void;
};

const noop = () => {};

export class SocketService {
  private socket: WebSocket | null = null;
  private callbacks: SocketServiceCallbacks = {};

  setCallbacks(callbacks: SocketServiceCallbacks): void {
    this.callbacks = callbacks;
  }

  get isOpen(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

  connect(url: string): void {
    this.disconnect();

    this.socket = new WebSocket(url);
    this.socket.onopen = () => {
      this.callbacks.onOpen?.();
    };
    this.socket.onmessage = (event: WebSocketMessageEvent) => {
      this.callbacks.onMessage?.(event.data);
    };
    this.socket.onerror = () => {
      this.callbacks.onError?.();
    };
    this.socket.onclose = (event: WebSocketCloseEvent) => {
      this.callbacks.onClose?.(event);
    };
  }

  send(message: unknown): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.socket.send(JSON.stringify(message));
    return true;
  }

  disconnect(code?: number, reason?: string): void {
    if (!this.socket) {
      return;
    }

    const socket = this.socket;
    this.socket = null;

    socket.onopen = noop;
    socket.onmessage = noop;
    socket.onerror = noop;
    socket.onclose = noop;

    socket.close(code, reason);
  }
}

