import TRoomMember from './TRoomMember';

class TEvent {
  event: TEventFormat;
  sender: TRoomMember;
  replyEventId: string;
  clearEvent: boolean;
  constructor(event: TEventFormat) {
    this.event = event;
    this.sender = new TRoomMember(this.event.sender);
  }
  getTs() {
    return this.event.origin_server_ts * 1000;
  }
  getDate() {
    return new Date(this.event.origin_server_ts * 1000);
  }
  getType() {
    return this.event.type;
  }
  getRelation() {
    // return null;
    return {
      rel_type: '111111111111111',
    };
  }
  getSender() {
    return this.event.sender;
  }
  isRedacted() {
    return false;
  }
  isSending() {
    return false;
  }
  isRedaction() {
    return false;
  }
  getId() {
    return this.event.event_id;
  }
  getRoomId() {
    return this.event.room_id;
  }
  getContent() {
    return this.event.content;
  }
  getPrevContent() {
    return null;
  }
  isEncrypted() {
    return false;
  }
  getServerAggregatedRelation(arg0: string) {
    return true;
  }
}

export type TEventFormat = {
  content: TContent;
  type: string;
  shortcut?: string[];
  shortcode?: string;
  state_key?: string;
  categorized?: string[];
  origin_server_ts: number;
  sender: string;
  event_id: string;
  room_id: string;
  redacts?: any;
};
export type TContent = {
  body: string;
  msgtype?: string;
  external_url?: string;
  format?: string;
  formatted_body?: string;
  membership?: string;
};

type TMsgType = 'm.text';
export type TMembership = 'join' | 'leave' | 'invite' | 'ban';

export type TEventType = 'm.room.message' | 'm.room.message' | 'm.room.member';

export default TEvent;
