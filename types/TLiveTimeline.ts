import TEvent from './TEvent';

class TLiveTimeline {
  nextTimeline: any;
  getEvents() {
    const e = new TEvent();
    return [e];
  }
  getPaginationToken(arg0: string) {
    return 'b';
  }
}

export default TLiveTimeline;
