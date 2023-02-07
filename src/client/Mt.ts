import TUser from '../../types/TUser';
import EventEmitter from './EventEmitter';

class Mt extends EventEmitter {
  store: { deleteAllData: () => Promise<any> };
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
    return 'room';
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
}

export default Mt;
