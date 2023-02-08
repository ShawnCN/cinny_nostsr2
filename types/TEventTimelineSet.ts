import TEvent from './TEvent';

class TEventTimelineSet extends Set {
  findEventById(eventId: string): TEvent {
    return null as unknown as TEvent;
  }
  getTimelineForEvent(eventId: string) {
    return null as any;
  }
}

export default TEventTimelineSet;
