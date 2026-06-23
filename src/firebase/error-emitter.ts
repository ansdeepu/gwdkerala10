// src/firebase/error-emitter.ts

// This is a simple event emitter that allows different parts of the app
// to communicate without direct dependencies. We'll use it to broadcast
// Firestore permission errors to a central listener.

type EventMap = {
  'permission-error': (error: Error) => void;
};

type EventName = keyof EventMap;

class EventEmitter {
  private listeners: { [K in EventName]?: Array<EventMap[K]> } = {};

  on<E extends EventName>(eventName: E, callback: EventMap[E]): void {
    if (!this.listeners[eventName]) {
      this.listeners[eventName] = [];
    }
    this.listeners[eventName]!.push(callback);
  }

  off<E extends EventName>(eventName: E, callback: EventMap[E]): void {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName] = this.listeners[eventName]!.filter(
      (cb) => cb !== callback
    );
  }

  emit<E extends EventName>(eventName: E, data: Parameters<EventMap[E]>[0]): void {
    if (!this.listeners[eventName]) return;
    this.listeners[eventName]!.forEach((callback) => callback(data));
  }
}

export const errorEmitter = new EventEmitter();
