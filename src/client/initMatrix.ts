/* eslint-disable lines-between-class-members */
import EventEmitter from './EventEmitter';
// import Olm from '@matrix-org/olm';
// import { logger } from 'matrix-js-sdk/lib/logger';
import localForage from 'localforage';
import { secret } from './state/auth';
import RoomList from './state/RoomList';
import AccountData from './state/AccountData';
import RoomsInput from './state/RoomsInput';
import Notifications from './state/Notifications';
import { cryptoCallbacks } from './state/secretStorageKeys';
import navigation from './state/navigation';

import MatrixClientA from './MatrixClientA';
import { NostrEvent, TChannelmapObject, TSubscribedChannel } from '../../types';
import { defaultChatroomList } from './state/cons';
import TRoom from '../../types/TRoom';
import TRoomMember from '../../types/TRoomMember';
import { saveDirectsToLocal, saveMDirectsToLocal } from '../util/localForageUtil';
import { formatDmMsgFromOthersOrMe, initialChannelroom, initialDMroom } from '../util/matrixUtil';
import TEvent from '../../types/TEvent';
// const matrixClientA = new MatrixClientA();

// global.Olm = Olm;

// logger.disableAll();

class InitMatrix extends EventEmitter {
  matrixClient: MatrixClientA;
  roomList: RoomList;
  accountData: AccountData;
  roomsInput: RoomsInput;
  notifications: Notifications;
  localStorageLoaded: boolean;
  mDirectEvents: Set<string>;
  constructor() {
    super();
    navigation.initMatrix = this;
    this.localStorageLoaded = false;
    this.mDirectEvents = new Set();
  }

  async init() {
    await this.startClient();
    this.setupSync();
    this.listenEvents();
  }

  async startClient() {
    // const indexedDBStore = new sdk.IndexedDBStore({
    //   indexedDB: global.indexedDB,
    //   localStorage: global.localStorage,
    //   dbName: 'web-sync-store',
    // });
    // await indexedDBStore.startup();

    this.matrixClient = new MatrixClientA(secret.userId!, secret.accessToken!);
    // this.matrixClient = sdk.createClient({
    //   baseUrl: secret.baseUrl,
    //   accessToken: secret.accessToken,
    //   userId: secret.userId,
    //   store: indexedDBStore,
    //   cryptoStore: new sdk.IndexedDBCryptoStore(global.indexedDB, 'crypto-store'),
    //   deviceId: secret.deviceId,
    //   timelineSupport: true,
    //   cryptoCallbacks,
    //   verificationMethods: ['m.sas.v1'],
    // });
    this.matrixClient.loadLocalStorageEvents();
    // await this.matrixClient.startClient({
    //   lazyLoadMembers: true,
    // });
    // this.matrixClient.setGlobalErrorOnUnknownDevices(false);
  }

  async setupSync() {
    const sync = async ({ state, prevState }) => {
      switch (state) {
        case 'NULL':
          console.log('NULL state');
          break;
        case 'SYNCING':
          console.log('SYNCING state');
          break;
        case 'PREPARED':
          console.log('PREPARED state');
          console.log('Previous state: ', prevState);
          this.roomList = new RoomList(this.matrixClient);
          await this.loadLocalStorageEvents();
          // TODO: remove global.initMatrix at end
          // global.initMatrix = this;
          if (prevState === null) {
            let subscribed_channels = [] as TSubscribedChannel[];
            if (localStorage['subscribed_channels']) {
              const sc = localStorage['subscribed_channels'];
              subscribed_channels = JSON.parse(sc);
            } else {
              subscribed_channels = defaultChatroomList;
            }
            let cs: string[] = [];
            if (this.roomList.directs.size == 0) {
              for (let i = 0; i < subscribed_channels.length; i++) {
                if (subscribed_channels[i].type == 'single') {
                  const roomId = subscribed_channels[i].user_id;
                  this.roomList.directs.add(roomId);
                  const aroom = initialDMroom(roomId, this.matrixClient.user);
                  this.matrixClient.publicRoomList.set(roomId, aroom);
                }
              }
            }
            if (this.roomList.rooms.size == 0) {
              for (let i = 0; i < subscribed_channels.length; i++) {
                if (subscribed_channels[i].type == 'groupChannel') {
                  const roomId = subscribed_channels[i].user_id;
                  this.roomList.rooms.add(roomId);
                  const croom = initialChannelroom(roomId, this.matrixClient.user);
                  this.matrixClient.publicRoomList.set(roomId, croom);
                }
              }
            }
            localForage.setItem('rooms', Array.from(this.roomList.rooms));
            // if (this.roomList.rooms.size == 0) {
            // for (const roomId of this.roomList.rooms) {
            //   // this.matrixClient.subChannelMessage(Array.from(this.roomList.rooms));
            //   this.matrixClient.subChannelMessage(roomId);
            // }

            // this.matrixClient.fetchChannelsMeta(cs);
            // this.matrixClient.subDmFromStranger();

            this.accountData = new AccountData(this.roomList);
            this.roomsInput = new RoomsInput(this.matrixClient, this.roomList);
            this.notifications = new Notifications(this.roomList);
            // @ts-ignore
            this.emit('init_loading_finished');
            this.notifications._initNoti();
          } else {
            this.notifications?._initNoti();
          }

          await this.matrixClient.startClient({
            lazyLoadMembers: true,
          });
          this.matrixClient.setGlobalErrorOnUnknownDevices(false);

          for (const roomId of this.roomList.rooms) {
            // this.matrixClient.subChannelMessage(Array.from(this.roomList.rooms));
            this.matrixClient.subChannelMessage(roomId);
          }

          // this.matrixClient.fetchChannelsMeta(cs);
          this.matrixClient.subDmFromStranger();
          await this.getContactsList();

          break;
        case 'RECONNECTING':
          console.log('RECONNECTING state');
          break;
        case 'CATCHUP':
          console.log('CATCHUP state');
          break;
        case 'ERROR':
          console.log('ERROR state');
          break;
        case 'STOPPED':
          console.log('STOPPED state');
          break;
        default:
          console.log('default state');
      }
      // NULL: () => {
      //   console.log('NULL state');
      // },
      // SYNCING: () => {
      //   console.log('SYNCING state');
      // },
      // PREPARED: (prevState) => {
      //   console.log('PREPARED state');
      //   console.log('Previous state: ', prevState);
      //   // TODO: remove global.initMatrix at end
      //   // global.initMatrix = this;
      //   if (prevState === null) {
      //     this.roomList = new RoomList(this.matrixClient);
      //     this.accountData = new AccountData(this.roomList);
      //     this.roomsInput = new RoomsInput(this.matrixClient, this.roomList);
      //     this.notifications = new Notifications(this.roomList);
      //     // @ts-ignore
      //     this.emit('init_loading_finished');
      //     this.notifications._initNoti();
      //   } else {
      //     this.notifications?._initNoti();
      //   }
      // },
      // RECONNECTING: () => {
      //   console.log('RECONNECTING state');
      // },
      // CATCHUP: () => {
      //   console.log('CATCHUP state');
      // },
      // ERROR: () => {
      //   console.log('ERROR state');
      // },
      // STOPPED: () => {
      //   console.log('STOPPED state');
      // },
    };
    // this.matrixClient.on('sync', (state, prevState) => sync[state](prevState));
    this.matrixClient.on('sync', async ({ state, prevState }) => await sync({ state, prevState }));
  }

  listenEvents() {
    console.log('emit sync');
    this.matrixClient.emit('sync', { state: 'PREPARED', prevState: null });
    console.log('emit sync2222222');
    this.matrixClient.on('Session.logged_out', async () => {
      this.matrixClient.stopClient();
      await this.matrixClient.clearStores();
      window.localStorage.clear();
      window.location.reload();
    });
    this.on('handleDirectMessage', this.updateDirectMessageEvent);
  }
  loadLocalStorageEvents = async () => {
    const latestMsgs = await localForage.getItem('latestMsgs');
    const contactList = await localForage.getItem('contactList');
    const rooms = await localForage.getItem('rooms');
    const directs = await localForage.getItem('directs');
    const mDirects = await localForage.getItem('mdirects');
    const inviteDirects = await localForage.getItem('inviteDirects');
    const latestMsgsByEveryone = await localForage.getItem('latestMsgsByEveryone');
    const followEvents = await localForage.getItem('followEvents');
    const profileEvents = await localForage.getItem('profileEvents');
    const channelProfileEvents = await localForage.getItem('channelProfileEvents');
    const notificationEvents = await localForage.getItem('notificationEvents');
    const eventsById = await localForage.getItem('eventsById');
    const dms = await localForage.getItem('dms');
    const keyValueEvents = await localForage.getItem('keyValueEvents');
    if (Array.isArray(contactList)) {
      this.roomList.mDirects = new Set(contactList);
    }
    if (Array.isArray(rooms)) {
      this.roomList.rooms = new Set(rooms);
      this.roomList.rooms.forEach((roomId) => {
        if (!this.matrixClient.publicRoomList.has(roomId)) {
          const croom = initialChannelroom(roomId, this.matrixClient.user);
          this.matrixClient.publicRoomList.set(roomId, croom);
        }
      });
    }
    if (Array.isArray(directs)) {
      this.roomList.directs = new Set(directs);
      this.roomList.directs.forEach((direct) => {
        if (!this.matrixClient.publicRoomList.has(direct)) {
          const croom = initialDMroom(direct, this.matrixClient.user);
          this.matrixClient.publicRoomList.set(direct, croom);
        }
      });
    }
    if (Array.isArray(mDirects)) {
      this.roomList.mDirects = new Set(mDirects);
      this.roomList.mDirects.forEach((direct) => {
        if (!this.matrixClient.publicRoomList.has(direct)) {
          const croom = initialDMroom(direct, this.matrixClient.user);
          this.matrixClient.publicRoomList.set(direct, croom);
        }
      });
    }
    if (Array.isArray(inviteDirects)) {
      this.roomList.inviteDirects = new Set(inviteDirects);
    }

    this.localStorageLoaded = true;
    if (Array.isArray(followEvents)) {
      followEvents.forEach((e) => this.matrixClient.handleEvent(e));
    }
    if (Array.isArray(profileEvents)) {
      profileEvents.forEach((e) => this.matrixClient.handleEvent(e));
    }
    if (Array.isArray(profileEvents)) {
      profileEvents.forEach((e) => this.matrixClient.handleEvent(e));
    }
    if (Array.isArray(channelProfileEvents)) {
      channelProfileEvents.forEach((e) => this.matrixClient.handleEvent(e));
    }
    if (Array.isArray(latestMsgs)) {
      latestMsgs.forEach((msg) => {
        this.matrixClient.handleEvent(msg);
      });
    }
    if (Array.isArray(latestMsgsByEveryone)) {
      latestMsgsByEveryone.forEach((msg) => {
        this.matrixClient.handleEvent(msg);
      });
    }
    if (Array.isArray(notificationEvents)) {
      notificationEvents.forEach((msg) => {
        this.matrixClient.handleEvent(msg);
      });
    }
    if (Array.isArray(dms)) {
      dms.forEach((msg) => {
        this.matrixClient.handleEvent(msg);
      });
    }
    if (Array.isArray(keyValueEvents)) {
      keyValueEvents.forEach((msg) => {
        this.matrixClient.handleEvent(msg);
      });
    }
  };

  async updateDirectMessageEvent(event: NostrEvent) {
    console.log('from stranger', event.pubkey, event.content);
    const mevent = await formatDmMsgFromOthersOrMe(event, this.matrixClient.user);
    const mc = new TEvent(mevent);
    const roomId = mevent.room_id;
    const senderId = mevent.sender;
    const room = this.matrixClient.publicRoomList.get(roomId);
    if (!room) {
      const room = new TRoom(senderId, 'single');
      room.init();
      const asender = new TRoomMember(senderId);
      asender.init();
      room.addMember(asender);
      mc.sender = asender;
      const me = new TRoomMember(
        this.matrixClient.user.userId,
        this.matrixClient.user.displayName,
        this.matrixClient.user.avatarUrl
      );
      me.membership = 'invite';
      room.addMember(me);
      this.matrixClient.publicRoomList.set(senderId, room);
      const membership = 'invite';
      const prevMembership = null;
      this.emit('Room.myMembership', room, membership, prevMembership);
      return;
    }

    const me = room.getMember(this.matrixClient.user.userId);
    if (me?.membership == 'invite') {
      const membership = 'invite';
      const prevMembership = 'invite';
      this.emit('Room.myMembership', room, membership, prevMembership);
    } else if (me?.membership == 'join') {
      const sender = room.getMember(senderId);
      if (sender) {
        mc.sender = sender;
      } else {
        const asender = new TRoomMember(senderId);
        asender.init();
        room.addMember(asender);
        mc.sender = asender;
      }
      this.emit('Event.decrypted', mc);
    }
  }

  async logout() {
    this.matrixClient.stopClient();
    try {
      await this.matrixClient.logout();
    } catch {
      // ignore if failed to logout
    }
    await this.matrixClient.clearStores();
    window.localStorage.clear();
    window.location.reload();
  }
  async getContactsList() {
    let list = Array.from(this.roomList.mDirects);
    list.push(this.matrixClient.getUserId());
    this.matrixClient.fetchUsersMeta(list);
    const contactsList = await this.matrixClient.fetchContactUserList();
    // const contactsList = [
    //   ['2e94f749531f1fa2b6754dd0516ebd61061bae20b61b370a4fda277d580e3f21'],
    //   ['2ca02292d8cd954cbc57a4f3544e13ee263cb740b29ce090344b64e59da9cea1'],
    //   ['5a80ef3c6d8520bdc5fefe193255cc71d4e53c07bf43077317df0eb7e13a2534'],
    //   ['3e81efdc94aae511eae0b0d2fc3db2db1b335301134aae2d825f56c9cbc1f856'],
    // ];

    if (contactsList && contactsList.length > 0) {
      contactsList.forEach((contact) => {
        // this.roomList.directs.add(contact[0]);
        this.roomList.mDirects.add(contact[0]);
        if (!this.matrixClient.publicRoomList.get(contact[0])) {
          // let aroom = new TRoom(contact[0], 'single');
          // aroom.init();
          // const member = new TRoomMember(contact[0]);
          // member.init();
          // aroom.addMember(member);
          // let me = new TRoomMember(this.matrixClient.user.userId);
          // me.name = this.matrixClient.user.displayName;
          // me.avatarSrc = this.matrixClient.user.avatarUrl;
          // aroom.addMember(me);
          const aroom = initialDMroom(contact[0], this.matrixClient.user);
          this.matrixClient.publicRoomList.set(contact[0], aroom);
        }
      });
      saveMDirectsToLocal(this.roomList.mDirects);
      let list = Array.from(this.roomList.mDirects);
      list.push(this.matrixClient.getUserId());
      this.matrixClient.fetchUsersMeta(list);
    }
  }

  clearCacheAndReload() {
    this.matrixClient.stopClient();
    this.matrixClient.store.deleteAllData().then(() => {
      window.location.reload();
    });
  }
}

const initMatrix = new InitMatrix();

export default initMatrix;
