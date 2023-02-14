import { Event, Filter, getEventHash, nip19, Relay, relayInit, Sub } from 'nostr-tools';
import { NostrEvent, SearchResultUser, Subscription, TSubscribedChannel } from '../../types';
import TDevice from '../../types/TDevice';
import TEvent from '../../types/TEvent';
import TRoom from '../../types/TRoom';
import TRoomMember from '../../types/TRoomMember';
import TUser from '../../types/TUser';
import * as bech32 from 'bech32-buffer';
import localForage from 'localforage';
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
  getSignedEvent,
} from '../util/matrixUtil';
import {
  defaultName,
  toNostrBech32Address,
  toNostrHexAddress,
  getSubscriptionIdForName,
} from '../util/nostrUtil';
import EventEmitter from './EventEmitter';
import { aevent2, defaultChatroomList, stage3relays, TChannelMapList } from './state/cons';
import { Debounce } from '../util/common';
import SortedLimitedEventSet from '../../types/SortedLimitedEventSet';
import { savechannelProfileEventsToLocal, saveprofileEventsToLocal } from '../util/localForageUtil';
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
  profileEvents: Map<string, any>;
  profiles: Map<string, any>;
  channelProfiles: Map<
    string,
    { name: string; about: string; picture: string; created_at: number }
  >;

  channelProfileEvents: Map<string, any>;
  contactList: Set<string>;
  contactEvents: Map<string, any>; //my contacts, or someone added my to his/her contacts.

  localStorageLoaded: boolean;
  directMessagesByUser: Map<string, SortedLimitedEventSet>;
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
    this.profileEvents = new Map<string, any>();
    this.channelProfileEvents = new Map<string, any>();
    this.profiles = new Map<string, any>();
    this.user.userId = userId;
    this.user.displayName = defaultName(userId, 'npub')!;
    this.user.privatekey = privkey!;
    this.localStorageLoaded = false;
    this.contactList = new Set();
    this.subscriptionId = 0;
    this.contactEvents = new Map();

    this.directMessagesByUser = new Map<string, SortedLimitedEventSet>();
    this.subscriptionsByName = new Map<string, Set<Sub>>();
    this.subscribedFiltersByName = new Map<string, Filter[]>();
    this.subscriptions = new Map<number, Subscription>();
    this.subscribedUsers = new Set<string>();
    this.subscribedProfiles = new Set<string>();
    this.publicRoomList = new Map();
    this.relayInstance = new Map();
    this.subscribedChannels = new Set<string>();
    this.subscribedChannelProfiles = new Map<string, any>();
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
        room.init();
        room.roomId = subscribed_channels[i].user_id;
        this.publicRoomList.set(room.roomId, room);
        // this.matrixClient.subChannelMessage(room.roomId);
      } else if (subscribed_channels[i].type == 'single') {
        let room = new TRoom(subscribed_channels[i].user_id, 'single');
        room.init();
        room.roomId = subscribed_channels[i].user_id;
        this.publicRoomList.set(room.roomId, room);
      } else if (subscribed_channels[i].type == 'groupRelay') {
      }
    }
  }

  async initCrypto() {
    console.log('initCrypto');
    await this.loadLocalStorageEvents();
  }
  async startClient({ lazyLoadMembers: boolean }) {
    console.log('startClient');
    for (let i = 0; i < stage3relays.length; i++) {
      const pubkey = '33333';
      await this.connectAndJoin(stage3relays[i], pubkey);
      // this.addRelay(stage3relays[i]);
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
    if (roomId.substring(0, 4) == 'npub') {
      const aroom = new TRoom(roomId, 'single');

      aroom.init();
      this.publicRoomList.set(roomId, aroom);
      return aroom;
    } else {
      const aroom = new TRoom(roomId, 'groupChannel');
      aroom.init();
      this.publicRoomList.set(roomId, aroom);
      return aroom;
    }
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
    const profile = this.profiles.get(userId);
    if (profile) {
      cb(profile);
      return;
    }
    const nostrEvent = await this.fetchUserMeta(userId);
    if (nostrEvent) {
      const profile = JSON.parse(nostrEvent.content);
      profile.created_at = nostrEvent.created_at;
      this.profiles.set(userId, profile);
      this.profileEvents.set(userId, nostrEvent);
      saveprofileEventsToLocal(this.profileEvents);
      cb(profile);
    }
  }

  async getChannelInfoWithCB(channelId: string, cb: (profile: any) => void) {
    const profile = this.channelProfiles.get(channelId);
    if (profile) {
      cb(profile);
      return;
    }
    const nostrEvent = await this.fetchChannelMeta(channelId);
    if (nostrEvent) {
      const profile = JSON.parse(nostrEvent.content);
      profile.created_at = nostrEvent.created_at;
      this.channelProfiles.set(channelId, profile);
      this.channelProfileEvents.set(channelId, nostrEvent);
      savechannelProfileEventsToLocal(this.channelProfileEvents);
      cb(profile);
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
    // let { type, data } = nip19.decode(userId);
    // if (type != 'npub') throw new Error('Invalid user ID');
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
      // gives lots of cors errors:
      // console.error(error);
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
        console.log('not found', relay.url);
        continue;
      }
      console.log('start searching', relay.url);
      const a = await fetchChannelMetaFromRelay(roomId, relay);

      if (!a || Object.keys(a).length == 0) {
        console.log('not found', relay.url);
        continue;
      }
      this.handleChannelMetaEvent(a);
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
      const nostrEvent = await formatDMEvent(c, roomId, this.user);
      // this.sendMsgToSingle(nostEvent);
      console.log('2', c);
      this.publishEvent(nostrEvent);
    } else if (type === 'groupChannel') {
      const nostrEvent = await formatChannelEvent(c, roomId, this.user);
      // this.sendMsgToGroupChannel(nostrEvent);
      this.publishEvent(nostrEvent);
    } else if ((type = 'groupRelay')) {
    }
  }
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
  getContactList = (user: string, cb?: (followedUsers: Set<string>) => void) => {
    const callback = () => {
      cb?.(this.contactList ?? new Set());
    };
    this.contactList.size > 0 && callback();
    this.subscribe([{ kinds: [3], authors: [user] }], callback);
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

  getSyncState() {
    console.log('get sync state');
    return 'getSyncState';
  }
  getPushActionsForEvent(mEvent) {
    return 'actions';
  }
  subGlobalMessages = () => {
    // for (let [k, relay] of this.relayInstance) {
    const filter = {
      kinds: [1],
      limit: 20,
    };
    //   if (!relay) return;
    //   const sub = relay.sub([filter]);
    //   sub.on('event', async (event: NostrEvent) => {
    //     this.handleEvent(event);
    //   });
    // }

    this.sendSubToRelays([filter], 'subGlobalMessages');
  };
  subChannelMessage = (channelId: string[]) => {
    // for (let [k, relay] of this.relayInstance) {
    const filter = {
      kinds: [42],
      '#e': channelId,
      limit: 13,
    };
    //   if (!relay || relay.status != 1) continue;
    //   const sub = relay.sub([filter]);
    //   sub.on('event', (event: NostrEvent) => {
    //     console.log(event);
    //     this.handleEvent(event);
    //   });
    // }
    this.sendSubToRelays([filter], 'subChannelMessage');
  };
  subDmFromStranger = () => {
    const pubkey = this.user.userId;
    // for (let [k, relay] of this.relayInstance) {
    //   const filter = {
    //     kinds: [4],
    //     '#p': [pubkey],
    //     limit: 30,
    //   };

    //   if (!relay || relay.status != 1) continue;
    //   // updateUsermap(store, pubkey);
    //   const sub = relay.sub([filter]);
    //   sub.on('event', async (event: NostrEvent) => {
    //     this.handleEvent(event);
    //   });
    //   sub.on('eose', () => {
    //     // sub.unsub();
    //     // console.log('sub dm from stanger eose')
    //   });
    // }

    const filter = {
      kinds: [4],
      '#p': [pubkey],
      limit: 30,
    };
    this.sendSubToRelays([filter], 'subDmFromStranger');
  };

  fetchChannelsMeta = debounce._((channels: string[]) => {
    console.log('subscribeToRepliesAndLikes', this.subscribedChannels);
    const filters: Filter[] = [
      {
        ids: channels,
        kinds: [40],
      },
    ];
    this.sendSubToRelays(filters, 'subscribedChannels', true);
  }, 500);
  fetchChannelMetaFromRelay = async (channelId: string, relay: Relay) => {
    if (!relay || relay.status != 1) return null;
    const filter = {
      ids: [channelId],
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
          console.log('not found...');
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
      console.log('111', relay.url);
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

    console.log(this.subscriptionsByName);
    console.log(this.subscribedFiltersByName);
  };
  subscribeToProfiles = debounce._(() => {
    const now = Math.floor(Date.now() / 1000);
    const myPub = this.user.userId;
    const contacts = Array.from(this.contactList);
    console.log('subscribe to', contacts.length, 'contacts');

    this.sendSubToRelays([{ authors: contacts, kinds: [0] }], 'subscribedProfiles', true);
  }, 1000);
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
        console.log('not found', relay.url);
        continue;
      }
      console.log('start searching', relay.url);
      const a = await fetchUserMetaFromRelay(user_id, relay);
      if (a && Object.keys(a).length > 1) {
        return a;
      } else {
        console.log('not found', relay.url);
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
        console.log('not found', relay.url);
        continue;
      }
      console.log('start searching', relay.url);
      const a = await fetchChannelMetaFromRelay(user_id, relay);
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
      console.log('future event', event.created_at);
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
    const mevent = formatChannelMsg(event);
    const mc = new TEvent(mevent);
    this.emit('Event.decrypted', mc);
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
      room.init();
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
  handleMetaEvent(event: Event) {
    try {
      const existing = this.profiles.get(event.pubkey);

      if (!existing?.created_at || existing?.created_at >= event.created_at) {
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
        this.localStorageLoaded && this.saveLocalStorageProfilesAndContact(this);
      }
    } catch (e) {
      console.log('error parsing nostr profile', e, event);
    }
  }
  handleChannelMetaEvent = (event: NostrEvent) => {
    console.log('handleChannelMetaEvent', event.content);
    try {
      const existing = this.channelProfiles.get(event.pubkey);
      if (!existing?.created_at || existing?.created_at >= event.created_at) {
        return false;
      }
      const profile = JSON.parse(event.content);
      profile.created_at = event.created_at;
      delete profile['nip05valid']; // not robust
      this.channelProfiles.set(event.pubkey, profile);
      const existingEvent = this.channelProfileEvents.get(event.pubkey);
      if (!existingEvent || existingEvent.created_at < event.created_at) {
        this.channelProfileEvents.set(event.pubkey, event);
        savechannelProfileEventsToLocal(this.channelProfileEvents);
      }
    } catch (e) {
      console.log('error parsing nostr profile', e, event);
    }
  };
  handleContactEvents = (event: NostrEvent) => {
    const existing = this.contactEvents.get(event.pubkey);
    if (existing && existing.created_at >= event.created_at) {
      return;
    }
    if (event.pubkey === this.user.userId) {
      this.localStorageLoaded && this.saveLocalStorageProfilesAndContact();
    }
    if (event.tags && event.pubkey === this.user.userId) {
      this.contactList.clear();
      for (const tag of event.tags) {
        if (Array.isArray(tag) && tag[0] === 'p') {
          this.contactList.add(tag[1]);
        }
      }
    }
  };
  loadLocalStorageEvents = async () => {
    const latestMsgs = await localForage.getItem('latestMsgs');
    const latestMsgsByEveryone = await localForage.getItem('latestMsgsByEveryone');
    const contactEvents = await localForage.getItem('contactEvents');
    const profileEvents = await localForage.getItem('profileEvents');
    const notificationEvents = await localForage.getItem('notificationEvents');
    const eventsById = await localForage.getItem('eventsById');
    const dms = await localForage.getItem('dms');
    const keyValueEvents = await localForage.getItem('keyValueEvents');
    this.localStorageLoaded = true;
    if (Array.isArray(contactEvents)) {
      contactEvents.forEach((e) => this.handleEvent(e));
    }
    if (Array.isArray(profileEvents)) {
      profileEvents.forEach((e) => this.handleEvent(e));
    }
    if (Array.isArray(latestMsgs)) {
      latestMsgs.forEach((msg) => {
        this.handleEvent(msg);
      });
    }
    if (Array.isArray(latestMsgsByEveryone)) {
      latestMsgsByEveryone.forEach((msg) => {
        this.handleEvent(msg);
      });
    }
    if (Array.isArray(notificationEvents)) {
      notificationEvents.forEach((msg) => {
        this.handleEvent(msg);
      });
    }
    if (Array.isArray(dms)) {
      dms.forEach((msg) => {
        this.handleEvent(msg);
      });
    }
    if (Array.isArray(keyValueEvents)) {
      keyValueEvents.forEach((msg) => {
        this.handleEvent(msg);
      });
    }
  };

  saveLocalStorageProfilesAndContact = debounce._(() => {
    const profileEvents = Array.from(this.profileEvents.values());
    const contactEvents = Array.from(this.contactEvents.values()).filter((e: NostrEvent) => {
      return (
        e.pubkey === this.user.userId || this.contactEvents.get(this.user.userId)?.has(e.pubkey)
      );
    });
    console.log('saving', profileEvents.length + contactEvents.length, 'events to local storage');
    localForage.setItem('profileEvents', profileEvents);
    localForage.setItem('contactEvents', contactEvents);
  }, 5000);
  restoreDefaultRelays() {
    this.relayInstance.clear();
    for (const url of stage3relays) {
      this.addRelay(url);
    }
    this.saveRelaysToContacts();
    // do not save these to contact list
    // for (const url of SEARCH_RELAYS) {
    //   if (!this.relayInstance.has(url)) this.addRelay(url);
    // }
  }
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
