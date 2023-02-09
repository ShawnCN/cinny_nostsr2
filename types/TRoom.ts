import RoomTimeline from '../src/client/state/RoomTimeline';
import TEvent from './TEvent';
import TEventTimelineSet from './TEventTimelineSet';
import TLiveTimeline from './TLiveTimeline';
import TMember from './TMember';
import TRoomMember from './TRoomMember';
import TUser from './TUser';

class TRoom {
  roomId: string;
  name: string;
  avatarUrl: string;
  canonical_alias: string; //intro
  num_joined_members: string;
  aliases?: string[];
  topic: string;
  currentState: CurrentState;
  // currentState: {
  //   getStateEvents: typeof getStateEvents;
  // };
  constructor() {
    // this.currentState.getStateEvents = getStateEvents();
    this.currentState = new CurrentState();
  }
  getMember(userId: string) {
    const user = new TRoomMember();
    return user;
  }
  getUnreadNotificationCount(arg0: string) {
    return 11;
  }
  getLastActiveTimestamp() {
    return Date.now();
  }
  canInvite(userId: string) {
    return true;
  }
  getMyMembership(): 'join' | 'invite' {
    return 'join';
  }
  isSpaceRoom() {
    return true;
  }
  getAvatarUrl(arg0: string, arg1: number, arg2: number, arg3: string) {
    return '';
  }
  getUsersReadUpTo(arg0: TEvent) {
    return [0, 1];
  }
  getEventReadUpTo(userId: string) {
    return '1';
  }
  getAvatarFallbackMember() {
    // let aroom = new TRoom();
    // (aroom.roomId = 'globalfeed'), (aroom.name = 'aaa');
    // return aroom;
  }
  getJoinRule() {
    return {};
  }
  getLiveTimeline() {
    const a = new TLiveTimeline();
    return a;
  }
  getCanonicalAlias() {
    return this.canonical_alias;
  }
  getAltAliases() {
    return ['getAltAliases'];
  }
  async loadMembersIfNeeded() {
    return Promise.resolve();
  }
  getUnfilteredTimelineSet(): TEventTimelineSet {
    const t = new TEventTimelineSet();
    return t;
  }
  getJoinedMemberCount() {
    return 2;
  }
  getMembersWithMembership(mship) {
    const m = new TMember();
    m.name = 'm1';
    m.userId = 'm1id:noteon.io';
    m.username = 'm1username';

    return [m];
  }
}

class CurrentState {
  events: Map<string, TEvent>;
  constructor() {
    this.events = new Map();
  }
  hasSufficientPowerLevelFor = (arg0: string, arg1: number) => {
    return false;
  };
  maySendEvent = (arg0: string, arg1: string) => {
    return true;
  };
  maySendStateEvent = (arg0: string, userId: string) => {
    return true;
  };
  maySendMessage = (userId: string) => {
    return true;
  };
  getStateEvents = (arg0: string) => {
    return [] as TEvent[];
  };
  getStateEvent = (arg0: string, arg1: string) => {
    return {} as TEvent;
  };
}

export default TRoom;
