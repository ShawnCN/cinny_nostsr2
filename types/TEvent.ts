import { TContent } from '.';
import TMember from './TMember';
import TUser from './TUser';

class TEvent {
  event: {
    state_key: string;
  };
  sender: TMember;
  replyEventId: string;
  clearEvent: boolean;
  constructor() {}
  getTs() {
    return 1;
  }
  getType() {
    return 'type';
  }
  getRelation() {
    return {
      rel_type: 'm.replace',
    };
  }
  getSender() {
    return '11';
  }
  isRedacted() {
    return false;
  }
  isSending() {
    return false;
  }
  getId() {
    return 'id';
  }
  getRoomId() {
    return 'globalfeed';
  }
  getContent() {
    return {
      // topic: 'topic',
      // suggested: 'suggested',
    } as TContent;
  }
  isEncrypted() {
    return false;
  }
  getServerAggregatedRelation(arg0: string) {
    return true;
  }
}
export default TEvent;
