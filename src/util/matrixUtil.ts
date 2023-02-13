import initMatrix from '../client/InitMatrix';

import HashIC from '../../public/res/ic/outlined/hash.svg';
import HashGlobeIC from '../../public/res/ic/outlined/hash-globe.svg';
import HashLockIC from '../../public/res/ic/outlined/hash-lock.svg';
import SpaceIC from '../../public/res/ic/outlined/space.svg';
import SpaceGlobeIC from '../../public/res/ic/outlined/space-globe.svg';
import SpaceLockIC from '../../public/res/ic/outlined/space-lock.svg';
import { NostrEvent } from '../../types';
import { TContent, TEventFormat } from '../../types/TEvent';
import TRoomMember from '../../types/TRoomMember';
import { getEventHash, nip04, Relay, signEvent } from 'nostr-tools';
import TRoom from '../../types/TRoom';
import TUser from '../../types/TUser';

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
  if (powerLevel > 100) return 'Founder';
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

  return directIds.find((roomId) => {
    const dRoom = mx.getRoom(roomId);
    const roomMembers = dRoom.getMembers();
    if (roomMembers.length <= 2 && dRoom.getMember(userId)) {
      return true;
    }
    return false;
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
export const formatDmMsgFromOthersOrMe = async (event: NostrEvent, user: TUser) => {
  let otherKey = '';
  if (event.pubkey == user.userId) {
    for (let i = 0; i < event.tags.length; i++) {
      if (event['tags'][i][0] == 'p' && (!otherKey || otherKey == '')) {
        otherKey = event['tags'][i][1];
        break;
      } else {
        otherKey = event.pubkey;
      }
    }
  } else {
    otherKey = event.pubkey;
  }
  const parent = otherKey;
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

  const event_time = event.created_at;

  let content = await decryptContent(user, event);
  content = content.replace(/&/g, '&#38;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  //If the current message is already in the message cache, return, otherwise add to the number of unread messages
  // let citedMsg = {} as TCitedMsg | null;
  // if (replyingTo != '') {
  //   citedMsg = findCitedMsgFromLocalStorage(replyingTo, parent, user.pubkey);
  // }
  let contentObject: TContent = {
    body: content,
    msgtype: 'm.text',
  };
  let msg: TEventFormat = {
    content: contentObject,
    type: 'm.room.message',
    origin_server_ts: event_time,
    sender: event.pubkey,
    event_id: event.id,
    room_id: parent, // 母帖eventid或者是聊天室id
  };

  return msg;
};

export const formatChannelMsg = (event: NostrEvent) => {
  const event_time = event.created_at;
  const { events_replied_to, pubkeys_replied_to } = FormatCitedEventsAndCitedPubkeys(event);

  let parent = '';
  let replyingTo = '';
  if (events_replied_to[0] && events_replied_to.length > 1) {
    replyingTo = events_replied_to[events_replied_to.length - 1];
    // array_of_replies.push([event.id, replyingTo]);
  }
  if (events_replied_to[0] && event.kind == 42) {
    parent = events_replied_to[0]; // root event.id
  }
  let content = event.content.replace(/&/g, '&#38;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let shortened_content = content.replace(/\n/g, ' ').substring(0, 400);
  shortened_content = shortened_content;
  if (content.length > 50) {
    shortened_content = shortened_content + '...';
  }
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

  return msg;
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

const FormatCitedEventsAndCitedPubkeys = (event: NostrEvent) => {
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

export const fetchChannelMetaFromRelay = async (channelId: string, relay: Relay) => {
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
  user: TUser
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
  // if (replyBox.pubkey && replyBox.pubkey.length > 0) {
  //   const replyTags = [
  //     ['p', replyBox.pubkey.toString()],
  //     ['e', replyBox.evtId.toString()],
  //   ];
  //   tags = [...tags, ...replyTags];
  //   // "tags"       : [ [ 'p', pubkey ], [ 'e', id_of_post_being_replied_to ] ],
  // }

  let event = {
    pubkey: pk1,
    created_at: Math.floor(Date.now() / 1000),
    kind: 4,
    tags,
    content: ciphertext,
  } as NostrEvent;
  console.log(event);
  event = await getSignedEvent(event, user.privatekey);
  console.log(event);
  return event;
};
export const formatChannelEvent = async (
  inputMessage: string,
  roomId: string,
  // replyBox: TCitedMsg,
  user: TUser
) => {
  // const url = relayinst.url;
  let tags = [
    [
      'e',
      // '25e5c82273a271cb1a840d0060391a0bf4965cafeb029d5ab55350b418953fbb',
      roomId,
      // url.toString(),
    ],
  ] as string[][];
  // if (replyBox.pubkey && replyBox.pubkey.length > 0) {
  //   tags = [
  //     [
  //       'e',
  //       // '25e5c82273a271cb1a840d0060391a0bf4965cafeb029d5ab55350b418953fbb',
  //       roomId,
  //       // url.toString(),
  //     ],
  //     [
  //       'e',
  //       replyBox.evtId.toString(),
  //       // url.toString()
  //     ],
  //     ['p', replyBox.pubkey.toString()],
  //   ];
  // }
  let event = {
    kind: 42,
    created_at: Math.floor(Date.now() / 1000),
    // tags: [['e', '25e5c82273a271cb1a840d0060391a0bf4965cafeb029d5ab55350b418953fbb', url.toString()], ['e', 'dd526a59faa6d5291d3aa3a0e28e655a98fc371545936094ffc089097e608552', url.toString()], ['p', user.pubkey, url.toString()]],
    tags,
    content: inputMessage,
    pubkey: user.userId,
  } as NostrEvent;
  console.log(event);
  event = await getSignedEvent(event, user?.privatekey);
  console.log(event);

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
