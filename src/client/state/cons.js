const cons = {
  version: '0.2.1',
  secretKey: {
    ACCESS_TOKEN: 'cinny_access_token',
    deviceId: 'cinny_deviceId',
    USER_ID: 'cinny_user_id',
    BASE_URL: 'cinny_hs_base_url',
  },
  DEVICE_DISPLAY_NAME: 'Cinny Web',
  IN_CINNY_SPACES: 'in.cinny.spaces',
  tabs: {
    HOME: 'home',
    DIRECTS: 'dm',
  },
  supportEventTypes: [
    'm.room.create',
    'm.room.message',
    'm.room.encrypted',
    'm.room.member',
    'm.sticker',
  ],
  notifs: {
    DEFAULT: 'default',
    ALL_MESSAGES: 'all_messages',
    MENTIONS_AND_KEYWORDS: 'mentions_and_keywords',
    MUTE: 'mute',
  },
  status: {
    PRE_FLIGHT: 'pre-flight',
    IN_FLIGHT: 'in-flight',
    SUCCESS: 'success',
    ERROR: 'error',
  },
  actions: {
    navigation: {
      SELECT_TAB: 'SELECT_TAB',
      SELECT_SPACE: 'SELECT_SPACE',
      SELECT_ROOM: 'SELECT_ROOM',
      OPEN_SPACE_SETTINGS: 'OPEN_SPACE_SETTINGS',
      OPEN_SPACE_MANAGE: 'OPEN_SPACE_MANAGE',
      OPEN_SPACE_ADDEXISTING: 'OPEN_SPACE_ADDEXISTING',
      TOGGLE_ROOM_SETTINGS: 'TOGGLE_ROOM_SETTINGS',
      OPEN_SHORTCUT_SPACES: 'OPEN_SHORTCUT_SPACES',
      OPEN_INVITE_LIST: 'OPEN_INVITE_LIST',
      OPEN_PUBLIC_ROOMS: 'OPEN_PUBLIC_ROOMS',
      OPEN_CREATE_ROOM: 'OPEN_CREATE_ROOM',
      OPEN_JOIN_ALIAS: 'OPEN_JOIN_ALIAS',
      OPEN_INVITE_USER: 'OPEN_INVITE_USER',
      OPEN_PROFILE_VIEWER: 'OPEN_PROFILE_VIEWER',
      OPEN_SETTINGS: 'OPEN_SETTINGS',
      OPEN_EMOJIBOARD: 'OPEN_EMOJIBOARD',
      OPEN_READRECEIPTS: 'OPEN_READRECEIPTS',
      OPEN_VIEWSOURCE: 'OPEN_VIEWSOURCE',
      CLICK_REPLY_TO: 'CLICK_REPLY_TO',
      OPEN_SEARCH: 'OPEN_SEARCH',
      OPEN_REUSABLE_CONTEXT_MENU: 'OPEN_REUSABLE_CONTEXT_MENU',
      OPEN_NAVIGATION: 'OPEN_NAVIGATION',
      OPEN_REUSABLE_DIALOG: 'OPEN_REUSABLE_DIALOG',
      OPEN_EMOJI_VERIFICATION: 'OPEN_EMOJI_VERIFICATION',
    },
    room: {
      JOIN: 'JOIN',
      LEAVE: 'LEAVE',
      CREATE: 'CREATE',
    },
    accountData: {
      CREATE_SPACE_SHORTCUT: 'CREATE_SPACE_SHORTCUT',
      DELETE_SPACE_SHORTCUT: 'DELETE_SPACE_SHORTCUT',
      MOVE_SPACE_SHORTCUTS: 'MOVE_SPACE_SHORTCUTS',
      CATEGORIZE_SPACE: 'CATEGORIZE_SPACE',
      UNCATEGORIZE_SPACE: 'UNCATEGORIZE_SPACE',
    },
    settings: {
      TOGGLE_SYSTEM_THEME: 'TOGGLE_SYSTEM_THEME',
      TOGGLE_MARKDOWN: 'TOGGLE_MARKDOWN',
      TOGGLE_PEOPLE_DRAWER: 'TOGGLE_PEOPLE_DRAWER',
      TOGGLE_MEMBERSHIP_EVENT: 'TOGGLE_MEMBERSHIP_EVENT',
      TOGGLE_NICKAVATAR_EVENT: 'TOGGLE_NICKAVATAR_EVENT',
      TOGGLE_NOTIFICATIONS: 'TOGGLE_NOTIFICATIONS',
      TOGGLE_NOTIFICATION_SOUNDS: 'TOGGLE_NOTIFICATION_SOUNDS',
    },
  },
  events: {
    navigation: {
      TAB_SELECTED: 'TAB_SELECTED',
      SPACE_SELECTED: 'SPACE_SELECTED',
      ROOM_SELECTED: 'ROOM_SELECTED',
      SPACE_SETTINGS_OPENED: 'SPACE_SETTINGS_OPENED',
      SPACE_MANAGE_OPENED: 'SPACE_MANAGE_OPENED',
      SPACE_ADDEXISTING_OPENED: 'SPACE_ADDEXISTING_OPENED',
      ROOM_SETTINGS_TOGGLED: 'ROOM_SETTINGS_TOGGLED',
      SHORTCUT_SPACES_OPENED: 'SHORTCUT_SPACES_OPENED',
      INVITE_LIST_OPENED: 'INVITE_LIST_OPENED',
      PUBLIC_ROOMS_OPENED: 'PUBLIC_ROOMS_OPENED',
      CREATE_ROOM_OPENED: 'CREATE_ROOM_OPENED',
      JOIN_ALIAS_OPENED: 'JOIN_ALIAS_OPENED',
      INVITE_USER_OPENED: 'INVITE_USER_OPENED',
      SETTINGS_OPENED: 'SETTINGS_OPENED',
      PROFILE_VIEWER_OPENED: 'PROFILE_VIEWER_OPENED',
      EMOJIBOARD_OPENED: 'EMOJIBOARD_OPENED',
      READRECEIPTS_OPENED: 'READRECEIPTS_OPENED',
      VIEWSOURCE_OPENED: 'VIEWSOURCE_OPENED',
      REPLY_TO_CLICKED: 'REPLY_TO_CLICKED',
      SEARCH_OPENED: 'SEARCH_OPENED',
      REUSABLE_CONTEXT_MENU_OPENED: 'REUSABLE_CONTEXT_MENU_OPENED',
      NAVIGATION_OPENED: 'NAVIGATION_OPENED',
      REUSABLE_DIALOG_OPENED: 'REUSABLE_DIALOG_OPENED',
      EMOJI_VERIFICATION_OPENED: 'EMOJI_VERIFICATION_OPENED',
    },
    roomList: {
      ROOMLIST_UPDATED: 'ROOMLIST_UPDATED',
      INVITELIST_UPDATED: 'INVITELIST_UPDATED',
      ROOM_JOINED: 'ROOM_JOINED',
      ROOM_LEAVED: 'ROOM_LEAVED',
      ROOM_CREATED: 'ROOM_CREATED',
      ROOM_PROFILE_UPDATED: 'ROOM_PROFILE_UPDATED',
    },
    accountData: {
      SPACE_SHORTCUT_UPDATED: 'SPACE_SHORTCUT_UPDATED',
      CATEGORIZE_SPACE_UPDATED: 'CATEGORIZE_SPACE_UPDATED',
    },
    notifications: {
      NOTI_CHANGED: 'NOTI_CHANGED',
      FULL_READ: 'FULL_READ',
      MUTE_TOGGLED: 'MUTE_TOGGLED',
    },
    roomTimeline: {
      READY: 'READY',
      EVENT: 'EVENT',
      PAGINATED: 'PAGINATED',
      TYPING_MEMBERS_UPDATED: 'TYPING_MEMBERS_UPDATED',
      LIVE_RECEIPT: 'LIVE_RECEIPT',
      EVENT_REDACTED: 'EVENT_REDACTED',
      AT_BOTTOM: 'AT_BOTTOM',
      SCROLL_TO_LIVE: 'SCROLL_TO_LIVE',
    },
    roomsInput: {
      MESSAGE_SENT: 'MESSAGE_SENT',
      ATTACHMENT_SET: 'ATTACHMENT_SET',
      FILE_UPLOADED: 'FILE_UPLOADED',
      UPLOAD_PROGRESS_CHANGES: 'UPLOAD_PROGRESS_CHANGES',
      FILE_UPLOAD_CANCELED: 'FILE_UPLOAD_CANCELED',
      ATTACHMENT_CANCELED: 'ATTACHMENT_CANCELED',
    },
    settings: {
      SYSTEM_THEME_TOGGLED: 'SYSTEM_THEME_TOGGLED',
      MARKDOWN_TOGGLED: 'MARKDOWN_TOGGLED',
      PEOPLE_DRAWER_TOGGLED: 'PEOPLE_DRAWER_TOGGLED',
      MEMBERSHIP_EVENTS_TOGGLED: 'MEMBERSHIP_EVENTS_TOGGLED',
      NICKAVATAR_EVENTS_TOGGLED: 'NICKAVATAR_EVENTS_TOGGLED',
      NOTIFICATIONS_TOGGLED: 'NOTIFICATIONS_TOGGLED',
      NOTIFICATION_SOUNDS_TOGGLED: 'NOTIFICATION_SOUNDS_TOGGLED',
    },
  },
};

Object.freeze(cons);

export const DEFAULT_RELAY_URLS = [
  'wss://nostr-pub.wellorder.net',
  'wss://nos.lol',
  'wss://node01.nostress.cc',
  ' wss://nostr.orangepill.dev',
  'wss://jiggytom.ddns.net',
  // 'wss://eden.nostr.land',
  'wss://nostr.fmt.wiz.biz',
  'wss://relay.nostr.info',
  'wss://offchain.pub',
  'wss://relay.nostr.ch',

  // 'wss://nostr.zebedee.cloud',
  // 'wss://nostr-relay.lnmarkets.com',
  // 'wss://nostr.rdfriedl.com',
  // 'wss://no.str.cr',
  // 'wss://relay.farscapian.com',
  // 'wss://relay.oldcity-bitcoiners.info',
  // 'wss://nostr.fly.dev',
  // 'wss://relay.cryptocculture.com',
  // 'wss://nostr-verified.wellorder.net',
  'wss://relay.damus.io',
  // 'wss://nostr.drss.io',
  // 'wss://nostr-relay.untethr.me',
  // 'wss://nostr-relay.freeberty.net',
  // 'wss://relay.minds.com/nostr/v1/ws',
];

export const defaultChatroomList = [
  // {
  //   user_id: 'globalfeed',
  //   type: 'groupRelay',
  //   unread: 0,
  //   new_message: '',
  //   new_message_created_at: 0,
  // },
  // {
  //   user_id: 'c8d3eb756902f5c99e47c370d4a252fcadbb3b7c0026f489b35ffcf93654e3b6',
  //   type: 'groupChannel',
  //   unread: 0,
  //   new_message: '',
  //   new_message_created_at: 0,
  // },
  {
    user_id: 'aa82def2a4110b491eb1874138b7eb97514c53be43627babe25e5c15660aff3d',
    type: 'groupChannel',
    unread: 0,
    new_message: '',
    new_message_created_at: 0,
  },
  // {
  //   user_id: '25e5c82273a271cb1a840d0060391a0bf4965cafeb029d5ab55350b418953fbb',
  //   type: 'groupChannel',
  //   unread: 0,
  //   new_message: '',
  //   new_message_created_at: 0,
  // },
  // 通天塔
  // {
  //   user_id: '94296622149f6390fec39b7802edcff9d00b67e812409c236f6094580a5c3e2d',
  //   type: 'groupChannel',
  //   unread: 0,
  //   new_message: '',
  //   new_message_created_at: 0,
  // },
  // test95
  // {
  //   user_id: 'c1c8dd309cdd75033fea7c284822d6b2721ad82ff18dfd5f454ec9c7c1d7a4ec',
  //   type: 'groupChannel',
  //   unread: 0,
  //   new_message: '',
  //   new_message_created_at: 0,
  // },
  // {
  //   user_id: '8cad0528c52c538d344a1b44955169e008956d8b4e3a4a51d670954f9c026e5c',
  //   type: 'groupChannel',
  //   unread: 0,
  //   new_message: '',
  //   new_message_created_at: 0,
  // },
];

export const TChannelMapList = {
  globalfeed: {
    user_id: 'globalfeed',
    type: 'groupRelay',
    name: 'Global',
    about: '',
    profile_img: 'https://picsum.photos/seed/picsum/200',
    query_time: 0,
    created_at: 0,
    creatorPubkey: '',
    sig: '',
  },
  ['aa82def2a4110b491eb1874138b7eb97514c53be43627babe25e5c15660aff3d']: {
    user_id: 'aa82def2a4110b491eb1874138b7eb97514c53be43627babe25e5c15660aff3d',
    type: 'groupChannel',
    name: 'NostrCN',
    about:
      'Nostr是一个无许可的、去中心化的内容协议。拥有私钥即可在任何Nostr客户端上对内容进行访问和编辑。Own your key. Own you content.',
    profile_img: 'https://i.ibb.co/yh1jTXH/Fl-Eo-JPTWAAA8-Io.jpg',
    query_time: 0,
    creatorPubkey: '9d76a2ac373fc751f3467317f2dd4c3a847bedc53fcd9d7c52ff278a127b6f2e',
    created_at: 1672645767,
    sig: 'not found',
  },
  ['25e5c82273a271cb1a840d0060391a0bf4965cafeb029d5ab55350b418953fbb']: {
    user_id: '25e5c82273a271cb1a840d0060391a0bf4965cafeb029d5ab55350b418953fbb',
    type: 'groupChannel',
    name: 'Nostr',
    about: '',
    created_at: 1661333723,
    profile_img:
      'https://cloudflare-ipfs.com/ipfs/QmTN4Eas9atUULVbEAbUU8cowhtvK7g3t7jfKztY7wc8eP?.png',
    creatorPubkey: 'ed1d0e1f743a7d19aa2dfb0162df73bacdbc699f67cc55bb91a98c35f7deac69',
    query_time: 0,
    sig: '',
  },
};

export const aevent1 = {
  content: {
    body: 'Enjoy profitable forex/cryptocurrency income and earn up to $30,000.00 within 5 days, not only interested people should ask me how\nhttps://t.me/+BQlhudqWXGk1MWY0',
    msgtype: 'm.text',
  },
  origin_server_ts: 1675900869516,
  sender: '@antonio_michelle:matrix.org',
  type: 'm.room.message',
  unsigned: {
    age: 7308744,
    'm.relations': {
      'm.annotation': {
        chunk: [
          {
            type: 'm.reaction',
            key: '🚨 scam! 🚨',
            count: 1,
          },
        ],
      },
    },
  },
  event_id: '$jzDWSfx4SkJTLJsqf2yyV8KKuWxFggzmdpJzhg9uiF0',
  room_id: 'globalfeed',
};

export const aevent2 = {
  content: {
    body: "That is likely a scam and what we call 'too good to be true'. For more information go to https://www.sec.gov/oiea/investor-alerts-and-bulletins/digital-asset-and-crypto-investment-scams-investor-alert and https://www.youtube.com/watch?v=gFWaA7mt9oM\n[!mods !modhelp]",
    msgtype: 'm.text',
    membership: 'join',
  },
  origin_server_ts: 1675900877044,
  sender: '@anti-scam:matrix.org',
  type: 'm.room.message',
  unsigned: {
    age: 7301216,
  },
  event_id: '$OX7fHIuYRHZeY29MEAl4PriMt03tV1uZobOa8XLsEso',
  room_id: 'globalfeed',
};

export const aevent3 = {
  content: {
    body: '> <Calvin> Tapi agak geli liatnya, cowok keliatan udel 😭\n\nKnp? kan sexyy 😘',
    external_url: 'https://t.me/GenshinImpact_ID/7589109',
    format: 'org.matrix.custom.html',
    formatted_body:
      "<mx-reply><blockquote><a href='https://matrix.to/#/!AGeUOyHpLMMrLYAkXW:matrix.org/$Bu1vZBKx37Bv7BdedZ0787jhbaIsIT7Y1FNXc-InMVo'>In reply to</a> <a href='https://matrix.to/#/@telegram_1021191853:t2bot.io'>Calvin</a><br/>Tapi agak geli liatnya, cowok keliatan udel 😭</blockquote></mx-reply>Knp? kan sexyy 😘",
    'm.relates_to': {
      'm.in_reply_to': {
        event_id: '$Bu1vZBKx37Bv7BdedZ0787jhbaIsIT7Y1FNXc-InMVo',
      },
    },
    msgtype: 'm.text',
  },
  origin_server_ts: 1675924832000,
  sender: '@telegram_5185363675:t2bot.io',
  type: 'm.room.message',
  unsigned: {},
  event_id: '$x8t7Tl_iV-XUbOiWtQ5ylsM0ih6MYiaWlXszvwq1dDI',
  room_id: 'globalfeed',
};

export const aevent4 = {
  content: {
    body: '😶 (face without mouth)',
    external_url: 'https://t.me/GenshinImpact_ID/7589111',
    info: {
      h: 245,
      mimetype: 'image/png',
      size: 29527,
      thumbnail_info: {
        h: 245,
        mimetype: 'image/png',
        size: 29527,
        w: 256,
      },
      thumbnail_url: 'mxc://t2bot.io/4ca145ee94608c5fbb5bb9e1e1e8d645159c2eaf',
      w: 256,
    },
    'm.relates_to': {
      'm.in_reply_to': {
        event_id: '$JMbYXteW5anWnMa6MgsAm2ddPYMcMLS2WNm7-Ipcnss',
      },
    },
    url: 'mxc://t2bot.io/4ca145ee94608c5fbb5bb9e1e1e8d645159c2eaf',
  },
  origin_server_ts: 1675924863000,
  sender: '@telegram_5091542766:t2bot.io',
  type: 'm.sticker',
  unsigned: {},
  event_id: '$vgT4WXssfha4H4uKNvU1zAt3C4rsbuHRBr42AS0pQR0',
  room_id: '!AGeUOyHpLMMrLYAkXW:matrix.org',
};

export const log = console.log.bind(console);

export default cons;

export const REJECT_INVITE_DAYS = 180;
export const CHATGPT_BOT = 'fb2e2d071b5d37972a8ce155170eaab8041f7a5aac674d57ea9b3bb079db14c2';
export const SUPPORT_SERVICE = '2cdbae5a14281406a0add7239aaf8146f85fb1acea15debd128a7bd9610efc8b';
