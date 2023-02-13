import { string } from 'prop-types';
import React from 'react';

import { Filter, Relay, relayInit, Sub, Event } from 'nostr-tools';
// declare module '*.svg' {
//   const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
//   export default content;
// }

declare module '*.svg' {
  import * as React from 'react';

  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;

  export default ReactComponent;
}

export type TSearchQuery = {
  name?: string;
  homeserver?: string;
  alias?: string;
  error?: string;
};

export type TSubscribedChannel = {
  user_id: string;
  type: string;
  unread: number;
  new_message: string;
  new_message_created_at: number;
  relayUrlList?: string[];
};
export type TChannelmapObject = {
  [key: string]: TChannelmap;
};
export type TChannelmap = {
  user_id: string;
  name?: string;
  type?: string;
  about?: string;
  profile_img?: string;
  query_time: number;
  creatorPubkey: string;
  created_at: number;
  sig: string;
  relayUrl?: url;
};

export type NostrEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: Array<Array<string>>;
  content: string;
  sig: string;
};

export type TSpaceContent = {};

export type SearchResultUser = {
  user_id: string;
  display_name: string;
  avatarUrl: string;
};

export type TRoomType = 'single' | 'groupChannels' | 'groupRelay';

export type Subscription = {
  filters: Filter[];
  callback?: (event: Event) => void;
};
