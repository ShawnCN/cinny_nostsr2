import EventEmitter from '../src/client/EventEmitter';

class TUser extends EventEmitter {
  displayName: string;
  avatarUrl: string;
  powerLevel: number;
  userId: string;
  constructor() {
    super();
  }
}

export default TUser;
