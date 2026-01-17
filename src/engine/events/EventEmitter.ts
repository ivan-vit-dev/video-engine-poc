/**
 * Generic event emitter for type-safe event handling
 */
export type EventHandler<T = unknown> = (payload: T) => void;

// More flexible constraint that accepts any object-like type
export type EventMap = {
  [key: string]: unknown;
};

export class EventEmitter<TEventMap extends EventMap = EventMap> {
  private handlers: Map<keyof TEventMap, Set<EventHandler>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as EventHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler as EventHandler);
    }
  }

  /**
   * Emit an event
   */
  emit<K extends keyof TEventMap>(event: K, payload: TEventMap[K]): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach((handler) => {
        try {
          handler(payload);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  /**
   * Remove all handlers for an event
   */
  removeAllListeners<K extends keyof TEventMap>(event?: K): void {
    if (event) {
      this.handlers.delete(event);
    } else {
      this.handlers.clear();
    }
  }

  /**
   * Get the number of listeners for an event
   */
  listenerCount<K extends keyof TEventMap>(event: K): number {
    return this.handlers.get(event)?.size ?? 0;
  }
}

