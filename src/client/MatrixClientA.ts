import { Relay, relayInit } from 'nostr-tools';
import {
  NostrEvent,
  SearchResultUser,
  TChannelmap,
  TChannelmapObject,
  TSubscribedChannel,
} from '../../types';
import TDevice from '../../types/TDevice';
import TEvent from '../../types/TEvent';
import TRoom from '../../types/TRoom';
import TRoomMember from '../../types/TRoomMember';
import TUser from '../../types/TUser';
import {
  formatChannelMsg,
  formatGlobalMsg,
  formatRoomMemberFromNostrEvent,
} from '../util/matrixUtil';
import EventEmitter from './EventEmitter';
import { aevent2, stage3relays, TChannelMapList } from './state/cons';

class MatrixClientA extends EventEmitter {
  store: { deleteAllData: () => Promise<any> };
  baseUrl: string;
  user: TUser;
  crypto: string;
  publicRoomList: Map<string, TRoom>;
  relayInstance: Map<string, Relay>;
  constructor(userId: string) {
    super();
    this.user = new TUser();
    this.user.userId = userId + ':abc';
    this.user.displayName = userId.slice(0, 8);
    if (localStorage['my-meta-info']) {
      const myMetaInfo = JSON.parse(localStorage['my-meta-info']);
      this.user.avatarUrl = myMetaInfo?.profile_img;
      this.user.displayName = myMetaInfo?.name;
    }
    this.publicRoomList = new Map();
    this.relayInstance = new Map();
    // this.store = {
    //   deleteAllData:()=>Promise<any>
    // }
    const channels: TChannelmapObject = TChannelMapList;
    for (let k in channels) {
      let room = new TRoom(channels[k].user_id);
      room.roomId = channels[k].user_id;
      room.name = channels[k].name!;
      room.avatarUrl = channels[k].profile_img!;
      room.canonical_alias = channels[k].about!;
      this.publicRoomList.set(room.roomId, room);
    }
  }

  async initCrypto() {
    console.log('initCrypto');
  }
  async startClient({ lazyLoadMembers: boolean }) {
    console.log('startClient');
    for (let i = 0; i < stage3relays.length; i++) {
      const pubkey = '33333';
      await this.connectAndJoin(stage3relays[i], pubkey);
    }
  }
  async connectAndJoin(wss: string, pubkey: string) {
    this.emit('startConnect', wss);
    const relay = relayInit(wss);
    try {
      await relay.connect();
      this.relayInstance.set(wss, relay);
    } catch (err) {
      console.log('发现了错误', err);
      this.emit('startConnectError', wss);
    }
    relay.on('connect', () => {
      // this.relayInstance.set(relay.url, relay);
      this.emit('relayConnected', relay.url);
      console.log(`connected: ${relay.url}`);
      // this.subGlobalMessages(relay);
    });
    relay.on('error', () => {
      console.log(`failed: ${relay.url}`);
      this.emit('startConnectError', wss);
    });
    relay.on('disconnect', () => {
      console.log(`disconnected from ${relay.url}`);
      this.emit('startConnectError', wss);
    });
    relay.on('notice', (e: any) => {
      console.log(`notice from ${relay.url}   ${JSON.stringify(e)} `);
    });
    // if (!relayInstance[action.payload.host]) {
    //   relayInstance[action.payload.host] = relay;
    // }
  }
  stopClient() {
    console.log('stopClient');
  }
  async clearStores() {
    console.log('clearStores');
    for (let [k, relay] of this.relayInstance) {
      console.log(`close relay ${relay.url}`);
      await relay.close();
    }
  }
  setGlobalErrorOnUnknownDevices(arg0: boolean) {
    console.log('setGlobalErrorOnUnknownDevices');
  }
  getRoom(roomId: string): TRoom | null {
    const room = this.publicRoomList.get(roomId);
    if (!room) return null;
    return room;
  }
  getAccountData(eventType: string) {
    const ae1 = new TEvent(aevent2);
    return ae1;
    // let a: TContent;
    // a = { content: 'getAccountData', shortcut: ['ss', '33'], categorized: ['11', '33'] };

    // return {
    //   getContent: () => {
    //     return a;
    //   },
    // };
  }
  getRooms() {
    return Array.from(this.publicRoomList.values());
  }
  getUserId() {
    return this.user.userId;
  }
  getUser(userId: string) {
    return this.user;
  }
  logout() {
    console.log('logout');
  }
  getDevices() {
    return Promise.resolve({ devices: [] });
  }
  // search user from relays
  async getProfileInfo(userId: string) {
    const nostrEvent = await this.fetchUserMeta(userId);
    let user = {} as { displayName: string; about: string; avatarUrl: string };
    if (!nostrEvent) {
      return null;
    }
    const { name, about, picture } = JSON.parse(nostrEvent.content);

    user.displayName = name;

    user.about = about;

    user.avatarUrl = picture;

    return user;
  }
  async searchUserDirectory({ term: string, limit: number }) {
    return Promise.resolve(null);
  }
  async Directory({ term: string, limit: number }) {
    return Promise.resolve(null);
  }
  async downloadKeys(arg0: string[], arg1?: boolean) {
    return new Map();
  }
  getStoredDevicesForUser(userId: string) {
    const a = [{ deviceId: '1' }] as TDevice[];
    return a;
  }
  isUserIgnored(userId: string) {
    return false;
  }
  getIgnoredUsers() {
    return [] as TUser[];
  }
  getCapabilities() {}
  mxcUrlToHttp(arg0: string, arg1?: number, arg2?: number, arg3?: string) {
    return '';
  }
  setAvatarUrl(url: string) {
    this.user.avatarUrl = url;
  }
  setDisplayName(name: string) {
    this.user.displayName = name;
  }
  async setRoomName(roomId, newName) {}
  async setRoomTopic(roomId, newTopic) {}
  async sendStateEvent(roomId, arg1: string, arg2: any, arg3: string) {}
  publicRooms({ server, limit, since, include_all_networks, filter }: TPublicRooms) {
    // const channel = defaultChatroomList;
    // const aroom = new TRoom();
    // aroom.roomId = 'globalfeed';
    // aroom.name = 'globalfeed';
    // aroom.avatarUrl = 'https://randomuser.me/api/portraits/men/79.jpg';
    // aroom.canonical_alias = 'aliasdddddddddddddddddd';
    // this.publicRoomList.set(aroom.roomId, aroom);
    console.log(this.publicRoomList);

    return {
      // chunk: ['room1', 'room2', 'room3'],
      chunk: Array.from(this.publicRoomList.values()),
      next_batch: '',
    };
  }
  async getLocalAliases(roomId: string) {
    return Promise.resolve('getLocalAliases');
  }
  async getRoomDirectoryVisibility(roomId: string) {
    return Promise.resolve(true);
  }
  async sendReadReceipt(latestEvent) {}
  setAccountData(arg0: string, arg1: any) {}
  isRoomEncrypted(roomId: string) {
    return true;
  }
  async paginateEventTimeline(timelineToPaginate: any, { backwards, limit }) {
    console.log(`paginateEventTimeline`);
    console.log(timelineToPaginate);
    console.log(backwards, limit);
  }
  getEventTimeline(timelineSet, eventId) {
    return;
  }
  async joinRoom(roomIdOrAlias: string, arg1: { viaServers: string[] }) {
    const a = this.publicRoomList.get(roomIdOrAlias);
    return Promise.resolve(a);
  }
  async redactEvent(roomId, eventId, undefined, arg3: any) {
    console.log('redact event');
  }
  async sendEvent(roomId, arg1: string, content) {
    console.log('send event');
  }
  async invite(roomId, userId, undefined, reason) {
    return true;
  }
  async kick(roomId, userId, reason) {
    return true;
  }
  async ban(roomId, userId, reason) {
    return true;
  }
  async unban(roomId, userId) {
    return true;
  }
  async setIgnoredUsers(ignoredUsers) {}
  sendTyping(roomId, isT: boolean, arg2: 5000 | undefined) {
    console.log('sendTyping');
  }
  async setPowerLevel(roomId, userId, powerLevel, powerlevelEvent) {
    return true;
  }
  async resolveRoomAlias(alias): Promise<any> {
    return {};
  }
  async leave(roomId) {
    console.log('leave');
  }
  async createRoom(
    options: {
      is_direct: boolean;
      invite: string[];
      visibility: 'private';
      preset: 'trusted_private_chat';
      initial_state: any[];
    },
    dmUser?: SearchResultUser
  ) {
    if (options.is_direct == true) {
      const a = new TRoom(options.invite[0]);
      a.name = dmUser!.display_name;
      a.avatarUrl = dmUser!.avatarUrl;
      const m1 = new TRoomMember(options.invite[0], a.name, a.avatarUrl);
      const m2 = new TRoomMember(this.user.userId, this.user.displayName, this.user.avatarUrl);
      a.addMember(m1);
      a.addMember(m2);
      this.publicRoomList.set(a.roomId, a);
      return Promise.resolve(a);
    } else {
      const a = new TRoom('1');
      console.log('createRoom');
      return Promise.resolve(a);
    }
  }
  sendMessage(roomId, content) {
    console.log('send message');
  }
  getSyncState() {
    console.log('get sync state');
    return 'getSyncState';
  }
  getPushActionsForEvent(mEvent) {
    return 'actions';
  }
  subGlobalMessages = () => {
    for (let [k, relay] of this.relayInstance) {
      const filter = {
        kinds: [1],
        limit: 20,
      };
      if (!relay) return;
      const sub = relay.sub([filter]);
      const subDetail = {
        roomId: 'globalfeed',
        type: 'groupRelay',
        relayUrl: relay.url,
        sub: sub,
      };

      sub.on('event', async (event: NostrEvent) => {
        const mevent = formatGlobalMsg(event);
        const mc = new TEvent(mevent);

        const roomId = mevent.room_id;
        const senderId = mevent.sender;
        const room = this.publicRoomList.get(roomId);
        if (!room) return;
        const sender = room.getMember(senderId);
        if (sender) {
          mc.sender = sender;
        } else {
          const asender = new TRoomMember(senderId);
          asender.init();
          room.addMember(asender);
          mc.sender = asender;
        }

        // console.log(mc.getRoomId(), mc.getContent());
        // find event sender object
        // const roomId = mevent.room_id;
        // const senderId = mevent.sender;
        // const room = this.publicRoomList.get(roomId);
        // if (room) {
        //   console.log('666666666');
        //   const sender = room.getMember(senderId);
        //   if (sender) {
        //     mc.sender = sender;
        //   } else {
        //     console.log('1666666666');
        //     const nostrEvent = await this.fetchUserMeta(senderId);
        //     console.log('2666666666', nostrEvent);
        //     if (nostrEvent) {
        //       console.log('3666666666');
        //       const asender = formatRoomMemberFromNostrEvent(nostrEvent);
        //       mc.sender = asender;
        //       room.addMember(asender);
        //       this.publicRoomList.set(roomId, room);
        //     } else {
        //       console.log('4666666666');
        //       const member = new TRoomMember(senderId);
        //       room.addMember(member);
        //     }
        //     console.log('8666666666');
        //   }
        // }
        this.emit('Event.decrypted', mc);
      });
    }
  };
  subChannelMessage = (channelId: string) => {
    for (let [k, relay] of this.relayInstance) {
      const filter = {
        kinds: [42],
        '#e': [channelId],
        limit: 13,
      };
      if (!relay || relay.status != 1) continue;
      const sub = relay.sub([filter]);
      sub.on('event', (event: NostrEvent) => {
        const mevent = formatChannelMsg(event);
        const mc = new TEvent(mevent);
        this.emit('Event.decrypted', mc);
      });
    }
  };
  subdmMessages = (friendPubkey: string) => {
    const userPubkey = this.user.userId;
    for (let [k, relay] of this.relayInstance) {
      if (!relay || relay.status != 1) continue;
      // updateUsermap(store, friendPubkey);
      let time_for_since = 0;
      const filter = {
        authors: [userPubkey, friendPubkey],
        kinds: [4],
        '#p': [userPubkey, friendPubkey],
        since: time_for_since,
        limit: 13,
      };
      const sub = relay.sub([filter]);
      const subDetail = {
        roomId: friendPubkey,
        type: 'single',
        relayUrl: relay.url,
        sub: sub,
      };
      sub.on('event', (event: NostrEvent) => {
        console.log(event, event.content);
      });
      sub.on('eose', () => {
        // sub.unsub();
        // console.log('sub dm messages eose')
      });
    }
  };
  subOpenDmFromStranger = () => {
    const pubkey = this.user.userId;
    for (let [k, relay] of this.relayInstance) {
      const filter = {
        kinds: [4],
        '#p': [pubkey],
        limit: 30,
      };
      if (!relay || relay.status != 1) continue;
      // updateUsermap(store, pubkey);
      const sub = relay.sub([filter]);
      sub.on('event', (event: NostrEvent) => {
        console.log('from stranger', event.pubkey, event.content);
        // updateUsermap(store, event.pubkey);
      });
      sub.on('eose', () => {
        // sub.unsub();
        // console.log('sub dm from stanger eose')
      });
    }
  };
  async fetchUserMeta(user_id: string) {
    for (let [key, relay] of this.relayInstance) {
      if (!relay || relay.status != 1) {
        console.log('not found', relay.url);
        continue;
      }
      console.log('start searching', relay.url);
      const a = await this.fetchUserMetaFromRelay(user_id, relay);
      if (a && Object.keys(a).length > 1) {
        console.log('Found', relay.url);
        return a;
      } else {
        console.log('not found', relay.url);
      }
    }
  }
  async fetchUserMetaFromRelay(pubkey: string, relay: Relay) {
    if (!relay || relay.status != 1) return null;
    const filter = { authors: [pubkey], kinds: [0], limit: 1 };
    const sub = relay.sub([filter]);
    let aevent = {} as NostrEvent;
    const event = new Promise<NostrEvent>((resolve, reject) => {
      sub.on('event', (event: NostrEvent) => {
        aevent = event;
        resolve(aevent);
      });
      sub.on('eose', () => {
        sub.unsub();
        if (!aevent || Object.keys(aevent).length == 0) {
          reject(null);
        }
      });
    }).catch((e) => {
      console.error(e);
      return null;
    });

    return event;
  }
  async fetchContactUserList() {
    const user_id = this.user.userId;
    console.log('3444444');
    for (let [key, relay] of this.relayInstance) {
      const event = await this.fetchContacts(relay, user_id);
      if (event) {
        const tags = event.tags;
        let list = [] as string[][];
        for (let i = 0; i < tags.length; i++) {
          if (event['tags'][i][0] == 'p') {
            let a = [] as string[];
            a.push(event['tags'][i][1]);
            if (event['tags'][i].length > 2) {
              a.push(event['tags'][i][2]);
            }
            list.push(a);
          }
        }
        console.log('33444444');
        return list;
      }
    }
  }
  async fetchContacts(relay: Relay, pubkey: string) {
    const filter = {
      authors: [
        // pubkey
        '46060722131ab09a10c410b9522605aee09ce8ff363145f4319f7461ca57f276',
      ],
      kinds: [3],
      // '#e': [id],
      limit: 1,
    };
    if (!relay || relay.status !== 1) return null;
    const sub = relay.sub([filter]);
    const contact = new Promise<NostrEvent>((resolve, reject) => {
      let tevent = {} as NostrEvent;
      sub.on('event', (event: NostrEvent) => {
        tevent = event;
      });
      sub.on('eose', () => {
        sub.unsub();
        resolve(tevent);
      });
    })
      .then((event: NostrEvent) => {
        if (event && Object.keys(event).length > 0) {
          return event;
        } else {
          return null;
        }
      })
      .catch((e) => {
        console.error(e);
        return null;
      });
    return contact;
  }
  uploadContent(isEncryptedRoom: any, { includeFilename: any, progressHandler }) {}
  getRoomPushRule(arg0: 'global', roomId: string) {
    return undefined;
  }
  getStoredCrossSigningForUser(userId: string): any {
    return '';
  }
  getStoredDevice(userId, deviceId) {
    return '';
  }
}

type TPublicRooms = {
  server: any;
  limit: any;
  since: any;
  include_all_networks: any;
  filter: {
    generic_search_term: any;
  };
};

export default MatrixClientA;
