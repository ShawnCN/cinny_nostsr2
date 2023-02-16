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
  openSettings,
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

      <div className="relay_signal" onClick={openSettings}>
        <div>
          {' '}
          <svg
            fill={count > 0 ? 'green' : 'currentColor'}
            height="16px"
            width="16px"
            viewBox="0 0 512 512"
          >
            <g>
              <g>
                <g>
                  <path d="m256 150.5c-41.353 0-75-33.647-75-75s33.647-75 75-75 75 33.647 75 75-33.647 75-75 75z"></path>
                </g>
                <g>
                  <path d="m10.026 429c-20.669-35.815-8.35-81.768 27.466-102.451 36.551-21.085 82.083-7.806 102.451 27.451 20.722 35.87 8.44 81.717-27.451 102.451-35.96 20.737-81.757 8.396-102.466-27.451z"></path>
                </g>
                <g>
                  <path d="m399.508 456.451c-35.867-20.721-48.185-66.561-27.451-102.451 20.367-35.256 65.898-48.537 102.451-27.451 35.815 20.684 48.135 66.636 27.466 102.451-20.683 35.802-66.455 48.218-102.466 27.451z"></path>
                </g>
              </g>
              <g>
                <path d="m61.293 275.587-29.941-1.641c3.896-70.957 41.807-136.641 101.396-175.723l16.465 25.078c-51.665 33.883-84.522 90.821-87.92 152.286z"></path>
              </g>
              <g>
                <path d="m450.707 275.587c-3.398-61.465-36.255-118.403-87.92-152.285l16.465-25.078c59.59 39.082 97.5 104.766 101.396 175.723z"></path>
              </g>
              <g>
                <path d="m256 511.5c-35.684 0-69.8-8.115-101.426-24.097l13.535-26.777c54.785 27.715 120.996 27.715 175.781 0l13.535 26.777c-31.625 15.982-65.741 24.097-101.425 24.097z"></path>
              </g>
            </g>
          </svg>
        </div>
        <small style={{ color: count > 0 ? 'green' : 'black' }}>{count}</small>
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
