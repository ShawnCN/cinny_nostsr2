import initMatrix from '../client/InitMatrix';

import HashIC from '../../public/res/ic/outlined/hash.svg';
import HashGlobeIC from '../../public/res/ic/outlined/hash-globe.svg';
import HashLockIC from '../../public/res/ic/outlined/hash-lock.svg';
import SpaceIC from '../../public/res/ic/outlined/space.svg';
import SpaceGlobeIC from '../../public/res/ic/outlined/space-globe.svg';
import SpaceLockIC from '../../public/res/ic/outlined/space-lock.svg';
import { NostrEvent } from '../../types';
import TEvent, { TContent, TEventFormat } from '../../types/TEvent';
import TRoomMember from '../../types/TRoomMember';
import { getEventHash, nip04, Relay, signEvent } from 'nostr-tools';
import TRoom from '../../types/TRoom';
import TUser from '../../types/TUser';
import { contectDetect, toNostrHexAddress } from './nostrUtil';
import { DEFAULT_RELAY_URLS } from '../client/state/cons';

const WELL_KNOWN_URI = '/.well-known/matrix/client';

export async function getBaseUrl(servername) {
  let protocol = 'https://';
  if (servername.match(/^https?:\/\//) !== null) protocol = '';
  const serverDiscoveryUrl = `${protocol}${servername}${WELL_KNOWN_URI}`;
  try {
    const result = await (await fetch(serverDiscoveryUrl, { method: 'GET' })).json();

    const baseUrl = result?.['m.homeserver']?.base_url;
    if (baseUrl === undefined) throw new Error();
    return baseUrl;
  } catch (e) {
    return `${protocol}${servername}`;
  }
}

export function getUsername(userId: string): string {
  const mx = initMatrix.matrixClient;
  const user = mx.getUser(userId);
  if (user === null) return userId;
  let username = user.displayName;
  if (typeof username === 'undefined') {
    username = userId;
  }
  return username;
}

export function getUsernameOfRoomMember(roomMember: TRoomMember): string {
  const profile = initMatrix.matrixClient.profiles.get(roomMember.userId);
  if (profile && profile.name && profile.name.length > 0) return profile.name;
  return roomMember.name || roomMember.userId;
}

export async function isRoomAliasAvailable(alias: string) {
  try {
    const result = await initMatrix.matrixClient.resolveRoomAlias(alias);
    if (result.room_id) return false;
    return false;
  } catch (e: any) {
    if (e.errcode === 'M_NOT_FOUND') return true;
    return false;
  }
}

export function getPowerLabel(powerLevel: number) {
  if (powerLevel > 9000) return 'Goku';
  if (powerLevel > 100) return 'founderId';
  if (powerLevel === 100) return 'Admin';
  if (powerLevel >= 50) return 'Mod';
  return null;
}

export function parseReply(rawBody) {
  if (rawBody?.indexOf('>') !== 0) return null;
  let body = rawBody.slice(rawBody.indexOf('<') + 1);
  const user = body.slice(0, body.indexOf('>'));

  body = body.slice(body.indexOf('>') + 2);
  const replyBody = body.slice(0, body.indexOf('\n\n'));
  body = body.slice(body.indexOf('\n\n') + 2);

  if (user === '') return null;

  const isUserId = user.match(/^@.+:.+/);

  return {
    userId: isUserId ? user : null,
    displayName: isUserId ? null : user,
    replyBody,
    body,
  };
}

export function trimHTMLReply(html) {
  if (!html) return html;
  const suffix = '</mx-reply>';
  const i = html.indexOf(suffix);
  if (i < 0) {
    return html;
  }
  return html.slice(i + suffix.length);
}

export function hasDMWith(userId: string) {
  const mx = initMatrix.matrixClient;
  const directIds = [...initMatrix.roomList.directs];

  // return directIds.find((roomId) => {
  //   const dRoom = mx.getRoom(roomId);
  //   const roomMembers = dRoom.getMembers();
  //   if (roomMembers.length <= 2 && dRoom.getMember(userId)) {
  //     return true;
  //   }
  //   return false;
  // });

  // 自定义
  return directIds.find((roomId) => {
    roomId == userId;
  });
}

export function joinRuleToIconSrc(joinRule, isSpace) {
  return (
    {
      restricted: () => (isSpace ? SpaceIC : HashIC),
      knock: () => (isSpace ? SpaceLockIC : HashLockIC),
      invite: () => (isSpace ? SpaceLockIC : HashLockIC),
      public: () => (isSpace ? SpaceGlobeIC : HashGlobeIC),
    }[joinRule]?.() || null
  );
}

// NOTE: it gives userId with minimum power level 50;
function getHighestPowerUserId(room) {
  const userIdToPower = room.currentState
    .getStateEvents('m.room.power_levels', '')
    ?.getContent().users;
  let powerUserId = null as unknown as string;
  if (!userIdToPower) return powerUserId;

  Object.keys(userIdToPower).forEach((userId) => {
    if (userIdToPower[userId] < 50) return;
    if (powerUserId === null) {
      powerUserId = userId;
      return;
    }
    if (userIdToPower[userId] > userIdToPower[powerUserId]) {
      powerUserId = userId;
    }
  });
  return powerUserId;
}

export function getIdServer(userId) {
  const idParts = userId.split(':');
  return idParts[1];
}

export function getServerToPopulation(room) {
  const members = room.getMembers();
  const serverToPop = {};

  members?.forEach((member) => {
    const { userId } = member;
    const server = getIdServer(userId);
    const serverPop = serverToPop[server];
    if (serverPop === undefined) {
      serverToPop[server] = 1;
      return;
    }
    serverToPop[server] = serverPop + 1;
  });

  return serverToPop;
}

export function genRoomVia(room) {
  const via: any = [];
  const userId = getHighestPowerUserId(room);
  if (userId) {
    const server = getIdServer(userId);
    if (server) via.push(server);
  }
  const serverToPop = getServerToPopulation(room);
  const sortedServers = Object.keys(serverToPop).sort(
    (svrA, svrB) => serverToPop[svrB] - serverToPop[svrA]
  );
  const mostPop3 = sortedServers.slice(0, 3);
  if (via.length === 0) return mostPop3;
  if (mostPop3.includes(via[0])) {
    mostPop3.splice(mostPop3.indexOf(via[0]), 1);
  }
  return via.concat(mostPop3.slice(0, 2));
}

export function isCrossVerified(deviceId) {
  try {
    const mx = initMatrix.matrixClient;
    const crossSignInfo = mx.getStoredCrossSigningForUser(mx.getUserId());
    const deviceInfo = mx.getStoredDevice(mx.getUserId(), deviceId);
    const deviceTrust = crossSignInfo.checkDeviceTrust(crossSignInfo, deviceInfo, false, true);
    return deviceTrust.isCrossSigningVerified();
  } catch {
    // device does not support encryption
    return null;
  }
}

export function hasCrossSigningAccountData() {
  const mx = initMatrix.matrixClient;
  const masterKeyData = mx.getAccountData('m.cross_signing.master');
  return !!masterKeyData;
}

export function getDefaultSSKey() {
  const mx = initMatrix.matrixClient;
  try {
    return mx.getAccountData('m.secret_storage.default_key').getContent().key;
  } catch {
    return undefined;
  }
}

export function getSSKeyInfo(key) {
  const mx = initMatrix.matrixClient;
  try {
    return mx.getAccountData(`m.secret_storage.key.${key}`).getContent();
  } catch {
    return undefined;
  }
}

export async function hasDevices(userId) {
  const mx = initMatrix.matrixClient;
  try {
    const usersDeviceMap = await mx.downloadKeys([userId, mx.getUserId()]);
    return Object.values(usersDeviceMap).every(
      (userDevices) => Object.keys(userDevices).length > 0
    );
  } catch (e) {
    console.error("Error determining if it's possible to encrypt to all users: ", e);
    return false;
  }
}

export const formatGlobalMsg = (
  event: NostrEvent
  // pubkey: string,
  // relayUrl: string
) => {
  const now = Math.floor(Date.now() / 1000);
  const event_time = event.created_at;
  // if (now - event_time < -600) return;
  /**
   * @param Array<string> events_replied_to [引帖的eventid]
   */

  const { events_replied_to, pubkeys_replied_to } = FormatCitedEventsAndCitedPubkeys(event);
  let parent = 'globalfeed';
  let replyingTo = '';
  if (events_replied_to[0] && events_replied_to.length > 0) {
    replyingTo = events_replied_to[events_replied_to.length - 1];
    // array_of_replies.push([event.id, replyingTo]);
  }
  let content = event.content.replace(/&/g, '&#38;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let shortened_content = content.replace(/\n/g, ' ').substring(0, 400);
  // shortened_content = DOMPurify.sanitize(shortened_content);
  shortened_content = shortened_content;
  if (content.length > 50) {
    shortened_content = shortened_content + '...';
  }

  // content = DOMPurify.sanitize(content);

  // const color = getColor(event.pubkey);
  // let citedMsg = {} as TCitedMsg | null;
  // if (replyingTo != '') {
  //   citedMsg = findCitedMsgFromLocalStorage(replyingTo, parent, pubkey);
  // }

  let contentObject: TContent = {
    body: content,
    msgtype: 'm.text',
  };

  let msg: TEventFormat = {
    // color,
    content: contentObject,
    type: 'm.room.message',
    // replyingTo,
    // message: content,
    // kind: event.kind,
    // relayUrl: relayUrl,
    origin_server_ts: event_time,
    sender: event.pubkey,
    event_id: event.id,
    room_id: parent, // 母帖eventid或者是聊天室id
  };
  // if (citedMsg) {
  //   msg['citedMsg'] = citedMsg;
  // }
  return msg;
};

export const findParent = (event: NostrEvent, meId: string) => {
  let parent = event.pubkey;
  if (event.pubkey === meId) {
    const ptagUser = event.tags.find((tag) => tag[0] === 'p')?.[1];
    if (!ptagUser) return null;
    parent = ptagUser;
    return parent;
    // user = event.tags.find((tag) => tag[0] === 'p')?.[1] || user;
  } else {
    const forMe = event.tags.some((tag) => tag[0] === 'p' && tag[1] === meId);
    if (!forMe) {
      return null;
    }
  }
};
export const formatDmMsgFromOthersOrMe = async (event: NostrEvent, user: TUser, parent: string) => {
  // let otherKey = '';
  // if (event.pubkey == user.userId) {
  //   for (let i = 0; i < event.tags.length; i++) {
  //     if (event['tags'][i][0] == 'p' && (!otherKey || otherKey == '')) {
  //       otherKey = event['tags'][i][1];
  //       break;
  //     } else {
  //       otherKey = event.pubkey;
  //     }
  //   }
  // } else {
  //   otherKey = event.pubkey;
  // }
  // const parent = otherKey;
  let events_replied_to: string[] = [];
  let pubkeys_replied_to: string[] = [];
  let replyingTo = '';
  for (let i = 0; i < event.tags.length; i++) {
    if (event['tags'][i][0] == 'e') {
      events_replied_to.push(event['tags'][i][1]);
    }
    if (event['tags'][i][0] == 'p') {
      pubkeys_replied_to.push(event['tags'][i][1]);
    }
  }
  if (events_replied_to[0]) {
    replyingTo = events_replied_to[0];
  }

  const content = await decryptContent(user, event);
  // content = content.replace(/&/g, '&#38;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const dContent = contectDetect(content);
  const msgs = convertToMatrixContent(dContent, event, parent);
  return msgs;
  //If the current message is already in the message cache, return, otherwise add to the number of unread messages
  // let citedMsg = {} as TCitedMsg | null;
  // if (replyingTo != '') {
  //   citedMsg = findCitedMsgFromLocalStorage(replyingTo, parent, user.pubkey);
  // }
  // let contentObject: TContent = {
  //   body: content,
  //   msgtype: 'm.text',
  // };
  // let msg: TEventFormat = {
  //   content: contentObject,
  //   type: 'm.room.message',
  //   origin_server_ts: event_time,
  //   sender: event.pubkey,
  //   event_id: event.id,
  //   room_id: parent, // 母帖eventid或者是聊天室id
  // };
  // return msg;
};

export const formatChannelMsg = (event: NostrEvent) => {
  const event_time = event.created_at;
  const { events_replied_to, pubkeys_replied_to } = FormatCitedEventsAndCitedPubkeys(event);
  let parent = '';
  let replyingTo = '';
  if (events_replied_to[0] && events_replied_to.length > 1) {
    replyingTo = events_replied_to[events_replied_to.length - 1];
  }
  if (events_replied_to[0]) {
    parent = events_replied_to[0]; // root event.id
  }
  const content = contectDetect(event.content);
  const msgs = convertToMatrixContent(content, event, parent);
  return msgs;
  // let content = event.content.replace(/&/g, '&#38;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // let shortened_content = content.replace(/\n/g, ' ').substring(0, 400);
  // shortened_content = shortened_content;
  // if (content.length > 50) {
  //   shortened_content = shortened_content + '...';
  // }
  // array_of_replies.forEach(function (item) {
  //   if (item[0] == event.id) {
  //     let replyPubkey = event.pubkey;
  //     if (event.pubkey in namemap && namemap[event.pubkey] != 'none') {
  //       let person_name = event.pubkey;
  //     } else {
  //       let person_name = replyPubkey.substring(0, 15);
  //     }
  //   }
  // });

  // let citedMsg = {} as TCitedMsg | null;
  // if (replyingTo != '') {
  //   citedMsg = findCitedMsgFromLocalStorage(replyingTo, parent, pubkey);
  // }
};

const convertToMatrixContent = (
  content: { text: string; imgs: string[] },
  event: NostrEvent,
  parent: string
) => {
  let msgs = [] as TEventFormat[];
  let contentObject: TContent = {
    body: content.text,
    msgtype: 'm.text',
  };
  let msg = {
    content: contentObject,
    type: 'm.room.message' as const,
    origin_server_ts: event.created_at,
    sender: event.pubkey,
    event_id: event.id,
    room_id: parent, // 母帖eventid或者是聊天室id
  };
  if (content.text.length > 0) msgs.push(msg);

  if (content.imgs.length == 0) return msgs;
  content.imgs.forEach((imgUrl) => {
    let imgObject: TContent = {
      // info: {
      //   mimetype: 'image/png',
      //   size: 494,
      //   w: 43,
      //   h: 54,
      //   'xyz.amorgan.blurhash': 'UMSr}._MMKyX%fRQXSnOyCMeyCR5n5tlR6kq',
      // },
      msgtype: 'm.image',
      body: imgUrl,
      url: imgUrl,
    };
    let msg2 = {
      content: imgObject,
      type: 'm.room.message' as const,
      origin_server_ts: event.created_at,
      sender: event.pubkey,
      event_id: event.id,
      room_id: parent, // 母帖eventid或者是聊天室id}
    };
    msgs.unshift(msg2);
  });
  return msgs;
};

export const decryptContent = async (user: TUser, event: NostrEvent) => {
  let sk2 = user.privatekey;
  let pk1 = '';
  if (event.pubkey == user.userId) {
    //说明消息是作者自己发的。
    // const sender = event.tags.find(([k, v]) => k === 'p' && v && v !== '')[1];
    const sender = event.tags.find((tag) => tag[0] == 'p' && tag[1] && tag[1] != '');
    if (sender) {
      pk1 = sender[1];
    }
  } else {
    pk1 = event.pubkey;
  }
  let plaintext = '';
  try {
    // @ts-ignore
    if (window.nostr) {
      // @ts-ignore
      plaintext = await window.nostr.nip04.decrypt(pk1, event.content);
    } else if (sk2) {
      plaintext = await nip04.decrypt(sk2, pk1, event.content);
    }
    return plaintext;
  } catch (err) {
    plaintext = event.content;

    return plaintext;
  }
};

export const FormatCitedEventsAndCitedPubkeys = (event: NostrEvent) => {
  let events_replied_to = [] as string[];
  let pubkeys_replied_to = [] as string[];
  for (let i = 0; i < event.tags.length; i++) {
    if (event['tags'][i][0] == 'e') {
      events_replied_to.push(event['tags'][i][1]);
    }
    if (event['tags'][i][0] == 'p') {
      pubkeys_replied_to.push(event['tags'][i][1]);
    }
  }
  return {
    events_replied_to,
    pubkeys_replied_to,
  };
};

export const getChannelIdfromEvent = (event: NostrEvent) => {};

export function formatRoomMemberFromNostrEvent(event: NostrEvent) {
  const { name, about, picture } = JSON.parse(event.content);
  let member = new TRoomMember(event.pubkey);
  if (name && name != '') {
    member.name = name;
  }
  if (about && about != '') {
    member.about = about;
  }
  if (picture && picture != '') {
    member.avatarSrc = picture;
  }
  return member;
}
export const fetchContacts = async (relay: Relay, pubkey: string) => {
  const filter = {
    authors: [
      // pubkey
      '46060722131ab09a10c410b9522605aee09ce8ff363145f4319f7461ca57f276',
    ],
    kinds: [3],
    limit: 1,
  };
  if (!relay || relay.status !== 1) return null;
  const sub = relay.sub([filter]);
  const contact = new Promise<NostrEvent>((resolve, reject) => {
    let tevent = {} as NostrEvent;
    sub.on('event', (event: NostrEvent) => {
      initMatrix.matrixClient.handleEvent(event);
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
};

export const fetchUserMetaFromRelay = async (pubkey: string, relay: Relay) => {
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
};
export const fetchUsersMetaFromRelay = async (pubkeys: string[], relay: Relay) => {
  if (!relay || relay.status != 1) return null;
  const filter = { authors: pubkeys, kinds: [0], limit: 500 };
  const sub = relay.sub([filter]);
  let aevent = {} as NostrEvent;
  const event = new Promise<NostrEvent>((resolve, reject) => {
    sub.on('event', (event: NostrEvent) => {
      aevent = event;
      initMatrix.matrixClient.handleEvent(event);
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
};

export const fetchChannelMetaFromRelay = async (channelId: string, relay: Relay) => {
  if (!relay || relay.status != 1) return null;
  const filter = {
    ids: [channelId],
    kinds: [40],
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

export function formatRoomFromNostrEvent(channelId: string, event: NostrEvent) {
  const room = new TRoom(channelId, 'groupChannel');
  const { name, about, picture } = JSON.parse(event.content);
  if (name && name != '') {
    room.name = name;
  }
  if (about && about != '') {
    room.canonical_alias = about;
  }
  if (picture && picture != '') {
    room.avatarUrl = picture;
  }
  return room;
}

export const formatDMEvent = async (
  inputMessage: string,
  roomId: string,
  // replyBox: TCitedMsg,
  user: TUser,
  citedEvtId?: string | null
) => {
  const sk1 = user.privatekey;
  let pk1 = user.userId;
  // receiver
  // let sk2 = generatePrivateKey()
  let pk2 = roomId;
  // on the sender side
  let ciphertext = 'unknown...';
  // @ts-ignore
  if (window.nostr) {
    // @ts-ignore
    ciphertext = await window.nostr.nip04.encrypt(pk2, inputMessage);
  } else if (sk1) {
    ciphertext = await nip04.encrypt(sk1, pk2, inputMessage);
  } else {
    console.log('send dm failed');
  }

  let tags = [['p', pk2]] as string[][];
  let event = {
    pubkey: pk1,
    created_at: Math.floor(Date.now() / 1000),
    kind: 4,
    tags,
    content: ciphertext,
  } as NostrEvent;

  if (citedEvtId) {
    const id = toNostrHexAddress(citedEvtId)!;
    const replyingTo = initMatrix.matrixClient.eventsById.get(id);
    if (replyingTo) {
      // event.tags = replyingTo.tags.filter((tag) => tag[0] === 'p');
      let rootTag = replyingTo.tags.find((t) => t[0] === 'e' && t[3] === 'root');
      if (!rootTag) {
        rootTag = replyingTo.tags.find((t) => t[0] === 'e');
      }
      if (rootTag) {
        event.tags.unshift(['e', id, DEFAULT_RELAY_URLS[0], 'reply']);
        event.tags.unshift(['e', rootTag[1], DEFAULT_RELAY_URLS[0], 'root']);
      } else {
        event.tags.unshift(['e', id, DEFAULT_RELAY_URLS[0], 'root']);
      }
      // if (!event.tags.find((t) => t[0] === 'p' && t[1] === replyingTo.pubkey)) {
      //   event.tags.push(['p', replyingTo.pubkey]);
      // }
    }
  }
  event = await getSignedEvent(event, user.privatekey);
  return event;
};

export const formatChannelEvent = async (
  inputMessage: string,
  roomId: string,
  // replyBox: TCitedMsg,
  user: TUser,
  citedEvtId?: string | null
) => {
  // const url = relayinst.url;
  let tags = [['e', roomId, DEFAULT_RELAY_URLS[0]]] as string[][];
  let event = {
    kind: 42,
    created_at: Math.floor(Date.now() / 1000),
    // tags: [['e', '25e5c82273a271cb1a840d0060391a0bf4965cafeb029d5ab55350b418953fbb', url.toString()], ['e', 'dd526a59faa6d5291d3aa3a0e28e655a98fc371545936094ffc089097e608552', url.toString()], ['p', user.pubkey, url.toString()]],
    tags,
    content: inputMessage,
    pubkey: user.userId,
  } as NostrEvent;
  if (citedEvtId) {
    const id = toNostrHexAddress(citedEvtId)!;
    const replyingTo = initMatrix.matrixClient.eventsById.get(id);
    if (replyingTo) {
      let rootTag = replyingTo.tags.find((t) => t[0] === 'e' && t[3] === 'root' && t[1] !== roomId);
      if (!rootTag) {
        rootTag = replyingTo.tags.find((t) => t[0] === 'e' && t[1] !== roomId);
      }
      if (rootTag) {
        event.tags.push(['e', id, DEFAULT_RELAY_URLS[0], 'reply']);
        event.tags.push(['e', rootTag[1], DEFAULT_RELAY_URLS[0], 'root']);
      } else {
        event.tags.push(['e', id, DEFAULT_RELAY_URLS[0], 'root']);
      }
      const citedPTags = replyingTo.tags.filter((tag) => tag[0] === 'p');
      event.tags.concat(citedPTags);
      if (!citedPTags.find((t) => t[0] === 'p' && t[1] === replyingTo.pubkey)) {
        event.tags.push(['p', replyingTo.pubkey]);
      }
    }
  }

  console.log('11111111111111111111111111', event);
  event = await getSignedEvent(event, user?.privatekey);

  return event;
};

export const getSignedEvent = async (event: NostrEvent, privateKey: string | undefined) => {
  event.id = getEventHash(event);
  // @ts-ignore
  if (window.nostr) {
    // @ts-ignore
    const signedEvent = await window?.nostr.signEvent(event);
    if (typeof signedEvent == 'string') {
      event.sig = signedEvent;
    } else {
      event.sig = signedEvent.sig;
    }
  } else if (privateKey) {
    event.sig = signEvent(event, privateKey);
  } else {
    console.log('something wrong');
  }
  return event;
};

export const getRelayStatus = (relay: Relay) => {
  try {
    return relay.status;
  } catch (e) {
    return 3;
  }
};

export function invertColor(hex, bw) {
  const reg = /^#[0-9A-F]{6}$/i.test(hex);
  if (!reg) {
    hex = 'f9f5e9';
  }
  if (hex.indexOf('#') === 0) {
    hex = hex.slice(1);
  }
  // convert 3-digit hex to 6-digits.
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  if (hex.length !== 6) {
    throw new Error('Invalid HEX color.');
  }
  var r = parseInt(hex.slice(0, 2), 16),
    g = parseInt(hex.slice(2, 4), 16),
    b = parseInt(hex.slice(4, 6), 16);
  if (bw) {
    // https://stackoverflow.com/a/3943023/112731
    return r * 0.299 + g * 0.587 + b * 0.114 > 186 ? '#000000' : '#FFFFFF';
  }
  // invert color components
  r = (255 - r).toString(16);
  g = (255 - g).toString(16);
  b = (255 - b).toString(16);
  // pad each with zeros and return
  return '#' + padZero(r) + padZero(g) + padZero(b);
}
export const initialDMroom = (userId: string, me: TUser) => {
  let aroom = new TRoom(userId, 'single');
  aroom.init();
  const member = new TRoomMember(userId);
  member.init();
  aroom.addMember(member);
  let me2 = new TRoomMember(me.userId);
  me2.name = me.displayName;
  me2.avatarSrc = me.avatarUrl;
  aroom.addMember(me2);
  return aroom;
};
export const initialChannelroom = (roomId: string, me: TUser) => {
  let aroom = new TRoom(roomId, 'groupChannel');
  aroom.init();
  let me2 = new TRoomMember(me.userId);
  me2.name = me.displayName;
  me2.avatarSrc = me.avatarUrl;
  aroom.addMember(me2);
  return aroom;
};
