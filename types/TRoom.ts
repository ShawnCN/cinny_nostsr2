import TRoomMember from './TRoomMember';
import TUser from './TUser';

class TRoom {
  roomId: string;
  name: string;
  currentState: {
    hasSufficientPowerLevelFor: (arg0: string, arg1: number) => boolean;
    maySendEvent: (arg0: string, arg1: string) => boolean;
    maySendStateEvent: (arg0: string, arg1: string) => boolean;
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
}

export default TRoom;
