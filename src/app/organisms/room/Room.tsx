import React, { useState, useEffect } from 'react';
import './Room.scss';

import initMatrix from '../../../client/InitMatrix';
import cons from '../../../client/state/cons';
import settings from '../../../client/state/settings';
import RoomTimeline from '../../../client/state/RoomTimeline';
import navigation from '../../../client/state/navigation';
import { openNavigation } from '../../../client/action/navigation';

import Welcome from '../welcome/Welcome';
import RoomView from './RoomView';
import RoomSettings from './RoomSettings';
import PeopleDrawer from './PeopleDrawer';

function Room() {
  const [roomInfo, setRoomInfo] = useState({
    roomTimeline: null as unknown as RoomTimeline,
    eventId: null as unknown as string,
  });
  const [isDrawer, setIsDrawer] = useState(settings.isPeopleDrawer);

  const mx = initMatrix.matrixClient;

  useEffect(() => {
    const handleRoomSelected = (rId: string, pRoomId: string, eId: string) => {
      console.log(`Room selected`);
      roomInfo.roomTimeline?.removeInternalListeners();
      if (mx.getRoom(rId)) {
        setRoomInfo({
          roomTimeline: new RoomTimeline(rId),
          eventId: eId ?? null,
        });
      } else {
        // TODO: add ability to join room if roomId is invalid
        setRoomInfo({
          roomTimeline: null as unknown as RoomTimeline,
          eventId: null as unknown as string,
        });
      }
    };

    navigation.on(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, handleRoomSelected);
    };
  }, [roomInfo]);

  useEffect(() => {
    const handleDrawerToggling = (visiblity) => setIsDrawer(visiblity);
    settings.on(cons.events.settings.PEOPLE_DRAWER_TOGGLED, handleDrawerToggling);
    return () => {
      settings.removeListener(cons.events.settings.PEOPLE_DRAWER_TOGGLED, handleDrawerToggling);
    };
  }, []);

  const { roomTimeline, eventId } = roomInfo;
  if (roomTimeline === null) {
    setTimeout(() => openNavigation());
    return <Welcome />;
  }

  return (
    <div className="room">
      <div className="room__content">
        <RoomSettings roomId={roomTimeline.roomId} roomType={roomTimeline.room.type} />
        <RoomView roomTimeline={roomTimeline} eventId={eventId} />
      </div>
      {isDrawer && <PeopleDrawer roomId={roomTimeline.roomId} />}
    </div>
  );
}

export default Room;
