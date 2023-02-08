import { Relay, relayInit } from 'nostr-tools';
import { TChannelmap, TChannelmapObject, TContent, TSubscribedChannel } from '../../types';
import TDevice from '../../types/TDevice';
import TRoom from '../../types/TRoom';
import TUser from '../../types/TUser';
import EventEmitter from './EventEmitter';
import { defaultChatroomList, stage3relays, TChannelMapList } from './state/cons';

class MatrixClientA extends EventEmitter {
  store: { deleteAllData: () => Promise<any> };
  baseUrl: string;
  user: TUser;
  crypto: string;
  publicRoomList: Map<string, TRoom>;
  // relayInstance: Map<string, Relay>;
  constructor() {
    super();
    this.user = new TUser();
    this.user.userId = '9d76a2ac373fc751f3467317f2dd4c3a847bedc53fcd9d7c52ff278a127b6f2e:abc';
    this.user.displayName = '显示名称';
    this.user.avatarUrl =
      'https://nostr.build/i/karnage/nostr.build_1aae77a4637a40d0fb21cf59ac963fade0fab3744a775bd88fb06b4400696e26.png';
    this.publicRoomList = new Map();
    // this.store = {
    //   deleteAllData:()=>Promise<any>
    // }
    const channels: TChannelmapObject = TChannelMapList;
    for (let k in channels) {
      let room = new TRoom();
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

    // for (let i = 0; i < stage3relays.length; i++) {
    //   const pubkey = '33333';
    //   setTimeout(async () => {
    //     await this.connectAndJoin(stage3relays[i], pubkey);
    //   }, 500);
    // }
  }
  async connectAndJoin(wss: string, pubkey: string) {
    this.emit('startConnect', wss);
    const relay = relayInit(wss);
    try {
      await relay.connect();
    } catch (err) {
      console.log('发现了错误', err);
      this.emit('startConnectError', wss);
    }
    relay.on('connect', () => {
      // this.relayInstance.set(relay.url, relay);
      this.emit('relayConnected', relay.url);
      console.log(`connected: ${relay.url}`);
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
  }
  setGlobalErrorOnUnknownDevices(arg0: boolean) {
    console.log('setGlobalErrorOnUnknownDevices');
  }
  getRoom(roomId: string): TRoom {
    return this.publicRoomList.get(roomId) as TRoom;
  }
  getAccountData(accountId: string) {
    let a: TContent;
    a = { content: 'getAccountData', shortcut: ['ss', '33'], categorized: ['11', '33'] };

    return {
      getContent: () => {
        return a;
      },
    };
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
  getProfileInfo(userId: string) {
    return Promise.resolve(this.user);
  }
  downloadKeys(arg0: string[], arg1: boolean) {}
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
  mxcUrlToHttp(arg0: string, arg1: number, arg2: number, arg3: string) {
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
  setAccountData(arg0: string, arg1: TContent) {}
  isRoomEncrypted(roomId: string) {
    return true;
  }
  async paginateEventTimeline(timelineToPaginate: any, { backwards, limit }) {}
  getEventTimeline(timelineSet, eventId) {
    return;
  }
  async joinRoom(roomIdOrAlias: string, arg1: { viaServers: string[] }) {
    const a = this.publicRoomList.get(roomIdOrAlias);
    return Promise.resolve(a);

    // const aroom = new TRoom();
    // aroom.roomId = 'globalfeed';
    // aroom.name = 'globalfeed';
    // aroom.avatarUrl = 'https://randomuser.me/api/portraits/men/79.jpg';
    // aroom.canonical_alias = 'alias';
    // return Promise.resolve(aroom);
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
