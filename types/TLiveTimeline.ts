import { aevent1, aevent2, aevent3, aevent4 } from '../src/client/state/cons';
import TEvent from './TEvent';

class TLiveTimeline {
  nextTimeline: any;
  prevTimeline: any;
  events: TEvent[];
  constructor(events: TEvent[]) {
    if (events) {
      this.events = events;
    } else {
      this.events = [];
    }
  }
  getEvents() {
    return this.events;
    // console.log('nexttimeline', this.nextTimeline);
    // const e1 = new TEvent(aevent1);
    // const e2 = new TEvent(aevent2);
    // const e3 = new TEvent(aevent3);
    // const e4 = new TEvent(aevent4);
    // return [e1, e2, e3, e4];
    return [];
  }
  getPaginationToken(arg0: string) {
    return 'b';
  }
}

export default TLiveTimeline;
