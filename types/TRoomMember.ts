import { nip19 } from 'nostr-tools';
import initMatrix from '../src/client/InitMatrix';
import { formatRoomMemberFromNostrEvent } from '../src/util/matrixUtil';
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

  async init() {
    const nostrEvent = await initMatrix.matrixClient.fetchUserMeta(this.userId);
    // console.log('2666666666', nostrEvent?.content);
    if (nostrEvent) {
      const { name, about, picture } = JSON.parse(nostrEvent.content);
      // const userIdNpub = nip19.npubEncode(event.pubkey);
      // let member = new TRoomMember(userIdNpub);
      if (name && name != '') {
        this.name = name;
      }
      if (about && about != '') {
        this.about = about;
      }
      if (picture && picture != '') {
        this.avatarSrc = picture;
        console.log('11111111111', this.avatarSrc, picture);
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
    console.log('getAvatarUrl', this.avatarSrc);
    return this.avatarSrc;
  }
  getMxcAvatarUrl() {
    return '';
  }
}
export default TRoomMember;
