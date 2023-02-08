class EventEmitter {
  observers: any;
  constructor() {
    this.observers = {} as any;
  }
  on<TEventName extends keyof LocalEventTypes & string>(
    events: TEventName,
    listener: (...eventArg: LocalEventTypes[TEventName]) => void
  ) {
    events.split(' ').forEach((event) => {
      this.observers[event] = this.observers[event] || [];
      this.observers[event].push(listener);
    });
    return this;
  }

  off<TEventName extends keyof LocalEventTypes & string>(
    event: TEventName,
    listener: (...eventArg: LocalEventTypes[TEventName]) => void
  ) {
    if (!this.observers[event]) return;
    if (!listener) {
      delete this.observers[event];
      return;
    }
    this.observers[event] = this.observers[event].filter((l: any) => l !== listener);
  }
  removeListener<TEventName extends keyof LocalEventTypes & string>(
    event: TEventName,
    listener: (...eventArg: LocalEventTypes[TEventName]) => void
  ) {
    if (!this.observers[event]) return;
    if (!listener) {
      delete this.observers[event];
      return;
    }
    this.observers[event] = this.observers[event].filter((l: any) => l !== listener);
  }

  emit<TEventName extends keyof LocalEventTypes & string>(
    event: TEventName,
    ...args: LocalEventTypes[TEventName]
  ) {
    if (this.observers[event]) {
      const cloned = [].concat(this.observers[event]);
      cloned.forEach((observer) => {
        // @ts-ignore
        observer(...args);
      });
    }

    if (this.observers['*']) {
      const cloned = [].concat(this.observers['*']);
      cloned.forEach((observer) => {
        // @ts-ignore
        observer.apply(observer, [event, ...args]);
      });
    }
  }
}

type LocalEventTypes = {
  'event-1': [];
  sync: any;
  'Session.logged_out': any;
  relayConnected: [arg1: string];
  startConnect: [arg1: string];
  startConnectError: [arg1: string];
  'event-2': [arg1: number, arg2: string];
  'RoomMember.powerLevel': [arg1: number, arg2: string];
  'RoomMember.membership': [arg1: number, arg2: string];
};

export enum EV {
  relayConnected = 'relayConnected',
}

export default EventEmitter;
