import EventEmitter from '../src/client/EventEmitter';

class TUser extends EventEmitter {
  displayName: string;
  avatarUrl: string;
  powerLevel: number;
  constructor() {
    super();
  }
}

export default TUser;
