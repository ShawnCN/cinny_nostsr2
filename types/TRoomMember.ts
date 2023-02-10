import { nip19 } from 'nostr-tools';
import TEvent from './TEvent';

class TRoomMember {
  userId: string;
  name: string;
  username: string;
  about: string;
  avatarSrc: string;
  peopleRole: string;
  powerLevel: number;
  membership: string; //'join'|'leave'|'ban'
  events: TEvent[];
  constructor(id: string) {
    // const pubkeyNpub = nip19.npubEncode(id);
    this.userId = id;
    this.name = id;
    this.username = id;
  }

  getAvatarUrl(arg0: string, arg1: number, arg2: number, arg3: string) {
    return this.avatarSrc;
  }
  getMxcAvatarUrl() {
    return '';
  }
}
export default TRoomMember;
