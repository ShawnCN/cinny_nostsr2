import initMatrix from '../src/client/InitMatrix';
import { formatRoomMemberFromNostrEvent } from '../src/util/matrixUtil';
import { defaultName, toNostrBech32Address } from '../src/util/nostrUtil';
import TEvent from './TEvent';

class TRoomMember {
  userId: string;
  name: string;
  username: string;
  about: string;
  avatarSrc: string;
  peopleRole: string;
  powerLevel: number;
  membership: string; //'join'|'leave'|'ban'|'invite'
  prevMembership: string;
  events: TEvent[];
  constructor(id: string, name?: string, avatarSrc?: string) {
    this.userId = id;
    this.username = id;
    this.membership = 'join';
    // this.powerLevel = 10000;
    if (name) {
      this.name = name;
    } else {
      this.name = defaultName(id, 'npub')!;
    }
    if (avatarSrc) this.avatarSrc = avatarSrc;
  }

  async init() {
    const nostrEvent = await initMatrix.matrixClient.fetchUserMeta(this.userId);
    // console.log('2666666666', nostrEvent?.content);

    if (nostrEvent) {
      initMatrix.matrixClient.handleMetaEvent(nostrEvent);
      const { name, about, picture } = JSON.parse(nostrEvent.content);
      // let member = new TRoomMember(userIdNpub);
      if (name && name != '') {
        this.name = name;
      }
      if (about && about != '') {
        this.about = about;
      }
      if (picture && picture != '') {
        this.avatarSrc = picture;
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

  getAvatarUrl(arg0: string, arg1: number, arg2: number, arg3: string) {
    return this.avatarSrc;
  }
  getMxcAvatarUrl() {
    return '';
  }
}
export default TRoomMember;
