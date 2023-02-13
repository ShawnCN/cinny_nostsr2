import { Buffer } from 'buffer';
import * as bech32 from 'bech32-buffer'; /* eslint-disable-line @typescript-eslint/no-var-requires */
import { Debounce } from './common';
import { sha256 } from '@noble/hashes/sha256';
export const toNostrBech32Address = (address: string, prefix: string) => {
  if (!prefix) {
    throw new Error('prefix is required');
  }
  try {
    const decoded = bech32.decode(address);
    if (prefix !== decoded.prefix) {
      return null;
    }
    return bech32.encode(prefix, decoded.data);
  } catch (e) {
    // not a bech32 address
  }

  if (address.match(/^[0-9a-fA-F]{64}$/)) {
    const words = Buffer.from(address, 'hex');
    return bech32.encode(prefix, words);
  }
  return null;
};
export const toNostrHexAddress = (str: string): string | null => {
  if (str.match(/^[0-9a-fA-F]{64}$/)) {
    return str;
  }
  try {
    const { data } = bech32.decode(str);
    const addr = arrayToHex(data);
    return addr;
  } catch (e) {
    // not a bech32 address
  }
  return null;
};
function arrayToHex(array: any) {
  return Array.from(array, (byte: any) => {
    return ('0' + (byte & 0xff).toString(16)).slice(-2);
  }).join('');
}

export const defaultName = (address: string, prefix: string) => {
  return toNostrBech32Address(address, prefix)?.slice(5, 8);
};

export const getSubscriptionIdForName = (name: string) => {
  return arrayToHex(sha256(name)).slice(0, 8);
};
