import { Event, Filter, getEventHash, nip19, Relay, relayInit, Sub } from 'nostr-tools';
import {
  NostrEvent,
  SearchResultUser,
  Subscription,
  TMyMemberships,
  TOptionsCreateDM,
  TRoomType,
  TSubscribedChannel,
} from '../../types';
import TDevice from '../../types/TDevice';
import TEvent, { TContent, TEventFormat } from '../../types/TEvent';
import TRoom from '../../types/TRoom';
import TRoomMember from '../../types/TRoomMember';
import TUser from '../../types/TUser';
import * as bech32 from 'bech32-buffer';
import localForage from 'localforage';
import {
  fetchChannelMetaFromRelay,
  fetchContacts,
  fetchUserMetaFromRelay,
  fetchUsersMetaFromRelay,
  formatChannelEvent,
  formatChannelMsg,
  FormatCitedEventsAndCitedPubkeys,
  formatDMEvent,
  formatDmMsgFromOthersOrMe,
  formatGlobalMsg,
  formatRoomFromNostrEvent,
  getRelayStatus,
  getSignedEvent,
} from '../util/matrixUtil';
import {
  defaultName,
  toNostrBech32Address,
  toNostrHexAddress,
  getSubscriptionIdForName,
  attachmentsChanged,
  howLong,
  sortedChats,
} from '../util/nostrUtil';
import EventEmitter from './EventEmitter';
import cons, {
  aevent2,
  defaultChatroomList,
  log,
  DEFAULT_RELAY_URLS,
  TChannelMapList,
  REJECT_INVITE_DAYS,
} from './state/cons';
import { Debounce } from '../util/common';
import SortedLimitedEventSet from '../../types/SortedLimitedEventSet';
import {
  saveChannelMessageEvents,
  savechannelProfileEventsToLocal,
  savechannelProfileUpdateEventsToLocal,
  saveMyMembershipsToLocal,
  saveProfileEventsToLocal,
} from '../util/localForageUtil';
import TEventTimelineSet from '../../types/TEventTimelineSet';
import initMatrix from './InitMatrix';
const debounce = new Debounce();
class MatrixClientA extends EventEmitter {
  store: { deleteAllData: () => Promise<any> };
  baseUrl: string;
  user: TUser;
  crypto: string;
  publicRoomList: Map<string, TRoom>;
  relayInstance: Map<string, Relay>;
  eventsById: Map<string, NostrEvent>;
  blockedUsers: Set<string>;
  profileEvents: Map<string, NostrEvent>;
  profiles: Map<string, any>;
  channelProfiles: Map<
    string,
    { name: string; about: string; picture: string; created_at: number; founderId: string }
  >;
  cProfileEvents: Map<string, any>;
  cProfileUpdateEvents: Map<string, any>;
  channelProfileEvents: Map<string, any>;
  contactList: Set<string>;
  contactEvents: Map<string, any>; //my contacts, or someone added my to his/her contacts.
  myMemberships: Map<string, TMyMemberships>;
  localStorageLoaded: boolean;
  directMessagesByUser: Map<string, SortedLimitedEventSet>;
  cMsgsByCid: Map<string, SortedLimitedEventSet>;
  subscriptionsByName: Map<string, Set<Sub>>;
  subscribedFiltersByName: Map<string, Filter[]>;
  subscriptions: Map<number, Subscription>;
  subscribedUsers: Set<string>;
  subscribedChannels: Set<string>;
  subscribedChannelProfiles: Set<string>;
  subscribedProfiles: Set<string>;
  subscriptionId: number;
  constructor(userId: string, privkey?: string) {
    super();
    this.user = new TUser();
    this.eventsById = new Map();
    this.blockedUsers = new Set<string>();
    this.profileEvents = new Map<string, NostrEvent>();
    this.cProfileEvents = new Map<string, NostrEvent>();
    this.cProfileUpdateEvents = new Map<string, NostrEvent>();
    this.channelProfileEvents = new Map<string, any>();
    this.channelProfiles = new Map<string, any>();
    this.profiles = new Map<string, any>();
    this.myMemberships = new Map<string, any>();
    this.user.userId = userId;
    this.user.displayName = defaultName(userId, 'npub')!;
    this.user.privatekey = privkey!;
    this.localStorageLoaded = false;
    this.contactList = new Set();
    this.subscriptionId = 0;
    this.contactEvents = new Map();
    this.directMessagesByUser = new Map<string, SortedLimitedEventSet>();
    this.cMsgsByCid = new Map<string, SortedLimitedEventSet>();
    this.subscriptionsByName = new Map<string, Set<Sub>>();
    this.subscribedFiltersByName = new Map<string, Filter[]>();
    this.subscriptions = new Map<number, Subscription>();
    this.subscribedUsers = new Set<string>();
    this.subscribedProfiles = new Set<string>();
    this.publicRoomList = new Map();
    this.relayInstance = new Map();
    this.subscribedChannels = new Set<string>();
    this.subscribedChannelProfiles = new Set<string>();
    // this.store = {
    //   deleteAllData:()=>Promise<any>
    // }
  }

  async initCrypto() {
    console.log('initCrypto');
    // await this.loadLocalStorageEvents();
  }
  async startClient({ lazyLoadMembers: boolean }) {
    console.log('startClient');
    const c = this.profileEvents.get(this.user.userId);
    const relayList = await localForage.getItem('relayList');
    if (Array.isArray(relayList) && relayList.length > 0) {
      for (let i = 0; i < relayList.length; i++) {
        const pubkey = '33333';
        await this.connectAndJoin(relayList[i], pubkey);
      }
    } else {
      for (let i = 0; i < DEFAULT_RELAY_URLS.length; i++) {
        const pubkey = '33333';
        await this.connectAndJoin(DEFAULT_RELAY_URLS[i], pubkey);
        // this.addRelay(DEFAULT_RELAY_URLS[i]);
      }
      localForage.setItem('relayList', DEFAULT_RELAY_URLS);
    }
  }
  async connectAndJoin(wss: string, pubkey: string) {
    this.emit('startConnect', wss);
    const relay = relayInit(wss);
    try {
      await relay.connect();
      this.relayInstance.set(wss, relay);
    } catch (err: any) {
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
  }
  stopClient() {
    console.log('stopClient');
  }
  async clearStores() {
    console.log('clearStores');
    for (let [k, relay] of this.relayInstance) {
      this.removeRelay(relay.url);
    }
  }
  setGlobalErrorOnUnknownDevices(arg0: boolean) {
    console.log('setGlobalErrorOnUnknownDevices');
  }
  getRoom(roomId: string): TRoom | null {
    if (!roomId) {
      return null;
    }
    const room = this.publicRoomList.get(roomId);
    if (room) return room;
    return null;
  }
  getAccountData(eventType: 'm.direct' | string) {
    if (eventType === 'm.direct') {
      // const contactsList = this.fetchContactUserList();
      // if (!contactsList) return null;
      return {
        content: {
          '@bob:example.com': ['!abcdefgh:example.com', '!hgfedcba:example.com'],
        },
        type: 'm.direct',
      };
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
    console.log('getrooms', this.publicRoomList.values());
    return Array.from(this.publicRoomList.values());
  }
  getUserId() {
    return this.user.userId;
  }
  getUser(userId: string) {
    if (userId === this.user.userId) return this.user;

    const profile = this.profiles.get(userId);
    if (!profile) return new TUser(userId, defaultName(userId, 'npub'));
    const auser = new TUser(userId, profile?.name, profile?.picture);
    if (!profile.name) auser.displayName = defaultName(userId, 'npub')!;

    return auser;
  }
  async getUserWithCB(userId: string, cb: (profile: any) => void) {
    const profile = this.profiles.get(toNostrHexAddress(userId)!);
    if (profile) {
      cb(profile);
      return;
    }
    const nostrEvent = await this.fetchUserMeta(userId);
    if (nostrEvent) {
      this.handleEvent(nostrEvent);
      const profile = JSON.parse(nostrEvent.content);
      if (userId == this.user.userId) {
        this.user.displayName = profile.name;
        this.user.about = profile.about;
        this.user.avatarUrl = profile.picture;
      }
      cb(profile);
      if (initMatrix.roomList.directs.has(userId)) {
        this.emit(cons.events.roomList.ROOM_PROFILE_UPDATED, userId);
      }
    }
  }

  async getChannelInfoWithCB(channelId: string, cb: (profile: any) => void) {
    const profile = this.channelProfiles.get(channelId);
    if (profile) {
      let room = this.publicRoomList.get(channelId);
      room!.name = profile.name;
      room!.canonical_alias = profile.about;
      room!.avatarUrl = profile.picture;
      this.publicRoomList.set(channelId, room!);
      cb(profile);
      return;
    }
    const nostrEvent = await this.fetchChannelMeta(channelId);
    if (nostrEvent) {
      this.handleEvent(nostrEvent);
      const profile = JSON.parse(nostrEvent.content);
      let room = this.publicRoomList.get(channelId);
      room!.name = profile.name;
      room!.canonical_alias = profile.about;
      room!.avatarUrl = profile.picture;
      this.publicRoomList.set(channelId, room!);
      cb(profile);
      this.emit(cons.events.roomList.ROOM_PROFILE_UPDATED, channelId);
    }
  }
  async logout() {
    console.log('logout');
    await localForage.clear();
  }
  getDevices() {
    return Promise.resolve({ devices: [] });
  }
  // search user from relays
  async getProfileInfo(userId: string) {
    const pubkeyHex = toNostrHexAddress(userId);
    if (!pubkeyHex) throw new Error('Invalid user ID');
    const profile = this.profiles.get(pubkeyHex);
    if (profile) {
      return profile;
    }
    this.emit('foundProfileInfo', {
      displayName: defaultName(userId, 'npub'),
      about: null,
      avatarUrl: null,
    });
    const nostrEvent = await this.fetchUserMeta(pubkeyHex);
    this.handleEvent(nostrEvent);
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
    return user;
  }
  getProfile(address, cb?: (profile: any, address: string) => void, verifyNip05 = false) {
    // this.knownUsers.add(address);
    const callback = () => {
      cb?.(this.profiles.get(address), address);
    };

    const profile = this.profiles.get(address);
    if (profile) {
      callback();
      if (verifyNip05 && profile.nip05 && !profile.nip05valid) {
        this.verifyNip05Address(profile.nip05, address).then((isValid) => {
          console.log('NIP05 address is valid?', isValid, profile.nip05, address);
          profile.nip05valid = isValid;
          this.profiles.set(address, profile);
          callback();
        });
      }
    }

    this.subscribedProfiles.add(address);
    this.subscribe([{ authors: [address], kinds: [0, 3] }], callback);
  }
  async verifyNip05Address(address: string, pubkey: string): Promise<boolean> {
    try {
      const [username, domain] = address.split('@');
      const url = `https://${domain}/.well-known/nostr.json?name=${username}`;
      const response = await fetch(url);
      const json = await response.json();
      const names = json.names;
      return names[username] === pubkey || names[username.toLowerCase()] === pubkey;
    } catch (error) {
      return false;
    }
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
    return arg0;
  }
  async setAvatarUrl(url: string) {
    this.user.avatarUrl = url;
    let profile: any = {};
    const profileEvent = this.profileEvents.get(this.user.userId);

    if (profileEvent) {
      profile = JSON.parse(profileEvent.content);
      profile.picture = url;
    } else {
      profile = {
        name: this.user.displayName,
        about: this.user.about,
        picture: this.user.avatarUrl,
      };
    }
    await this.setUserMetadata(profile);
  }
  async setDisplayName(name: string) {
    this.user.displayName = name;
    let profile: any = {};
    const profileEvent = this.profileEvents.get(this.user.userId);
    if (profileEvent) {
      profile = JSON.parse(profileEvent.content);
      profile.name = name;
    } else {
      profile = {
        name: name,
        about: this.user.about,
        picture: this.user.avatarUrl,
      };
    }
    await this.setUserMetadata(profile);
  }

  async setUserMetadata(profile) {
    const note = JSON.stringify(profile);
    const now = Math.floor(Date.now() / 1000);
    let event = {
      content: note,
      created_at: now,
      kind: 0,
      tags: [],
      pubkey: this.user.userId,
    };

    const event2 = await getSignedEvent(event, this.user?.privatekey);
    this.handleEvent(event2);
    console.log(event2);
    this.publishEvent(event2);
  }
  async setRoomName(roomId, newName) {
    let room = this.publicRoomList.get(roomId);
    if (room) {
      room.name = newName;
      this.publicRoomList.set(roomId, room);
      let p = this.channelProfiles.get(roomId);
      p!.name = newName;
      this.channelProfiles.set(roomId, p!);
    }
  }
  async setRoomAvatar(roomId, avatar) {
    let room = this.publicRoomList.get(roomId);
    if (room) {
      room.avatarUrl = avatar;
      this.publicRoomList.set(roomId, room);
      let p = this.channelProfiles.get(roomId);
      p!.picture = avatar;
      this.channelProfiles.set(roomId, p!);
    }
  }
  async setRoomAbout(roomId, about) {
    let room = this.publicRoomList.get(roomId);
    if (room) {
      room.canonical_alias = about;
      this.publicRoomList.set(roomId, room);
      let p = this.channelProfiles.get(roomId);
      p!.about = about;
      this.channelProfiles.set(roomId, p!);
    }
  }
  async setRoomTopic(roomId, newTopic) {}
  async sendStateEvent(roomId, arg1: string, arg2: any, arg3: string) {}
  async publicRooms({ server, limit, since, include_all_networks, filter }: TPublicRooms) {
    let roomId = filter.generic_search_term;
    if (roomId.trim().length == 0) {
      let rooms = Array.from(this.publicRoomList.values());
      rooms = rooms.filter((room) => room.type == 'groupChannel');
      return {
        // chunk: ['room1', 'room2', 'room3'],
        chunk: rooms,
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
        continue;
      }
      const a = await fetchChannelMetaFromRelay(roomId, relay);
      if (!a || Object.keys(a).length == 0) {
        // console.log('not found', relay.url);
        continue;
      }
      this.handleChannelMetaEvent(a);
      const room = formatRoomFromNostrEvent(roomId, a);
      room.founderId = a.pubkey;
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
      room.init();
      return {
        chunk: [room],
        next_batch: '',
      };
    }
    if ((roomId.length = 64)) {
      const room = new TRoom(roomId, 'groupChannel');
      room.init();
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
    return false;
  }
  async paginateEventTimeline(
    room: TRoom,
    timelineToPaginate: any,
    { backwards, limit }: { backwards: boolean; limit: number }
  ) {
    console.log('11111111111111111111');
    let tl = [] as TEvent[];
    let eventIds: string[] = [];
    if (room.type == 'single') {
      eventIds = this.directMessagesByUser.get(room.roomId)!.eventIds;
      for (let [k, v] of this.eventsById) {
        if (eventIds.includes(k)) {
          const mevents = await formatDmMsgFromOthersOrMe(v, this.user);
          mevents.forEach((m) => {
            const mc = new TEvent(m);
            tl.push(mc);
          });
        }
      }
      return sortedChats(tl);
    }
    if (room.type == 'groupChannel') {
      eventIds = this.cMsgsByCid.get(room.roomId)!.eventIds;
      for (let [k, v] of this.eventsById) {
        if (eventIds.includes(k)) {
          const mevents = formatChannelMsg(v);
          mevents.forEach((m) => {
            const mc = new TEvent(m);
            tl.push(mc);
          });
        }
      }
      return sortedChats(tl);
    }

    // console.log(`paginateEventTimeline`);
    // console.log(timelineToPaginate);
    // console.log(backwards, limit);
  }
  getEventTimeline(timelineSet: Set<TEvent>, eventId: string) {
    const event = this.eventsById.get(eventId);
    if (!event) return Promise.resolve(Array.from(timelineSet));
    const mevents = formatChannelMsg(event);
    mevents.forEach((m) => {
      const mc = new TEvent(m);
      timelineSet.add(mc);
    });

    const a = Array.from(timelineSet);

    return Promise.resolve(a);
  }
  async joinRoom(roomIdOrAlias: string, arg1: { viaServers: string[] }) {
    const roomId = roomIdOrAlias.split(':')[0];
    const a = this.publicRoomList.get(roomId) as TRoom;
    let me = a?.getMember(this.user.userId);
    if (me?.membership != 'join') {
      a?.setMemberWithMembership(this.user.userId, 'join');
    }
    this.publicRoomList.set(roomId, a!);
    const membership = 'join';
    const prevMembership = 'invite';
    const myMembership: TMyMemberships = {
      roomId: roomId,
      membership,
      prevMembership,
      created_at: Math.floor(Date.now() / 1000),
    };
    this.updateMyMemberships(roomId, myMembership);
    this.emit('Room.myMembership', a, membership, prevMembership);
    return Promise.resolve(a);
  }
  async redactEvent(roomId, eventId, undefined, arg3: any) {
    console.log('redact event');
  }
  async sendEvent(roomId, arg1: string, content) {
    console.log('send event', roomId, arg1, content);
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
  async leave(roomId: string) {
    const a = this.getRoom(roomId);
    let myMembership = this.myMemberships.get(roomId);
    if (myMembership && myMembership.membership == 'invite') {
      // 说明是邀请的聊天室。
      myMembership.membership = 'leave';
      myMembership.prevMembership = 'invite';
      myMembership.created_at = Math.floor(Date.now() / 1000);
      this.updateMyMemberships(roomId, myMembership);
      this.emit('Room.myMembership', a, myMembership.membership, myMembership.prevMembership);
      return;
    }
    const membership = 'leave';
    const prevMembership = 'join';
    const mShip: TMyMemberships = {
      roomId,
      membership,
      prevMembership,
      created_at: Math.floor(Date.now() / 1000),
    };
    this.updateMyMemberships(roomId, mShip);

    this.emit('Room.myMembership', a, membership, prevMembership);
    console.log('leave');
  }
  async createRoom(options: TOptionsCreateDM, dmUser?: SearchResultUser) {
    if (options.is_direct == true) {
      const userId = options.invite[0];
      if (!dmUser) {
        const profile = this.profiles.get(userId);
        if (profile) {
          dmUser = {
            user_id: userId,
            display_name: profile?.name,
            avatarUrl: profile?.picture,
            about: profile?.about,
          };
        }
      }
      const a = new TRoom(
        options.invite[0],
        'single',
        dmUser?.display_name,
        null as unknown as string,
        dmUser?.avatarUrl
      );
      a.founderId = this.user.userId;
      const m1 = new TRoomMember(options.invite[0], a.name, a.avatarUrl);
      const m2 = new TRoomMember(this.user.userId, this.user.displayName, this.user.avatarUrl);
      const myMembership: TMyMemberships = {
        roomId: userId,
        membership: 'join',
        prevMembership: null,
        created_at: Math.floor(Date.now() / 1000),
      };
      this.updateMyMemberships(userId, myMembership);
      // this.myMemberships.set(userId);
      a.addMember(m1);
      a.addMember(m2);
      this.publicRoomList.set(a.roomId, a);
      return Promise.resolve(a);
    } else {
      const name = options.name;
      const about = options.topic;
      const picture = '';
      const event: NostrEvent = await this.formatCreateChannelEvent(
        name,
        about,
        picture,
        this.user
      );

      // this.publishEvent(event);
      // this.handleEvent(event);
      const a = new TRoom(event.id, 'groupChannel', name, about, picture);
      a.founderId = this.user.userId;
      let me2 = new TRoomMember(this.user.userId, this.user.displayName, this.user.avatarUrl);
      me2.powerLevel = 10000;
      a.addMember(me2);
      this.publicRoomList.set(a.roomId, a);
      let channetProfile = JSON.parse(event.content);
      channetProfile.created_at = event.created_at;
      this.channelProfiles.set(event.id, channetProfile);
      this.cProfileEvents.set(event.id, event);
      savechannelProfileEventsToLocal(this.cProfileEvents);
      return Promise.resolve(a);
    }
  }
  async sendMessage(roomId: string, content: TContent, type: TRoomType) {
    const roomType = type;
    const msgType = content.msgtype;
    if (roomType === 'single') {
      let c = content.body;
      if (msgType == 'm.image') {
        c = content.url!;
      }
      const nostrEvent = await formatDMEvent(c, roomId, this.user);
      this.publishEvent(nostrEvent);
    } else if (roomType === 'groupChannel') {
      let c = content.body;
      if (msgType == 'm.image') {
        c = content.url!;
      }
      const nostrEvent = await formatChannelEvent(c, roomId, this.user);
      this.publishEvent(nostrEvent);
    } else if (roomType == 'groupRelay') {
    }
  }

  updateMyMemberships(roomId: string, mShip: TMyMemberships) {
    this.myMemberships.set(roomId, mShip);
    saveMyMembershipsToLocal(this.myMemberships);
  }
  saveLocalStorageEvents = () =>
    debounce._(() => {
      console.log('保存成功');
      const dms: NostrEvent[] = [];
      for (const set of this.directMessagesByUser.values()) {
        set.eventIds.forEach((eventId: any) => {
          dms.push(this.eventsById.get(eventId)!);
        });
      }

      localForage.setItem('dms', dms);

      // TODO save own block and flag events
    }, 500)();
  publishEvent = (event: NostrEvent) => {
    // also publish at most 10 events referred to in tags
    const referredEvents = event.tags
      .filter((tag) => tag[0] === 'e')
      .reverse()
      .slice(0, 10);
    for (let [k, relay] of this.relayInstance) {
      if (!relay || getRelayStatus(relay) != 1) {
        continue;
      }
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
      for (const ref of referredEvents) {
        const referredEvent = this.eventsById.get(ref[1]);
        if (referredEvent) {
          relay.publish(referredEvent);
        }
      }
    }
    this.handleEvent(event);
    return event.id;
  };
  subscribe = (filters: Filter[], cb?: (event: Event) => void) => {
    cb &&
      this.subscriptions.set(this.subscriptionId++, {
        filters,
        callback: cb,
      });

    let hasNewUsers = false;
    let hasNewChannelProfiles = false;
    let hasNewSubscribedChannels = false;
    let hasNewKeywords = false;
    for (const filter of filters) {
      if (filter.authors) {
        for (const author of filter.authors) {
          if (!author) continue;
          // make sure the author is valid hex
          if (!author.match(/^[0-9a-fA-F]{64}$/)) {
            console.error('Invalid author', author);
            continue;
          }
          if (!this.subscribedUsers.has(author)) {
            hasNewUsers = true;
            this.subscribedUsers.add(author);
          }
        }
      }
      if (filter.ids) {
        for (const id of filter.ids) {
          if (!this.subscribedChannelProfiles.has(id)) {
            hasNewChannelProfiles = true;
            this.subscribedChannelProfiles.add(toNostrHexAddress(id)!);
          }
        }
      }
      if (Array.isArray(filter['#e'])) {
        for (const id of filter['#e']) {
          if (!this.subscribedChannels.has(id)) {
            hasNewSubscribedChannels = true;
            this.subscribedChannels.add(id);
            setTimeout(() => {
              // remove after some time, so the requests don't grow too large
              this.subscribedChannels.delete(id);
            }, 60 * 1000);
          }
        }
      }
    }
    hasNewSubscribedChannels && this.subChannelMessage();
    hasNewUsers && this.subscribeToProfiles(); // TODO subscribe to old stuff from new authors, don't resubscribe to all
    hasNewChannelProfiles && this.fetchChannelsMeta();
  };
  getDirectMessages(cb?: (dms: Map<string, SortedLimitedEventSet>) => void) {
    const callback = () => {
      cb?.(this.directMessagesByUser);
    };
    callback();
    this.subscribe([{ kinds: [4] }], callback);
  }

  getDirectMessagesByUser(address: string, cb?: (messageIds: string[]) => void) {
    // this.knownUsers.add(address);
    const callback = () => {
      cb?.(this.directMessagesByUser.get(address)!.eventIds);
    };
    this.directMessagesByUser.has(address) && callback();
    const myPub = this.user.userId;
    this.subscribe([{ kinds: [4], '#p': [address, myPub] }], callback);
  }

  getSyncState() {
    console.log('get sync state');
    return 'getSyncState';
  }
  getPushActionsForEvent(mEvent) {
    return 'actions';
  }
  subGlobalMessages = () => {
    const filter = {
      kinds: [1],
      limit: 20,
    };
    this.sendSubToRelays([filter], 'subGlobalMessages');
  };
  subChannelMessage = (channelId: string[]) => {
    // for (let [k, relay] of this.relayInstance) {
    const filter = {
      kinds: [42],
      '#e': channelId,
      limit: 200,
    };
    this.sendSubToRelays([filter], `'subChannelMessage'${channelId}`);
  };
  subDmFromStranger = () => {
    const pubkey = this.user.userId;
    const filter = {
      kinds: [4],
      '#p': [pubkey],
      limit: 1000,
    };
    this.sendSubToRelays([filter], 'subDmFromStranger');
  };
  subDmByMe = () => {
    const pubkey = this.user.userId;
    const filter = {
      authors: [pubkey],
      // kinds: [4],
      limit: 1000,
    };
    this.sendSubToRelays([filter], 'subDmByMe');
  };

  fetchChannelsMeta = () =>
    debounce._((channels: string[]) => {
      console.log('subscribeToRepliesAndLikes', this.subscribedChannels);
      const filters: Filter[] = [
        {
          ids: channels,
          kinds: [40, 41],
        },
      ];
      this.sendSubToRelays(filters, 'subscribedChannels', true);
    }, 500)();
  fetchChannelMetaFromRelay = async (channelId: string, relay: Relay) => {
    if (!relay || relay.status != 1) return null;
    const filter = {
      // ids: [channelId],
      kinds: [40, 41],
    };
    const sub = relay.sub([filter]);
    const channel = new Promise<NostrEvent>((resolve, reject) => {
      let channel = {} as NostrEvent;
      sub.on('event', (event: NostrEvent) => {
        channel = event;
        resolve(channel);
      });
      sub.on('eose', () => {
        sub.unsub();
        if (!channel || Object.keys(channel).length == 0) {
          // reject('not found...');
          // console.log('not found...');
          reject(null);
        }
      });
      relay.on('error', () => {
        console.log(`failed: ${relay.url}`);
        reject(null);
      });
      relay.on('disconnect', () => {
        console.log(`disconnected from ${relay.url}`);
        reject(null);
      });
      relay.on('notice', (e: any) => {
        console.log(`notice from ${relay.url}   ${JSON.stringify(e)} `);
        reject(null);
      });
    }).catch((e) => {
      console.error(e);
      return null;
    });

    return channel;
  };

  sendSubToRelays = (filters: Filter[], id: string, once = false, unsubscribeTimeout = 0) => {
    if (id) {
      const subs = this.subscriptionsByName.get(id);
      if (subs) {
        subs.forEach((sub) => {
          console.log('unsub', id);
          sub.unsub();
        });
      }
      this.subscriptionsByName.delete(id);
      this.subscribedFiltersByName.delete(id);
    }

    this.subscribedFiltersByName.set(id, filters);

    if (unsubscribeTimeout) {
      setTimeout(() => {
        this.subscriptionsByName.delete(id);
        this.subscribedFiltersByName.delete(id);
      }, unsubscribeTimeout);
    }

    for (const relay of this.relayInstance.values()) {
      const subId = getSubscriptionIdForName(id);
      const sub = relay.sub(filters, { id: subId });
      // TODO update relay lastSeen
      sub.on('event', (event) => this.handleEvent(event));
      if (once) {
        sub.on('eose', () => sub.unsub());
      }
      if (!this.subscriptionsByName.has(id)) {
        this.subscriptionsByName.set(id, new Set());
      }
      this.subscriptionsByName.get(id)?.add(sub);
      //console.log('subscriptions size', this.subscriptionsByName.size);
      if (unsubscribeTimeout) {
        setTimeout(() => {
          sub.unsub();
        }, unsubscribeTimeout);
      }
    }
    // console.log(this.subscriptionsByName);
    // console.log(this.subscribedFiltersByName);
  };
  subscribeToProfiles = () =>
    debounce._(() => {
      const now = Math.floor(Date.now() / 1000);
      const myPub = this.user.userId;
      const contacts = Array.from(this.contactList);
      console.log('subscribe to', contacts.length, 'contacts');

      this.sendSubToRelays([{ authors: contacts, kinds: [0] }], 'subscribedProfiles', true);
    }, 1000)();
  removeRelay(url: string) {
    try {
      this.relayInstance.get(url)?.close();
    } catch (e) {
      console.log('error closing relay', e);
    }
    this.relayInstance.delete(url);
  }
  async addRelay(url: string) {
    if (this.relayInstance.has(url)) return;
    const relay = relayInit(url, (id) => this.eventsById.has(id));
    await relay.connect();
    relay.on('connect', () => this.resubscribe(relay));
    relay.on('notice', (notice) => {
      console.log('notice from ', relay.url, notice);
    });
    this.relayInstance.set(url, relay);
  }

  resubscribe(relay: Relay) {
    for (const [name, filters] of this.subscribedFiltersByName.entries()) {
      console.log(name, filters);
      const id = getSubscriptionIdForName(name);
      const sub = relay.sub(filters, { id });
      if (!this.subscriptionsByName.has(name)) {
        this.subscriptionsByName.set(name, new Set());
      }
      this.subscriptionsByName.get(name)?.add(sub);
    }
  }

  async fetchUserMeta(user_id: string) {
    if (user_id.substring(0, 4) == 'npub') {
      let { type, data } = nip19.decode(user_id);
      if (type != 'npub') return null;
      user_id = data as string;
    }
    for (let [key, relay] of this.relayInstance) {
      if (!relay || getRelayStatus(relay) != 1) {
        // console.log('not found', relay.url);
        continue;
      }
      // console.log('start searching', relay.url);
      const a = await fetchUserMetaFromRelay(user_id, relay);
      if (a && Object.keys(a).length > 1) {
        return a;
      } else {
        // console.log('not found', relay.url);
      }
    }
  }
  async fetchUsersMeta(user_ids: string[]) {
    console.log('fetchUsersMeta', user_ids.length);
    for (let [key, relay] of this.relayInstance) {
      if (!relay || getRelayStatus(relay) != 1) {
        continue;
      }
      // console.log('start searching', relay.url);
      const a = await fetchUsersMetaFromRelay(user_ids, relay);
      if (a && Object.keys(a).length > 1) {
        return a;
      } else {
        // console.log('not found', relay.url);
      }
    }
  }
  async fetchChannelMeta(user_id: string) {
    if (user_id.substring(0, 4) == 'note') {
      let { type, data } = nip19.decode(user_id);
      if (type != 'note') return null;
      user_id = data as string;
    }
    for (let [key, relay] of this.relayInstance) {
      if (!relay || relay.status != 1) {
        continue;
      }
      // console.log('start searching', relay.url);
      const a = await fetchChannelMetaFromRelay(user_id, relay);
      if (a && Object.keys(a).length > 1) {
        return a;
      } else {
        // console.log('not found', relay.url);
      }
    }
  }
  async formatCreateChannelEvent(name: string, about: string, img: string, user: TUser) {
    let chan = {
      name: name,
      about,
      picture: img,
    };

    const now = Math.floor(Date.now() / 1000);
    const note = JSON.stringify(chan);
    const tags = [] as string[];
    let event = {
      content: note,
      created_at: now,
      kind: 40,
      tags: [['p', user.userId]],
      pubkey: user.userId,
    } as unknown as NostrEvent;
    event = await getSignedEvent(event, user?.privatekey);
    return event;
  }

  async fetchContactUserList() {
    const user_id = this.user.userId;
    for (let [key, relay] of this.relayInstance) {
      const event = await fetchContacts(relay, user_id);
      if (event) {
        this.handleEvent(event);
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
        return list;
      }
    }
  }
  uploadContent(file: any, arg1?: { includeFilename: any; progressHandler }) {
    const url = attachmentsChanged(file);
    return url;
  }
  getRoomPushRule(arg0: 'global', roomId: string) {
    return undefined;
  }
  getStoredCrossSigningForUser(userId: string): any {
    return '';
  }
  getStoredDevice(userId, deviceId) {
    return '';
  }
  handleEvent(event: NostrEvent | null | undefined, force = false) {
    if (!event) return;
    if (this.eventsById.has(event.id) && !force) {
      return;
    }
    // if (!this.knownUsers.has(event.pubkey) && !this.subscribedPosts.has(event.id)) {
    //   return;
    // }
    if (this.blockedUsers.has(event.pubkey)) {
      return;
    }
    // if (this.deletedEvents.has(event.id)) {
    //   return;
    // }
    if (event.created_at > Date.now() / 1000) {
      // console.log('future event', event.created_at);
      return;
    }

    // this.handledMsgsPerSecond++;

    // this.subscribedPosts.delete(event.id);
    switch (event.kind) {
      case 0:
        if (this.handleMetaEvent(event) === false) {
          return;
        }
        break;
      case 1:
        this.handlePublicNostrEvent(event);
        break;
      case 3:
        // this.maybeAddNotification(event);
        this.handleContactEvents(event);
        break;
      case 4:
        this.handleDirectMessage(event);
        break;
      case 5:
        // this.handleDelete(event);
        break;

      case 6:
        // this.maybeAddNotification(event);
        // this.handleBoost(event);
        break;
      case 7:
        // this.maybeAddNotification(event);
        // this.handleReaction(event);
        break;
      case 40:
        this.handleChannelMetaEvent(event);
        break;
      case 41:
        console.log(event.kind, event.content, event.tags);
        this.handleChannelMetaUpdateEvent(event);
        break;
      case 42:
        this.handleChannelMessageEvent(event);
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
  handleChannelMessageEvent(event: NostrEvent) {
    const mevents = formatChannelMsg(event);
    mevents.forEach((m) => {
      const mc = new TEvent(m);
      this.emit('Event.decrypted', mc);
    });

    this.eventsById.set(event.id, event);
    const { events_replied_to } = FormatCitedEventsAndCitedPubkeys(event);
    let channelId = '';
    if (!events_replied_to[0]) return;

    channelId = events_replied_to[0]; // root event.id

    if (!this.cMsgsByCid.has(channelId)) {
      this.cMsgsByCid.set(channelId, new SortedLimitedEventSet(500));
    }
    this.cMsgsByCid.get(channelId)?.add(event);
    saveChannelMessageEvents(this.cMsgsByCid, this.eventsById);
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
    const myPub = this.user.userId;
    let user = event.pubkey;
    if (event.pubkey === myPub) {
      user = event.tags.find((tag) => tag[0] === 'p')?.[1] || user;
    } else {
      const forMe = event.tags.some((tag) => tag[0] === 'p' && tag[1] === myPub);
      if (!forMe) {
        return;
      }
    }
    this.eventsById.set(event.id, event);
    if (!this.directMessagesByUser.has(user)) {
      this.directMessagesByUser.set(user, new SortedLimitedEventSet(500));
    }
    this.directMessagesByUser.get(user)?.add(event);
    const mevents = await formatDmMsgFromOthersOrMe(event, this.user);
    mevents.forEach((mevent) => {
      const mc = new TEvent(mevent);
      const roomId = mevent.room_id;
      const senderId = mevent.sender;
      const room = this.publicRoomList.get(roomId);
      const myMembership = this.myMemberships.get(roomId);
      if (
        myMembership &&
        myMembership.membership == 'leave' &&
        howLong(myMembership.created_at) < REJECT_INVITE_DAYS
      )
        return false;
      if (room) {
        const me = room.getMember(this.user.userId);
        let myMembership = this.myMemberships.get(roomId);
        if (!myMembership) {
          const myRoomIdnMembership = {
            roomId: senderId,
            membership: 'invite' as const,
            prevMembership: null,
            created_at: Math.floor(Date.now() / 1000),
          };
        }
        if (myMembership!.membership == 'invite') {
          const membership = 'invite';
          const prevMembership = 'invite';
          myMembership!.prevMembership = 'invite';
          myMembership!.created_at = Math.floor(Date.now() / 1000);

          this.updateMyMemberships(roomId, myMembership!);

          this.emit('Room.myMembership', room, membership, prevMembership);
        } else if (myMembership?.membership == 'join') {
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
        // console.log(mc);
      } else {
        const room = new TRoom(roomId, 'single');
        room.init();
        const asender = new TRoomMember(senderId);
        asender.init();
        room.addMember(asender);
        mc.sender = asender;
        const me = new TRoomMember(this.user.userId, this.user.displayName, this.user.avatarUrl);
        me.membership = 'invite';
        room.addMember(me);
        this.publicRoomList.set(senderId, room);
        const myRoomIdnMembership = {
          roomId: senderId,
          membership: 'invite' as const,
          prevMembership: null,
          created_at: Math.floor(Date.now() / 1000),
        };
        this.updateMyMemberships(senderId, myRoomIdnMembership);

        const membership = 'invite';
        const prevMembership = null;
        this.emit('Room.myMembership', room, membership, prevMembership);
      }
    });
    this.saveLocalStorageEvents();
  };
  // handleDirectMessage = async (event: NostrEvent) => {
  //   const myPub = this.user.userId;
  //   let user = event.pubkey;
  //   if (event.pubkey === myPub) {
  //     user = event.tags.find((tag) => tag[0] === 'p')?.[1] || user;
  //   } else {
  //     const forMe = event.tags.some((tag) => tag[0] === 'p' && tag[1] === myPub);
  //     if (!forMe) {
  //       return;
  //     }
  //   }
  //   this.eventsById.set(event.id, event);
  //   if (!this.directMessagesByUser.has(user)) {
  //     this.directMessagesByUser.set(user, new SortedLimitedEventSet(500));
  //   }
  //   this.directMessagesByUser.get(user)?.add(event);
  //   this.emit('handleDirectMessage', event);
  //   // const mevent = await formatDmMsgFromOthersOrMe(event, this.user);
  //   // const mc = new TEvent(mevent);
  //   // const roomId = mevent.room_id;
  //   // const senderId = mevent.sender;
  //   // const room = this.publicRoomList.get(roomId);
  //   // if (!room) {
  //   //   const room = new TRoom(senderId, 'single');
  //   //   room.init();
  //   //   const asender = new TRoomMember(senderId);
  //   //   asender.init();
  //   //   room.addMember(asender);
  //   //   mc.sender = asender;
  //   //   const me = new TRoomMember(this.user.userId, this.user.displayName, this.user.avatarUrl);
  //   //   me.membership = 'invite';
  //   //   room.addMember(me);
  //   //   this.publicRoomList.set(senderId, room);
  //   //   const membership = 'invite';
  //   //   const prevMembership = null;
  //   //   this.emit('Room.myMembership', room, membership, prevMembership);
  //   //   return;
  //   // }

  //   // const me = room.getMember(this.user.userId);
  //   // if (me?.membership == 'invite') {
  //   //   const membership = 'invite';
  //   //   const prevMembership = 'invite';
  //   //   this.emit('Room.myMembership', room, membership, prevMembership);
  //   // } else if (me?.membership == 'join') {
  //   //   const sender = room.getMember(senderId);
  //   //   if (sender) {
  //   //     mc.sender = sender;
  //   //   } else {
  //   //     const asender = new TRoomMember(senderId);
  //   //     asender.init();
  //   //     room.addMember(asender);
  //   //     mc.sender = asender;
  //   //   }
  //   //   this.emit('Event.decrypted', mc);
  //   // }
  //   console.log('555555555555');
  //   this.saveLocalStorageEvents();
  // };
  handleMetaEvent(event: NostrEvent) {
    try {
      const existing = this.profiles.get(event.pubkey);
      if (existing?.created_at && existing?.created_at >= event.created_at) {
        return false;
      }
      const profile = JSON.parse(event.content);
      profile.created_at = event.created_at;
      delete profile['nip05valid']; // not robust
      this.profiles.set(event.pubkey, profile);
      // if by our pubkey, save to iris
      const existingEvent = this.profileEvents.get(event.pubkey);
      if (!existingEvent || existingEvent.created_at < event.created_at) {
        this.profileEvents.set(event.pubkey, event);
        saveProfileEventsToLocal(this.profileEvents);
      }
    } catch (e) {
      console.log('error parsing nostr profile', e, event);
    }
  }
  handleChannelMetaEvent = (event: NostrEvent) => {
    const roomIds = Array.from(initMatrix.roomList.rooms);
    let parent = event.id;
    if (!roomIds.includes(parent)) {
      return;
    }

    try {
      const existing = this.channelProfiles.get(parent);
      if (existing?.created_at && existing?.created_at >= event.created_at) {
        return false;
      }
      const profile = JSON.parse(event.content);
      profile.created_at = event.created_at;
      profile.founderId = event.pubkey;

      delete profile['nip05valid']; // not robust
      this.channelProfiles.set(parent, profile);
      this.setRoomName(parent, profile.name);
      this.setRoomAvatar(parent, profile.picture);
      this.setRoomAbout(parent, profile.about);
      const existingEvent = this.cProfileEvents.get(parent);
      if (!existingEvent || existingEvent.created_at < event.created_at) {
        this.cProfileEvents.set(parent, event);
        savechannelProfileEventsToLocal(this.cProfileEvents);
      }
    } catch (e) {
      console.log('error parsing nostr profile', e, event);
    }
  };

  handleChannelMetaUpdateEvent = (event: NostrEvent) => {
    try {
      const roomIds = Array.from(initMatrix.roomList.rooms);
      const etags = event.tags.find((tag) => tag[0] === 'e');
      if (!etags) return;
      let parent = etags[1];
      if (!roomIds.includes(parent)) return;
      const cprofile = this.channelProfiles.get(parent);
      // not update from founderId
      if (!cprofile || cprofile.founderId != event.pubkey) return;
      if (cprofile.created_at > event.created_at) return;

      const profile = JSON.parse(event.content);
      profile.created_at = event.created_at;
      profile.founderId = event.pubkey;

      delete profile['nip05valid']; // not robust
      this.channelProfiles.set(parent, profile);
      this.setRoomName(parent, profile.name);
      this.setRoomAvatar(parent, profile.picture);
      this.setRoomAbout(parent, profile.about);
      const existingEvent = this.cProfileUpdateEvents.get(parent);
      if (!existingEvent || existingEvent.created_at < event.created_at) {
        this.cProfileUpdateEvents.set(parent, event);
        savechannelProfileUpdateEventsToLocal(this.cProfileUpdateEvents);
      }
    } catch (e) {
      console.log('error parsing channel profile', e, event);
    }
  };
  handleContactEvents = (event: NostrEvent) => {
    // if (event.pubkey != this.user.userId) return;
    const existing = this.contactEvents.get(event.pubkey);
    if (existing && existing.created_at >= event.created_at) {
      return;
    }
    if (event.tags) {
      initMatrix.roomList.mDirects.clear();
      for (const tag of event.tags) {
        if (Array.isArray(tag) && tag[0] === 'p') {
          initMatrix.roomList.mDirects.add(tag[1]);
        }
      }
    }
    this.contactEvents.set(event.pubkey, event);
    this.saveLocalStorageProfilesAndContact();
  };

  saveLocalStorageProfilesAndContact = () =>
    debounce._(() => {
      console.log('saveLocalStorageProfilesAndContact');
      const profileEvents = Array.from(this.profileEvents.values());
      const contactEvents = Array.from(this.contactEvents.values());
      console.log('saving', profileEvents.length + contactEvents.length, 'events to local storage');
      localForage.setItem('profileEvents', profileEvents);
      localForage.setItem('contactEvents', contactEvents);
    }, 500)();
  restoreDefaultRelays() {
    this.relayInstance.clear();
    for (const url of DEFAULT_RELAY_URLS) {
      this.addRelay(url);
    }
    // this.saveRelaysToContacts();
    // do not save these to contact list
    // for (const url of SEARCH_RELAYS) {
    //   if (!this.relayInstance.has(url)) this.addRelay(url);
    // }
  }
  saveRelaysToLocal = () => {
    const list = Array.from(this.relayInstance.keys());
    localForage.setItem('relayList', list);
  };
  saveRelaysToContacts = async () => {
    const relaysObj: any = {};
    for (const url of this.relayInstance.keys()) {
      relaysObj[url] = { read: true, write: true };
    }
    const existing = this.contactEvents.get(this.user.userId);
    const content = JSON.stringify(relaysObj);
    const event = {
      pubkey: this.user.userId,
      kind: 3,
      created_at: Math.floor(Date.now() / 1000),
      content,
      tags: existing?.tags || [],
    } as NostrEvent;
    const event2 = await getSignedEvent(event, this.user?.privatekey);
    this.publishEvent(event2);
  };
  addUserToContact = async (userId: string) => {
    const existing = this.contactEvents.get(this.user.userId);
    let event = {} as NostrEvent;
    if (!existing) {
      event = {
        pubkey: this.user.userId,
        kind: 3,
        created_at: Math.floor(Date.now() / 1000),
        content: '',
        tags: [['p', userId]],
      } as NostrEvent;
      const event2 = await getSignedEvent(event, this.user?.privatekey);
      this.publishEvent(event2);
    } else {
      this.contactList.add(userId);
      let tags: string[][] = [];
      for (const a of this.contactList) {
        tags.push(['p', a]);
      }
      event = {
        pubkey: this.user.userId,
        kind: 3,
        created_at: Math.floor(Date.now() / 1000),
        content: '',
        tags: [['p', userId]],
      } as NostrEvent;
      const event2 = await getSignedEvent(event, this.user?.privatekey);
      this.publishEvent(event2);
    }
  };
  getConnectedRelayCount = () => {
    let count = 0;
    for (const relay of this.relayInstance.values()) {
      if (getRelayStatus(relay) === 1) {
        count++;
      }
    }
    return count;
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
