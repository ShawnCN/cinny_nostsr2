import localForage from 'localforage';

export const saveDirectsToLocal = (directs: Set<string>) => {
  localForage.setItem('directs', Array.from(directs));
};

export const saveMDirectsToLocal = (mdirects: Set<string>) => {
  localForage.setItem('mdirects', Array.from(mdirects));
};
