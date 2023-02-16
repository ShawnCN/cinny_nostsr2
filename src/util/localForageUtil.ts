import localForage from 'localforage';
import { NostrEvent } from '../../types';
import SortedLimitedEventSet from '../../types/SortedLimitedEventSet';
import { Debounce } from './common';
const debounce = new Debounce();

export const saveDirectsToLocal = (directs: Set<string>) => {
  localForage.setItem('directs', Array.from(directs));
};

export const saveRoomsToLocal = (rooms: Set<string>) => {
  localForage.setItem('rooms', Array.from(rooms));
};

export const saveMDirectsToLocal = (mdirects: Set<string>) => {
  localForage.setItem('mdirects', Array.from(mdirects));
};

export const savechannelProfileEventsToLocal = (channelProfileEvents: Map<string, NostrEvent>) => {
  const c = Array.from(channelProfileEvents.values());
  localForage.setItem('channelProfileEvents', c);
};
export const savechannelProfileUpdateEventsToLocal = (
  channelProfileUpdateEvents: Map<string, NostrEvent>
) => {
  const c = Array.from(channelProfileUpdateEvents.values());
  localForage.setItem('channelProfileUpdateEvents', c);
};

export const saveProfileEventsToLocal = (profileEvents: Map<string, NostrEvent>) => {
  const c = Array.from(profileEvents.values());
  localForage.setItem('profileEvents', c);
};

export const saveChannelMessageEvents = (
  cMsgsByCid: Map<string, SortedLimitedEventSet>,
  eventsById: Map<string, NostrEvent>
) =>
  debounce._(() => {
    const cmsgs: NostrEvent[] = [];
    for (const set of cMsgsByCid.values()) {
      set.eventIds.forEach((eventId: any) => {
        cmsgs.push(eventsById.get(eventId)!);
      });
    }

    localForage.setItem('cmsgs', cmsgs);

    // TODO save own block and flag events
  }, 500)();
