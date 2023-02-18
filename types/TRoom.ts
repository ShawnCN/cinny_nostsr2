import { TMemberShip, TRoomType, TTotalHighlight } from '.';
import initMatrix from '../src/client/InitMatrix';
import RoomTimeline from '../src/client/state/RoomTimeline';
import { toNostrBech32Address } from '../src/util/nostrUtil';
import TEvent from './TEvent';
import TEventTimelineSet from './TEventTimelineSet';
import TLiveTimeline from './TLiveTimeline';
import TRoomMember from './TRoomMember';

class TRoom {
  roomId: string;
  type: TRoomType;
  name: string;
  avatarUrl: string;
  canonical_alias: string; //intro
  num_joined_members: string;
  aliases?: string[];
  topic: string;
  currentState: CurrentState;
  roomMembers: Map<string, TRoomMember>;
  founderId: string;
  // currentState: {
  //   getStateEvents: typeof getStateEvents;
  // };
  constructor(roomId: string, type: TRoomType, name?: string, about?: string, avatarUrl?: string) {
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
    if (name) this.name = name;
    if (about) this.canonical_alias = about;
    if (avatarUrl) this.avatarUrl = avatarUrl;
  }

  async init() {
    if (this.type == 'single') {
      const profile = initMatrix.matrixClient.profileEvents.get(this.roomId);
      if (profile) {
        this.name = profile.name;
        this.avatarUrl = profile.pictureUrl;
        this.canonical_alias = profile.about;
      }
      return;
    }
    if (this.type == 'groupChannel') {
      const profile = initMatrix.matrixClient.cProfileEvents.get(this.roomId);
      if (profile) {
        this.name = profile.name;
        this.avatarUrl = profile.pictureUrl;
        this.canonical_alias = profile.about;
      }
      return;
    }
    const nostrEvent = await initMatrix.matrixClient?.fetchChannelMeta(this.roomId);
    // console.log('2666666666', nostrEvent?.content);
    initMatrix.matrixClient.handleEvent(nostrEvent);
    if (nostrEvent) {
      const { name, about, picture } = JSON.parse(nostrEvent.content);
      // let member = new TRoomMember(userIdNpub);
      if (name && name != '') {
        this.name = name;
      }
      if (about && about != '') {
        this.canonical_alias = about;
      }
      if (picture && picture != '') {
        this.avatarUrl = picture;
      }
      // const asender = formatRoomMemberFromNostrEvent(nostrEvent);
    }
    //   room.addMember(asender);
    //   this.publicRoomList.set(roomId, room);
    // } else {
    //   console.log('4666666666');
    //   const member = new TRoomMember(senderId);
    //   room.addMember(member);
    // }
  }
  getMember(userId: string) {
    const user = this.roomMembers.get(userId);
    if (!user) return null;
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
  getUnreadNotificationCount(arg0: TTotalHighlight) {
    // total, highlight
    return 0;
  }
  getLastActiveTimestamp() {
    return Date.now();
  }
  canInvite(userId: string) {
    if (this.type == 'single') return false;
    if (this.founderId != userId) return false;
    return true;
  }
  getDMInviter() {
    return null;
  }
  getMyMembership(): TMemberShip | null {
    const mShip = initMatrix.matrixClient.myMemberships.get(this.roomId);
    if (mShip && mShip.membership) return mShip.membership;
    return null;
  }
  isSpaceRoom() {
    return false;
  }
  getAvatarUrl(arg0: string, arg1: number, arg2: number, arg3: string) {
    if (this.avatarUrl && this.avatarUrl.length > 0) return this.avatarUrl;
    if (this.type == 'single') {
      const profile = initMatrix.matrixClient.profiles.get(this.roomId);
      if (profile) {
        this.name = profile.name;
        this.canonical_alias = profile.about;
        return profile.picture;
      } else {
        return null;
      }
    }
    if (this.type == 'groupChannel') {
      const profile = initMatrix.matrixClient.channelProfileEvents.get(this.roomId);
      if (profile) {
        this.name = profile?.name;
        this.canonical_alias = profile?.about;
        this.avatarUrl = profile?.picture;
        return this.avatarUrl;
      } else {
        return null;
      }
    }
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
    return false;
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
