import EventEmitter from '../src/client/EventEmitter';

class TUser extends EventEmitter {
  displayName: string;
  avatarUrl: string;
  powerLevel: number;
  userId: string;
  about: string;
  privatekey: string;
  constructor(userId?: string, displayName?: string, avatarUrl?: string) {
    super();
    if (userId) this.userId = userId;
    if (displayName) this.displayName = displayName;
    if (avatarUrl) this.avatarUrl = avatarUrl;
  }
}

export default TUser;
