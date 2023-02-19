import initMatrix from '../src/client/InitMatrix';
import { formatChannelMsg } from '../src/util/matrixUtil';
import TEvent from './TEvent';

class TEventTimelineSet extends Set {
  findEventById(eventId: string): TEvent {
    const event = initMatrix.matrixClient.eventsById.get(eventId);
    if (event) {
      const mevents = formatChannelMsg(event);
      return mevents[0];
    }
    return null as unknown as TEvent;
  }
  getTimelineForEvent(eventId: string) {
    return null as any;
  }
}

export default TEventTimelineSet;
