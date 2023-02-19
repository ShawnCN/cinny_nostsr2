import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/InitMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectRoom, openReusableContextMenu } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

import {
  getUsername,
  getUsernameOfRoomMember,
  getPowerLabel,
  hasDMWith,
  hasDevices,
} from '../../../util/matrixUtil';
import { getEventCords } from '../../../util/common';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Chip from '../../atoms/chip/Chip';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import Avatar from '../../atoms/avatar/Avatar';
import Button from '../../atoms/button/Button';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';
import PowerLevelSelector from '../../molecules/power-level-selector/PowerLevelSelector';
import Dialog from '../../molecules/dialog/Dialog';

import ShieldEmptyIC from '../../../../public/res/ic/outlined/shield-empty.svg';
import ChevronRightIC from '../../../../public/res/ic/outlined/chevron-right.svg';
import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import { useForceUpdate } from '../../hooks/useForceUpdate';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import TRoom from '../../../../types/TRoom';
import { SearchResultUser } from '../../../../types';
import { defaultName, toNostrBech32Address } from '../../../util/nostrUtil';
import TDevice from '../../../../types/TDevice';

function ModerationTools({ roomId, userId }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const roomMember = room.getMember(userId);

  const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel || 0;
  const powerLevel = roomMember?.powerLevel || 0;
  const canIKick =
    roomMember?.membership === 'join' &&
    room.currentState.hasSufficientPowerLevelFor('kick', myPowerLevel) &&
    powerLevel < myPowerLevel;
  const canIBan =
    ['join', 'leave'].includes(roomMember?.membership) &&
    room.currentState.hasSufficientPowerLevelFor('ban', myPowerLevel) &&
    powerLevel < myPowerLevel;

  const handleKick = (e) => {
    e.preventDefault();
    const kickReason = e.target.elements['kick-reason']?.value.trim();
    roomActions.kick(roomId, userId, kickReason !== '' ? kickReason : undefined);
  };

  const handleBan = (e) => {
    e.preventDefault();
    const banReason = e.target.elements['ban-reason']?.value.trim();
    roomActions.ban(roomId, userId, banReason !== '' ? banReason : undefined);
  };

  return (
    <div className="moderation-tools">
      {canIKick && (
        <form onSubmit={handleKick}>
          <Input label="Kick reason" name="kick-reason" />
          <Button type="submit">Kick</Button>
        </form>
      )}
      {canIBan && (
        <form onSubmit={handleBan}>
          <Input label="Ban reason" name="ban-reason" />
          <Button type="submit">Ban</Button>
        </form>
      )}
    </div>
  );
}
ModerationTools.propTypes = {
  roomId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

function SessionInfo({ userId }: { userId: string }) {
  const [devices, setDevices] = useState<TDevice[]>(null as unknown as TDevice[]);
  const [isVisible, setIsVisible] = useState(false);
  const mx = initMatrix.matrixClient;

  useEffect(() => {
    let isUnmounted = false;

    async function loadDevices() {
      try {
        await mx.downloadKeys([userId], true);
        const myDevices = mx.getStoredDevicesForUser(userId);

        if (isUnmounted) return;
        setDevices(myDevices);
      } catch {
        setDevices([]);
      }
    }
    loadDevices();

    return () => {
      isUnmounted = true;
    };
  }, [userId]);

  function renderSessionChips() {
    if (!isVisible) return null;
    return (
      <div className="session-info__chips">
        {devices === null && <Text variant="b2">Loading sessions...</Text>}
        {devices?.length === 0 && <Text variant="b2">No session found.</Text>}
        {devices !== null &&
          devices.map((device) => (
            <Chip
              key={device.deviceId}
              iconSrc={ShieldEmptyIC}
              text={device.getDisplayName() || device.deviceId}
            />
          ))}
      </div>
    );
  }

  return (
    <div className="session-info">
      <MenuItem
        onClick={() => setIsVisible(!isVisible)}
        iconSrc={isVisible ? ChevronBottomIC : ChevronRightIC}
      >
        <Text variant="b2">{`View ${
          devices?.length > 0 ? `${devices.length} ` : ''
        }sessions`}</Text>
      </MenuItem>
      {renderSessionChips()}
    </div>
  );
}

interface IPropsProfileFooter {
  roomId: string;
  userId: string;
  onRequestClose: () => void;
}
function ProfileFooter({ roomId, userId, onRequestClose }: IPropsProfileFooter) {
  const [isCreatingDM, setIsCreatingDM] = useState(false);
  const [isIgnoring, setIsIgnoring] = useState(false);
  const [isUserIgnored, setIsUserIgnored] = useState(initMatrix.matrixClient.isUserIgnored(userId));

  const isMountedRef = useRef(true);
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const member = room!.getMember(userId);
  const isInvitable = member?.membership !== 'join' && member?.membership !== 'ban';

  const [isInviting, setIsInviting] = useState(false);
  const [isInvited, setIsInvited] = useState(member?.membership === 'invite');

  const myPowerlevel = room.getMember(mx.getUserId())?.powerLevel || 0;
  const userPL = room.getMember(userId)?.powerLevel || 0;
  const canIKick =
    room.currentState.hasSufficientPowerLevelFor('kick', myPowerlevel) && userPL < myPowerlevel;

  const isBanned = member?.membership === 'ban';

  const onCreated = (dmRoomId: string) => {
    if (isMountedRef.current === false) return;
    setIsCreatingDM(false);
    selectRoom(dmRoomId);
    onRequestClose();
  };

  useEffect(() => {
    const { roomList } = initMatrix;
    roomList.on(cons.events.roomList.ROOM_CREATED, onCreated);
    return () => {
      isMountedRef.current = false;
      roomList.removeListener(cons.events.roomList.ROOM_CREATED, onCreated);
    };
  }, []);
  useEffect(() => {
    setIsUserIgnored(initMatrix.matrixClient.isUserIgnored(userId));
    setIsIgnoring(false);
    setIsInviting(false);
  }, [userId]);

  const openDM = async () => {
    // Check and open if user already have a DM with userId.
    const dmRoomId = hasDMWith(userId);
    if (dmRoomId) {
      selectRoom(dmRoomId);
      onRequestClose();
      return;
    }

    // Create new DM
    try {
      setIsCreatingDM(true);
      await roomActions.createDM(userId, await hasDevices(userId));
    } catch {
      if (isMountedRef.current === false) return;
      setIsCreatingDM(false);
    }
  };

  const toggleIgnore = async () => {
    const isIgnored = mx.getIgnoredUsers().includes(userId);

    try {
      setIsIgnoring(true);
      if (isIgnored) {
        await roomActions.unignore([userId]);
      } else {
        await roomActions.ignore([userId]);
      }

      if (isMountedRef.current === false) return;
      setIsUserIgnored(!isIgnored);
      setIsIgnoring(false);
    } catch {
      setIsIgnoring(false);
    }
  };

  const toggleInvite = async () => {
    try {
      setIsInviting(true);
      let isInviteSent = false;
      if (isInvited) await roomActions.kick(roomId, userId);
      else {
        await roomActions.invite(roomId, userId);
        isInviteSent = true;
      }
      if (isMountedRef.current === false) return;
      setIsInvited(isInviteSent);
      setIsInviting(false);
    } catch {
      setIsInviting(false);
    }
  };

  return (
    <div className="profile-viewer__buttons">
      <Button variant="primary" onClick={openDM} disabled={isCreatingDM}>
        {isCreatingDM ? 'Creating room...' : 'Message'}
      </Button>
      {isBanned && canIKick && (
        <Button variant="positive" onClick={() => roomActions.unban(roomId, userId)}>
          Unban
        </Button>
      )}
      {(isInvited ? canIKick : room.canInvite(mx.getUserId())) && isInvitable && (
        <Button onClick={toggleInvite} disabled={isInviting}>
          {isInvited
            ? `${isInviting ? 'Disinviting...' : 'Disinvite'}`
            : `${isInviting ? 'Inviting...' : 'Invite'}`}
        </Button>
      )}
      <Button
        variant={isUserIgnored ? 'positive' : 'danger'}
        onClick={toggleIgnore}
        disabled={isIgnoring}
      >
        {isUserIgnored
          ? `${isIgnoring ? 'Unignoring...' : 'Unignore'}`
          : `${isIgnoring ? 'Ignoring...' : 'Ignore'}`}
      </Button>
    </div>
  );
}

function useToggleDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomId, setRoomId] = useState<string | null>(null as unknown as string);
  const [userId, setUserId] = useState<string | null>(null as unknown as string);

  useEffect(() => {
    const loadProfile = (uId, rId) => {
      setIsOpen(true);
      setUserId(uId);
      setRoomId(rId);
    };
    navigation.on(cons.events.navigation.PROFILE_VIEWER_OPENED, loadProfile);
    return () => {
      navigation.removeListener(cons.events.navigation.PROFILE_VIEWER_OPENED, loadProfile);
    };
  }, []);

  const closeDialog = () => setIsOpen(false);

  const afterClose = () => {
    setUserId(null);
    setRoomId(null);
  };

  return [isOpen, roomId, userId, closeDialog, afterClose];
}

function useRerenderOnProfileChange(roomId, userId) {
  const mx = initMatrix.matrixClient;
  const [, forceUpdate] = useForceUpdate();
  useEffect(() => {
    const handleProfileChange = (mEvent, member) => {
      if (
        mEvent.getRoomId() === roomId &&
        (member.userId === userId || member.userId === mx.getUserId())
      ) {
        forceUpdate();
      }
    };
    mx.on('RoomMember.powerLevel', handleProfileChange);
    mx.on('RoomMember.membership', handleProfileChange);
    return () => {
      mx.removeListener('RoomMember.powerLevel', handleProfileChange);
      mx.removeListener('RoomMember.membership', handleProfileChange);
    };
  }, [roomId, userId]);
}

function ProfileViewer() {
  const [isOpen, roomId, userId, closeDialog, handleAfterClose] = useToggleDialog();
  useRerenderOnProfileChange(roomId, userId);

  const mx = initMatrix.matrixClient;

  const room = mx.getRoom(roomId as string) as TRoom;

  // const [display, setDisplay] = useState<SearchResultUser>({
  //   user_id: userId as string,
  //   display_name: username,
  //   avatarUrl: avatarUrl as string,
  //   about: null as unknown as string,
  // });

  const [display, setDisplay] = useState<SearchResultUser | null>(null);
  useEffect(() => {
    let unmounted = false;
    userId &&
      typeof userId === 'string' &&
      initMatrix.matrixClient.getUserWithCB(userId, (profile) => {
        if (profile && !unmounted) {
          setDisplay({
            user_id: userId as string,
            display_name: profile?.name,
            avatarUrl: profile?.picture,
            about: profile?.about,
          });
        }
      });
    return () => {
      unmounted = true;
    };
  }, [userId]);

  const renderProfile = () => {
    const roomMember = room?.getMember(userId as string);
    const username = roomMember
      ? getUsernameOfRoomMember(roomMember)
      : getUsername(userId as string);
    const avatarMxc = roomMember?.getMxcAvatarUrl?.() || mx.getUser(userId as string)?.avatarUrl;
    const avatarUrl =
      avatarMxc && avatarMxc !== 'null' ? mx.mxcUrlToHttp(avatarMxc, 80, 80, 'crop') : null;
    const powerLevel = roomMember?.powerLevel || 0;
    const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel || 0;

    const canChangeRole =
      room.currentState.maySendEvent('m.room.power_levels', mx.getUserId()) &&
      (powerLevel < myPowerLevel || userId === mx.getUserId());

    const handleChangePowerLevel = async (newPowerLevel) => {
      if (newPowerLevel === powerLevel) return;
      const SHARED_POWER_MSG =
        'You will not be able to undo this change as you are promoting the user to have the same power level as yourself. Are you sure?';
      const DEMOTING_MYSELF_MSG =
        'You will not be able to undo this change as you are demoting yourself. Are you sure?';

      const isSharedPower = newPowerLevel === myPowerLevel;
      const isDemotingMyself = userId === mx.getUserId();
      if (isSharedPower || isDemotingMyself) {
        const isConfirmed = await confirmDialog(
          'Change power level',
          isSharedPower ? SHARED_POWER_MSG : DEMOTING_MYSELF_MSG,
          'Change',
          'caution'
        );
        if (!isConfirmed) return;
        roomActions.setPowerLevel(roomId, userId, newPowerLevel);
      } else {
        roomActions.setPowerLevel(roomId, userId, newPowerLevel);
      }
    };

    const handlePowerSelector = (e) => {
      openReusableContextMenu('bottom', getEventCords(e, '.btn-surface'), (closeMenu) => (
        <PowerLevelSelector
          value={powerLevel}
          max={myPowerLevel}
          onSelect={(pl) => {
            closeMenu();
            handleChangePowerLevel(pl);
          }}
        />
      ));
    };

    return (
      <div className="profile-viewer">
        <div className="profile-viewer__user">
          <Avatar
            imageSrc={display?.avatarUrl ?? avatarUrl}
            text={display?.display_name ?? defaultName(userId as string, 'npub')}
            bgColor={colorMXID(userId)}
            size="large"
            type="single"
          />
          <div className="profile-viewer__user__info">
            <Text variant="s1" weight="medium">
              {twemojify(display?.display_name ?? defaultName(userId as string, 'npub'))}
            </Text>
            <Text variant="b2">{twemojify(toNostrBech32Address(userId!, 'npub')!)}</Text>
          </div>
          <div className="profile-viewer__user__role">
            <Text variant="b3">Role</Text>
            <Button
              onClick={canChangeRole ? handlePowerSelector : null}
              iconSrc={canChangeRole ? ChevronBottomIC : null}
            >
              {`${getPowerLabel(powerLevel) || 'Member'} - ${powerLevel}`}
            </Button>
          </div>
        </div>
        <ModerationTools roomId={roomId as string} userId={userId as string} />
        {/* <SessionInfo userId={userId as string} /> */}
        {userId !== mx.getUserId() && (
          <ProfileFooter
            roomId={roomId as string}
            userId={userId as string}
            onRequestClose={closeDialog as () => void}
          />
        )}
      </div>
    );
  };

  return (
    <Dialog
      className="profile-viewer__dialog"
      isOpen={isOpen as boolean}
      title={room?.name ?? ''}
      onAfterClose={handleAfterClose as () => void}
      onRequestClose={closeDialog as () => void}
      contentOptions={<IconButton src={CrossIC} onClick={closeDialog} tooltip="Close" />}
    >
      {roomId ? renderProfile() : <div />}
    </Dialog>
  );
}

export default ProfileViewer;
