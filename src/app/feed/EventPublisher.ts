import { useSelector } from 'react-redux';
import * as secp from '@noble/secp256k1';

import { TaggedRawEvent } from '@snort/nostr';
import { EventKind, Tag, Event as NEvent, RelaySettings } from '@snort/nostr';
import { RootState } from 'State/Store';
import { HexKey, RawEvent, u256, UserMetadata, Lists } from '@snort/nostr';
import { bech32ToHex, unwrap } from 'Util';
import { DefaultRelays, HashtagRegex } from 'Const';
import { System } from 'System';

declare global {
  interface Window {
    nostr: {
      getPublicKey: () => Promise<HexKey>;
      signEvent: (event: RawEvent) => Promise<RawEvent>;
      getRelays: () => Promise<Record<string, { read: boolean; write: boolean }>>;
      nip04: {
        encrypt: (pubkey: HexKey, content: string) => Promise<string>;
        decrypt: (pubkey: HexKey, content: string) => Promise<string>;
      };
    };
  }
}

export default function useEventPublisher() {
  const pubKey = useSelector<RootState, HexKey | undefined>((s) => s.login.publicKey);
  const privKey = useSelector<RootState, HexKey | undefined>((s) => s.login.privateKey);
  const follows = useSelector<RootState, HexKey[]>((s) => s.login.follows);
  const relays = useSelector((s: RootState) => s.login.relays);
  const hasNip07 = 'nostr' in window;

  async function signEvent(ev: NEvent): Promise<NEvent> {
    if (hasNip07 && !privKey) {
      ev.Id = await ev.CreateId();
      const tmpEv = (await barrierNip07(() => window.nostr.signEvent(ev.ToObject()))) as RawEvent;
      return new NEvent(tmpEv as TaggedRawEvent);
    } else if (privKey) {
      await ev.Sign(privKey);
    } else {
      console.warn('Count not sign event, no private keys available');
    }
    return ev;
  }

  function processContent(ev: NEvent, msg: string) {
    const replaceNpub = (match: string) => {
      const npub = match.slice(1);
      try {
        const hex = bech32ToHex(npub);
        const idx = ev.Tags.length;
        ev.Tags.push(new Tag(['p', hex], idx));
        return `#[${idx}]`;
      } catch (error) {
        return match;
      }
    };
    const replaceNoteId = (match: string) => {
      try {
        const hex = bech32ToHex(match);
        const idx = ev.Tags.length;
        ev.Tags.push(new Tag(['e', hex, '', 'mention'], idx));
        return `#[${idx}]`;
      } catch (error) {
        return match;
      }
    };
    const replaceHashtag = (match: string) => {
      const tag = match.slice(1);
      const idx = ev.Tags.length;
      ev.Tags.push(new Tag(['t', tag.toLowerCase()], idx));
      return match;
    };
    const content = msg
      .replace(/@npub[a-z0-9]+/g, replaceNpub)
      .replace(/note[a-z0-9]+/g, replaceNoteId)
      .replace(HashtagRegex, replaceHashtag);
    ev.Content = content;
  }

  return {
    zap: async (author: HexKey, note?: HexKey, msg?: string) => {
      if (pubKey) {
        const ev = NEvent.ForPubKey(pubKey);
        ev.Kind = EventKind.ZapRequest;
        if (note) {
          ev.Tags.push(new Tag(['e', note], ev.Tags.length));
        }
        ev.Tags.push(new Tag(['p', author], ev.Tags.length));
        const relayTag = ['relays', ...Object.keys(relays)];
        ev.Tags.push(new Tag(relayTag, ev.Tags.length));
        processContent(ev, msg || '');
        return await signEvent(ev);
      }
    },

    newKey: () => {
      const privKey = secp.utils.bytesToHex(secp.utils.randomPrivateKey());
      const pubKey = secp.utils.bytesToHex(secp.schnorr.getPublicKey(privKey));
      return {
        privateKey: privKey,
        publicKey: pubKey,
      };
    },
  };
}

let isNip07Busy = false;

const delay = (t: number) => {
  return new Promise((resolve) => {
    setTimeout(resolve, t);
  });
};

export const barrierNip07 = async <T>(then: () => Promise<T>): Promise<T> => {
  while (isNip07Busy) {
    await delay(10);
  }
  isNip07Busy = true;
  try {
    return await then();
  } finally {
    isNip07Busy = false;
  }
};
