import { Relay, relayInit } from 'nostr-tools';
import TDevice from '../../types/TDevice';
import TRoom from '../../types/TRoom';
import TUser from '../../types/TUser';
import EventEmitter from './EventEmitter';
import { stage3relays } from './state/cons';

class MatrixClientA extends EventEmitter {
  store: { deleteAllData: () => Promise<any> };
  baseUrl: string;
  // relayInstance: Map<string, Relay>;
  constructor() {
    super();
    // this.store = {
    //   deleteAllData:()=>Promise<any>
    // }
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
  getRoom(roomId: string) {
    const room = new TRoom();
    return room;
  }
  getAccountData(accountId: string) {
    return {
      getContent: () => {
        content: 'getAccountData';
      },
    };
  }
  getRooms() {
    return 'rooms';
  }
  getUserId() {
    return 'sunyux';
  }
  getUser(userId: string) {
    const auser = new TUser();
    auser.displayName = 'aaa';
    auser.avatarUrl = '...';
    return auser;
  }
  logout() {
    console.log('logout');
  }
  getDevices() {
    return Promise.resolve({ devices: [] });
  }
  getProfileInfo(userId: string) {
    const auser: TUser = {
      displayName: 'aaa',
      avatarUrl: '...',
    } as TUser;
    return Promise.resolve(auser);
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
  mxcUrlToHttp(arg0: string, arg1: number, arg2: number, arg3: string) {}

  publicRooms({ server, limit, since, include_all_networks, filter }: TPublicRooms) {
    return {
      chunk: '',
      next_batch: '',
    };
  }
  async getLocalAliases(roomId: string) {
    return Promise.resolve('getLocalAliases');
  }
  async getRoomDirectoryVisibility(roomId: string) {
    return Promise.resolve(true);
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
