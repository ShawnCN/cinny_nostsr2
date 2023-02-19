/* eslint-disable import/prefer-default-export */
import { useEffect, useRef } from 'react';
import TEvent from '../../../types/TEvent';

export function useStore(...args) {
  const itemRef = useRef<TEvent>(null as unknown as TEvent);

  const getItem = () => {
    return itemRef.current;
  };

  const setItem = (event: TEvent) => {
    itemRef.current = event;
    return itemRef.current;
  };

  useEffect(() => {
    itemRef.current = null as unknown as TEvent;
    return () => {
      itemRef.current = null as unknown as TEvent;
    };
  }, args);

  return { getItem, setItem };
}
