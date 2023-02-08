import TUser from './TUser';

class TRoomMember extends TUser {
  membership: string;
  constructor() {
    super();
  }
  getMxcAvatarUrl() {
    return '';
  }
}
export default TRoomMember;
