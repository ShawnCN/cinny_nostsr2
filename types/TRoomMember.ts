import TEvent from './TEvent';

class TMember {
  userId: string;
  name: string;
  username: string;
  avatarSrc: string;
  peopleRole: string;
  powerLevel: number;
  membership: string;
  events: TEvent[];
  constructor(id: string) {
    this.userId = id;
    this.name = 'name' + id;
    this.userId = 'username' + id;
  }

  getAvatarUrl(arg0: string, arg1: number, arg2: number, arg3: string) {
    return '';
  }
  getMxcAvatarUrl() {
    return '';
  }
}
export default TMember;
