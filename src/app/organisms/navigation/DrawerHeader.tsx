import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './DrawerHeader.scss';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/InitMatrix';
import cons from '../../../client/state/cons';
import {
  openPublicRooms,
  openCreateRoom,
  openSpaceManage,
  openJoinAlias,
  openSpaceAddExisting,
  openInviteUser,
  openReusableContextMenu,
} from '../../../client/action/navigation';
import { getEventCords } from '../../../util/common';

import { blurOnBubbling } from '../../atoms/button/script';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import IconButton from '../../atoms/button/IconButton';
import { MenuItem, MenuHeader } from '../../atoms/context-menu/ContextMenu';
import SpaceOptions from '../../molecules/space-options/SpaceOptions';

import PlusIC from '../../../../public/res/ic/outlined/plus.svg';
import HashPlusIC from '../../../../public/res/ic/outlined/hash-plus.svg';
import HashGlobeIC from '../../../../public/res/ic/outlined/hash-globe.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';
import SpacePlusIC from '../../../../public/res/ic/outlined/space-plus.svg';
import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import Icons from '../../../Icons';

interface IPropsHomeSpaceOptions {
  spaceId?: string;
  afterOptionSelect: () => void;
}
export function HomeSpaceOptions({
  spaceId = null as unknown as string,
  afterOptionSelect,
}: IPropsHomeSpaceOptions) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(spaceId);
  const canManage = room
    ? room.currentState.maySendStateEvent('m.space.child', mx.getUserId())
    : true;

  return (
    <>
      <MenuHeader>Add rooms or friends</MenuHeader>
      {/* <MenuItem
        iconSrc={SpacePlusIC}
        onClick={() => {
          afterOptionSelect();
          openCreateRoom(true, spaceId);
        }}
        disabled={!canManage}
      >
        Create new space
      </MenuItem> */}
      <MenuItem
        iconSrc={HashPlusIC}
        onClick={() => {
          afterOptionSelect();
          openCreateRoom(false, spaceId);
        }}
        disabled={!canManage}
      >
        Create new room
      </MenuItem>
      {!spaceId && (
        <MenuItem
          iconSrc={HashGlobeIC}
          onClick={() => {
            afterOptionSelect();
            openPublicRooms();
          }}
        >
          Explore public rooms
        </MenuItem>
      )}
      {!spaceId && (
        <MenuItem
          iconSrc={HashGlobeIC}
          onClick={() => {
            afterOptionSelect();
            openInviteUser();
          }}
        >
          Start DM
        </MenuItem>
      )}
      {/* {!spaceId && (
        <MenuItem
          iconSrc={PlusIC}
          onClick={() => {
            afterOptionSelect();
            openJoinAlias();
          }}
        >
          Join with address
        </MenuItem>
      )} */}
      {spaceId && (
        <MenuItem
          iconSrc={PlusIC}
          onClick={() => {
            afterOptionSelect();
            openSpaceAddExisting(spaceId);
          }}
          disabled={!canManage}
        >
          Add existing
        </MenuItem>
      )}
      {spaceId && (
        <MenuItem
          onClick={() => {
            afterOptionSelect();
            openSpaceManage(spaceId);
          }}
          iconSrc={HashSearchIC}
        >
          Manage rooms
        </MenuItem>
      )}
    </>
  );
}

interface IPropsDrawerHeader {
  selectedTab: string;
  spaceId?: string;
}

function DrawerHeader({ selectedTab, spaceId = null as unknown as string }: IPropsDrawerHeader) {
  const mx = initMatrix.matrixClient;
  const tabName = selectedTab !== cons.tabs.DIRECTS ? 'Home' : 'Direct messages';

  const isDMTab = selectedTab === cons.tabs.DIRECTS;
  const room = mx.getRoom(spaceId);
  const spaceName = isDMTab ? null : room?.name || null;

  const openSpaceOptions = (e) => {
    e.preventDefault();
    openReusableContextMenu('bottom', getEventCords(e, '.header'), (closeMenu) => (
      <SpaceOptions roomId={spaceId} afterOptionSelect={closeMenu} />
    ));
  };

  const openHomeSpaceOptions = (e) => {
    e.preventDefault();
    openReusableContextMenu('right', getEventCords(e, '.ic-btn'), (closeMenu) => (
      <HomeSpaceOptions spaceId={spaceId} afterOptionSelect={closeMenu} />
    ));
  };
  const [count, setCount] = useState(0);
  useEffect(() => {
    const interval = setInterval(
      () => setCount(initMatrix.matrixClient.getConnectedRelayCount()),
      2000
    );

    return () => clearInterval(interval);
  }, []);

  return (
    <Header>
      {spaceName ? (
        <button
          className="drawer-header__btn"
          onClick={openSpaceOptions}
          type="button"
          onMouseUp={(e) => blurOnBubbling(e, '.drawer-header__btn')}
        >
          <TitleWrapper>
            <Text variant="s1" weight="medium" primary>
              {twemojify(spaceName)}
            </Text>
          </TitleWrapper>
          <RawIcon size="small" src={ChevronBottomIC} />
        </button>
      ) : (
        <TitleWrapper>
          <Text variant="s1" weight="medium" primary>
            {tabName}
          </Text>
        </TitleWrapper>
      )}

      {/* {isDMTab && (
        <IconButton onClick={() => openInviteUser()} tooltip="Start DM" src={PlusIC} size="small" />
      )}
      {!isDMTab && (
        <IconButton
          onClick={openHomeSpaceOptions}
          tooltip="Add rooms/spaces"
          src={PlusIC}
          size="small"
        />
      )} */}

      <div className="flex">
        {' '}
        <small>
          <span className={`icon`}>{Icons.network}</span>
          <span>{count}</span>
        </small>
      </div>

      <IconButton
        onClick={openHomeSpaceOptions}
        tooltip="Add rooms/spaces"
        src={PlusIC}
        size="small"
      />
    </Header>
  );
}

export default DrawerHeader;
