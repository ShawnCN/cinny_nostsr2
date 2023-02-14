import localForage from 'localforage';
import { NostrEvent } from '../../types';

export const saveDirectsToLocal = (directs: Set<string>) => {
  localForage.setItem('directs', Array.from(directs));
};

export const saveMDirectsToLocal = (mdirects: Set<string>) => {
  localForage.setItem('mdirects', Array.from(mdirects));
};

export const savechannelProfileEventsToLocal = (channelProfileEvents: Map<string, NostrEvent>) => {
  const c = Array.from(channelProfileEvents.values());
  localForage.setItem('channelProfileEvents', c);
};

export const saveprofileEventsToLocal = (profileEvents: Map<string, NostrEvent>) => {
  const c = Array.from(profileEvents.values());
  localForage.setItem('profileEvents', c);
};
