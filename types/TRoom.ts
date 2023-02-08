import RoomTimeline from '../src/client/state/RoomTimeline';
import TEventTimelineSet from './TEventTimelineSet';
import TRoomMember from './TRoomMember';
import TUser from './TUser';

class TRoom {
  roomId: string;
  name: string;
  currentState: {
    hasSufficientPowerLevelFor: (arg0: string, arg1: number) => boolean;
    maySendEvent: (arg0: string, arg1: string) => boolean;
    maySendStateEvent: (arg0: string, arg1: string) => boolean;
    getStateEvents: (arg0: string) => any;
    maySendMessage: (userId: string) => boolean;
  };
  constructor() {}
  getMember(userId: string) {
    const user = new TRoomMember();
    return user;
  }
  canInvite(userId: string) {
    return true;
  }
  getMyMembership() {
    return 'getMyMembership';
  }
  isSpaceRoom() {
    return true;
  }
  getAvatarUrl(arg0: string, arg1: number, arg2: number, arg3: string) {
    return '';
  }
  getUsersReadUpTo(arg0: string) {
    return [0, 1];
  }
  getEventReadUpTo(userId: string) {
    return 1;
  }
  getAvatarFallbackMember() {
    let aroom = new TRoom();
    (aroom.roomId = 'globalfeed'), (aroom.name = 'aaa');

    return aroom;
  }
  getJoinRule() {
    return {};
  }
  getLiveTimeline() {
    return null;
  }
  loadMembersIfNeeded() {}
  getUnfilteredTimelineSet(): TEventTimelineSet {
    return null as unknown as TEventTimelineSet;
  }
}

const maySendMessage = (userId: string) => {
  return true;
};

export default TRoom;
