import { TRoomType } from '.';
import initMatrix from '../src/client/InitMatrix';
import RoomTimeline from '../src/client/state/RoomTimeline';
import { toNostrBech32Address } from '../src/util/nostrUtil';
import TEvent from './TEvent';
import TEventTimelineSet from './TEventTimelineSet';
import TLiveTimeline from './TLiveTimeline';
import TRoomMember from './TRoomMember';

class TRoom {
  roomId: string;
  type: string;
  name: string;
  avatarUrl: string;
  canonical_alias: string; //intro
  num_joined_members: string;
  aliases?: string[];
  topic: string;
  currentState: CurrentState;
  roomMembers: Map<string, TRoomMember>;
  // currentState: {
  //   getStateEvents: typeof getStateEvents;
  // };
  constructor(roomId: string, type) {
    // this.currentState.getStateEvents = getStateEvents();
    this.currentState = new CurrentState();
    this.roomMembers = new Map();
    this.roomId = roomId;
    if (type) {
      this.type = type;
      if (type == 'single') {
        this.name = toNostrBech32Address(roomId, 'npub')?.slice(5, 8) || roomId;
      } else if (type == 'groupChannel') {
        this.name = toNostrBech32Address(roomId, 'note')?.slice(5, 8) || roomId;
      }
    } else {
      this.name = roomId;
    }
  }
  getMember(userId: string) {
    const user = this.roomMembers.get(userId);
    return user;
  }
  addMember(m: TRoomMember) {
    this.roomMembers.set(m.userId, m);
  }
  getMembers() {
    return Array.from(this.roomMembers.values());
  }
  getMembersWithMembership(mship) {
    return Array.from(this.roomMembers.values());
  }
  setMemberWithMembership(memberId: string, membership: string) {
    let a = this.roomMembers.get(memberId);
    if (!a) return null;
    a.membership = membership;
    this.roomMembers.set(memberId, a);
  }
  getJoinedMembers() {
    const user = new TRoomMember('1');
    return [user];
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
  getDMInviter() {
    return null;
  }
  getMyMembership(): 'join' | 'invite' {
    return 'join';
  }
  isSpaceRoom() {
    return false;
  }
  getAvatarUrl(arg0: string, arg1: number, arg2: number, arg3: string) {
    return this.avatarUrl;
  }
  getUsersReadUpTo(arg0: TEvent) {
    return [0, 1];
  }
  getRoomType() {
    return this.type;
  }
  getEventReadUpTo(userId: string) {
    return '1';
  }
  // 一对一聊天室，选择对方用户。
  getAvatarFallbackMember() {
    for (let [k, v] of this.roomMembers) {
      if (k != initMatrix.matrixClient.user.avatarUrl) {
        return v;
      }
    }
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
  getStateEvents = (arg0: string): TEvent[] => {
    return [] as TEvent[];
  };
  getStateEvent = (arg0: string, arg1: string) => {
    return {} as TEvent;
  };
  getMembers() {
    return [];
  }
}

export default TRoom;
