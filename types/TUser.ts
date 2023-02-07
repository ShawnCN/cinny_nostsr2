import EventEmitter from '../src/client/EventEmitter';

class TUser extends EventEmitter {
  displayName: string;
  avatarUrl: string;
  constructor() {
    super();
  }
}

export default TUser;
