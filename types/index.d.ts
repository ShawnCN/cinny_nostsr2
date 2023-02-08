import { string } from 'prop-types';
import React from 'react';

// declare module '*.svg' {
//   const content: React.FunctionComponent<React.SVGAttributes<SVGElement>>;
//   export default content;
// }

declare module '*.svg' {
  import * as React from 'react';

  const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;

  export default ReactComponent;
}

export type TEventFormat = {
  content: string;
  shortcut: string[];
  categorized: string[];
};
export type TContent = {
  body: string;
  external_url: string;
  format: string;
  formatted_body: string;
  msgtype: string;
};

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
