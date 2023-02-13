import { nip19, Relay, relayInit } from 'nostr-tools';
import { NostrEvent, SearchResultUser, TChannelmapObject, TSubscribedChannel } from '../../types';
import TDevice from '../../types/TDevice';
import TEvent from '../../types/TEvent';
import TRoom from '../../types/TRoom';
import TRoomMember from '../../types/TRoomMember';
import TUser from '../../types/TUser';
import * as bech32 from 'bech32-buffer';
import {
  fetchChannelMetaFromRelay,
  fetchContacts,
  fetchUserMetaFromRelay,
  formatChannelEvent,
  formatChannelMsg,
  formatDMEvent,
  formatDmMsgFromOthersOrMe,
  formatGlobalMsg,
  formatRoomFromNostrEvent,
  formatRoomMemberFromNostrEvent,
  getRelayStatus,
} from '../util/matrixUtil';
import { defaultName, toNostrHexAddress } from '../util/nostrUtil';
import EventEmitter from './EventEmitter';
import { aevent2, defaultChatroomList, stage3relays, TChannelMapList } from './state/cons';

class MatrixClientA extends EventEmitter {
  store: { deleteAllData: () => Promise<any> };
  baseUrl: string;
  user: TUser;
  crypto: string;
  publicRoomList: Map<string, TRoom>;
  relayInstance: Map<string, Relay>;
  eventsById: Map<string, NostrEvent>;
  constructor(userId: string, privkey?: string) {
    super();
    this.user = new TUser();
    this.eventsById = new Map();
    // this.user.userId = userId + ':abc';

    this.user.userId = userId;
    this.user.displayName = defaultName(userId, 'npub')!;
    this.user.privatekey = privkey!;
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
    let subscribed_channels = [] as TSubscribedChannel[];
    if (localStorage['subscribed_channels']) {
      const sc = localStorage['subscribed_channels'];
      subscribed_channels = JSON.parse(sc);
    } else {
      subscribed_channels = defaultChatroomList;
      localStorage.setItem('subscribed_channels', JSON.stringify(subscribed_channels));
    }
    for (let i = 0; i < subscribed_channels.length; i++) {
      if (subscribed_channels[i].type == 'groupChannel') {
        let room = new TRoom(subscribed_channels[i].user_id, 'groupChannel');
        room.roomId = subscribed_channels[i].user_id;
        this.publicRoomList.set(room.roomId, room);
        // this.matrixClient.subChannelMessage(room.roomId);
      } else if (subscribed_channels[i].type == 'single') {
        let room = new TRoom(subscribed_channels[i].user_id, 'single');
        room.roomId = subscribed_channels[i].user_id;
        this.publicRoomList.set(room.roomId, room);
      } else if (subscribed_channels[i].type == 'groupRelay') {
      }
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
  getAccountData(eventType: 'm.direct' | string) {
    if (eventType === 'm.direct') {
      // const contactsList = await this.fetchContactUserList();
      // if (!contactsList) return null;
      // type
      // {
      //   "content": {
      //     "@bob:example.com": [
      //       "!abcdefgh:example.com",
      //       "!hgfedcba:example.com"
      //     ]
      //   },
      //   "type": "m.direct"
      // }
    } else {
      const ae1 = new TEvent(aevent2);
      return ae1;
    }

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
    let { type, data } = nip19.decode(userId);
    if (type != 'npub') throw new Error('Invalid user ID');
    const pubkeyHex = toNostrHexAddress(userId);
    if (!pubkeyHex) throw new Error('Invalid user ID');
    this.emit('foundProfileInfo', {
      displayName: defaultName(userId, 'npub'),
      about: null,
      avatarUrl: null,
    });
    const nostrEvent = await this.fetchUserMeta(pubkeyHex);
    let user = {} as { displayName: string; about: string; avatarUrl: string };
    if (!nostrEvent) return null;
    const { name, about, picture } = JSON.parse(nostrEvent.content);
    if (name && name.length > 0) {
      user.displayName = name;
    }
    if (about && about.length > 0) {
      user.about = about;
    }
    if (picture && picture.length > 0) {
      user.avatarUrl = picture;
    }
    this.emit('foundProfileInfo', user);
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
  async publicRooms({ server, limit, since, include_all_networks, filter }: TPublicRooms) {
    let roomId = filter.generic_search_term;
    if (roomId.trim().length == 0) {
      return {
        // chunk: ['room1', 'room2', 'room3'],
        chunk: Array.from(this.publicRoomList.values()),
        next_batch: '',
      };
    }
    if (roomId.substring(0, 4) == 'note') {
      let { type, data } = nip19.decode(roomId);
      if (type != 'note') return null;
      roomId = data as string;
    }
    const room1 = this.publicRoomList.get(roomId);
    if (room1) {
      return {
        // chunk: ['room1', 'room2', 'room3'],
        chunk: [room1],
        next_batch: '',
      };
    }
    for (let [key, relay] of this.relayInstance) {
      if (!relay || getRelayStatus(relay) != 1) {
        console.log('not found', relay.url);
        continue;
      }
      console.log('start searching', relay.url);
      const a = await fetchChannelMetaFromRelay(roomId, relay);
      if (!a || Object.keys(a).length == 0) {
        console.log('not found', relay.url);
        continue;
      }
      const room = formatRoomFromNostrEvent(roomId, a);
      this.publicRoomList.set(roomId, room);
      console.log('Found', relay.url, room);
      return {
        chunk: [room],
        next_batch: '',
      };
    }

    if (roomId.substring(0, 4) == 'note') {
      let { type, data } = nip19.decode(roomId);
      if (type == 'note') return null;
      roomId = data as string;
      const room = new TRoom(roomId, 'groupChannel');
      return {
        chunk: [room],
        next_batch: '',
      };
    }
    if ((roomId.length = 64)) {
      const room = new TRoom(roomId, 'groupChannel');
      return {
        chunk: [room],
        next_batch: '',
      };
    }

    return null;
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
    console.log(`joinRoom`);
    const a = this.publicRoomList.get(roomIdOrAlias.split(':')[0]);
    let me = a?.getMember(this.user.userId);
    if (me?.membership != 'join') {
      a?.setMemberWithMembership(this.user.userId, 'join');
    }
    const membership = 'join';
    const prevMembership = 'invite';
    this.emit('Room.myMembership', a, membership, prevMembership);
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
      const a = new TRoom(options.invite[0], 'single');
      a.name = dmUser!.display_name;
      a.avatarUrl = dmUser!.avatarUrl;
      const m1 = new TRoomMember(options.invite[0], a.name, a.avatarUrl);
      const m2 = new TRoomMember(this.user.userId, this.user.displayName, this.user.avatarUrl);
      a.addMember(m1);
      a.addMember(m2);
      this.publicRoomList.set(a.roomId, a);
      return Promise.resolve(a);
    } else {
      const a = new TRoom('1', 'groupChannel');
      console.log('createRoom');
      return Promise.resolve(a);
    }
  }
  async sendMessage(roomId, content, type) {
    console.log('send message', roomId, content, type);
    const c = content.body;
    console.log(c);
    if (type === 'single') {
      const nostEvent = await formatDMEvent(c, roomId, this.user);
      this.sendMsgToSingle(nostEvent);
    } else if (type === 'groupChannel') {
      const nostrEvent = await formatChannelEvent(c, roomId, this.user);
      this.sendMsgToGroupChannel(nostrEvent);
    } else if ((type = 'groupRelay')) {
    }
  }
  sendMsgToGroupChannel(event: NostrEvent) {
    for (let [k, relay] of this.relayInstance) {
      if (!relay || getRelayStatus(relay) != 1) continue;
      const pub = relay.publish(event);
      pub.on('ok', () => {
        console.log(`${relay.url} has accepted our event`);
      });
      pub.on('seen', () => {
        console.log(`we saw the event on ${relay.url}`);
      });
      pub.on('failed', (reason: any) => {
        console.log(`failed to publish to ${relay.url}: ${reason}`);
      });
    }
  }
  sendMsgToSingle = (event: NostrEvent) => {
    for (let [k, relay] of this.relayInstance) {
      if (!relay || getRelayStatus(relay) != 1) continue;
      const pub = relay.publish(event);
      pub.on('ok', () => {
        console.log(`${relay.url} has accepted our event`);
      });
      pub.on('seen', () => {
        console.log(`we saw the event on ${relay.url}`);
      });
      pub.on('failed', (reason: any) => {
        console.log(`failed to publish to ${relay.url}: ${reason}`);
      });
    }
  };
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
        this.handleEvent(event);
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
      if (!relay || getRelayStatus(relay) != 1) continue;
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
      if (!relay || getRelayStatus(relay) != 1) continue;
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
  subDmFromStranger = () => {
    const pubkey = this.user.userId;
    for (let [k, relay] of this.relayInstance) {
      const filter = {
        kinds: [4],
        '#p': [pubkey],
        limit: 30,
      };
      if (!relay || getRelayStatus(relay) != 1) continue;
      // updateUsermap(store, pubkey);
      const sub = relay.sub([filter]);
      sub.on('event', async (event: NostrEvent) => {
        this.handleEvent(event);
      });
      sub.on('eose', () => {
        // sub.unsub();
        // console.log('sub dm from stanger eose')
      });
    }
  };
  async fetchUserMeta(user_id: string) {
    if (user_id.substring(0, 4) == 'npub') {
      let { type, data } = nip19.decode(user_id);
      if (type != 'npub') return null;
      user_id = data as string;
    }
    for (let [key, relay] of this.relayInstance) {
      if (!relay || getRelayStatus(relay) != 1) {
        console.log('not found', relay.url);
        continue;
      }
      console.log('start searching', relay.url);
      const a = await fetchUserMetaFromRelay(user_id, relay);
      if (a && Object.keys(a).length > 1) {
        console.log('Found', relay.url, a);
        return a;
      } else {
        console.log('not found', relay.url);
      }
    }
  }

  async fetchContactUserList() {
    const user_id = this.user.userId;
    console.log('3444444');
    for (let [key, relay] of this.relayInstance) {
      const event = await fetchContacts(relay, user_id);
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
  handleEvent(event: NostrEvent, force = false) {
    if (!event) return;
    if (this.eventsById.has(event.id) && !force) {
      return;
    }
    // if (!this.knownUsers.has(event.pubkey) && !this.subscribedPosts.has(event.id)) {
    //   return;
    // }
    // if (this.blockedUsers.has(event.pubkey)) {
    //   return;
    // }
    // if (this.deletedEvents.has(event.id)) {
    //   return;
    // }
    // if (event.created_at > Date.now() / 1000) {
    //   this.futureEventIds.add(event);
    //   if (this.futureEventIds.has(event.id)) {
    //     this.eventsById.set(event.id, event); // TODO should limit stored future events
    //   }
    //   if (this.futureEventIds.first() === event.id) {
    //     this.handleNextFutureEvent();
    //   }
    //   return;
    // }

    // this.handledMsgsPerSecond++;

    // this.subscribedPosts.delete(event.id);

    switch (event.kind) {
      case 0:
        // if (this.handleMetadata(event) === false) {
        //   return;
        // }
        break;
      case 1:
        this.handlePublicNostrEvent(event);
        break;
      case 4:
        this.handleDirectMessage(event);
        break;
      case 5:
        // this.handleDelete(event);
        break;
      case 3:
        // if (this.followEventByUser.get(event.pubkey)?.created_at >= event.created_at) {
        //   return;
        // }
        // this.maybeAddNotification(event);
        // this.handleFollow(event);
        break;
      case 6:
        // this.maybeAddNotification(event);
        // this.handleBoost(event);
        break;
      case 7:
        // this.maybeAddNotification(event);
        // this.handleReaction(event);
        break;
      case 16462:
        // TODO return if already have
        // this.handleBlockList(event);
        break;
      case 16463:
        // this.handleFlagList(event);
        break;
      case 30000:
        // this.handleKeyValue(event);
        break;
    }
  }
  handlePublicNostrEvent(event: NostrEvent) {
    this.eventsById.set(event.id, event);
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
    this.emit('Event.decrypted', mc);
  }
  handleDirectMessage = async (event: NostrEvent) => {
    this.eventsById.set(event.id, event);
    console.log('from stranger', event.pubkey, event.content);
    const mevent = await formatDmMsgFromOthersOrMe(event, this.user);
    const mc = new TEvent(mevent);
    const roomId = mevent.room_id;
    const senderId = mevent.sender;
    const room = this.publicRoomList.get(roomId);
    if (room) {
      const me = room.getMember(this.user.userId);
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
      console.log(mc);
    } else {
      const room = new TRoom(senderId, 'single');
      const asender = new TRoomMember(senderId);
      asender.init();
      room.addMember(asender);
      mc.sender = asender;
      const me = new TRoomMember(this.user.userId, this.user.displayName, this.user.avatarUrl);
      me.membership = 'invite';
      room.addMember(me);
      this.publicRoomList.set(senderId, room);
      const membership = 'invite';
      const prevMembership = null;
      this.emit('Room.myMembership', room, membership, prevMembership);
    }
  };
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
