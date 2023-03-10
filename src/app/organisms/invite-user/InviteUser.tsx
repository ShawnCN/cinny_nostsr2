import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './InviteUser.scss';

import initMatrix from '../../../client/InitMatrix';
import cons from '../../../client/state/cons';
import * as roomActions from '../../../client/action/room';
import { selectRoom } from '../../../client/action/navigation';
import { hasDMWith, hasDevices } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import Input from '../../atoms/input/Input';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import RoomTile from '../../molecules/room-tile/RoomTile';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';
import { SearchResultUser } from '../../../../types';
import { defaultName, toNostrHexAddress } from '../../../util/nostrUtil';

interface IPropsInviteUser {
  isOpen: boolean;
  roomId?: string;
  searchTerm?: string;
  onRequestClose: () => void;
}

function InviteUser({
  isOpen,
  roomId = undefined,
  searchTerm = undefined,
  onRequestClose,
}: IPropsInviteUser) {
  const [isSearching, updateIsSearching] = useState(false);
  const [searchQuery, updateSearchQuery] = useState<{ username?: string; error?: string }>({});
  const [users, updateUsers] = useState<SearchResultUser[]>([]);

  const [procUsers, updateProcUsers] = useState<Set<string>>(new Set()); // proc stands for processing.
  const [procUserError, updateUserProcError] = useState(new Map());

  const [createdDM, updateCreatedDM] = useState(new Map());
  const [roomIdToUserId, updateRoomIdToUserId] = useState<Map<string, string>>(new Map()); // roomId, userId

  const [invitedUserIds, updateInvitedUserIds] = useState(new Set());

  const usernameRef = useRef<any>(null);

  const mx = initMatrix.matrixClient;

  function getMapCopy(myMap) {
    const newMap = new Map();
    myMap.forEach((data, key) => {
      newMap.set(key, data);
    });
    return newMap;
  }
  function addUserToProc(userId: string) {
    procUsers.add(userId);
    updateProcUsers(new Set(Array.from(procUsers)));
  }
  function deleteUserFromProc(userId: string) {
    procUsers.delete(userId);
    updateProcUsers(new Set(Array.from(procUsers)));
  }

  function onDMCreated(newRoomId: string) {
    const myDMPartnerId = roomIdToUserId.get(newRoomId);
    if (typeof myDMPartnerId === 'undefined') return;

    createdDM.set(myDMPartnerId, newRoomId);
    roomIdToUserId.delete(newRoomId);

    deleteUserFromProc(myDMPartnerId);
    updateCreatedDM(getMapCopy(createdDM));
    updateRoomIdToUserId(getMapCopy(roomIdToUserId));
  }
  const updateFoundProfileInfo = (info: {
    displayName: string;
    about: string;
    avatarUrl: string;
  }) => {
    if (!usernameRef.current.value || usernameRef.current.value.trim().length == 0) return;
    updateUsers([
      {
        user_id: usernameRef.current.value,
        display_name: info.displayName,
        avatarUrl: info.avatarUrl,
      },
    ]);
    updateIsSearching(false);
  };

  async function searchUser(username: string) {
    const inputUsername = username.trim();
    if (isSearching || inputUsername === '' || inputUsername === searchQuery.username) return;
    const isInputUserId = inputUsername[0] === '@' && inputUsername.indexOf(':') > 1;
    updateIsSearching(true);
    updateSearchQuery({ username: inputUsername });

    if (isInputUserId) {
      try {
        const result = await mx.getProfileInfo(inputUsername);
        updateUsers([
          {
            user_id: inputUsername,
            display_name: result!.displayName,
            avatarUrl: result!.avatarUrl,
          },
        ]);
      } catch (e) {
        updateSearchQuery({ error: `${inputUsername} not found!` });
      }
    } else {
      try {
        const result: any = await mx.searchUserDirectory({
          term: inputUsername,
          limit: 20,
        });
        if (result.results.length === 0) {
          updateSearchQuery({ error: `No matches found for "${inputUsername}"!` });
          updateIsSearching(false);
          return;
        }
        updateUsers(result.results);
      } catch (e) {
        updateSearchQuery({ error: 'Something went wrong!' });
      }
    }
    updateIsSearching(false);
  }
  function searchNostrUser(username: string) {
    const inputUsername = username.trim();
    if (isSearching || inputUsername === '' || inputUsername === searchQuery.username) return;
    // const isInputUserId = inputUsername[0] === '@' && inputUsername.indexOf(':') > 1;
    updateIsSearching(true);
    updateSearchQuery({ username: inputUsername });

    try {
      // await mx.getProfileInfo(inputUsername);
      const pubkeyHex = toNostrHexAddress(inputUsername);
      if (!pubkeyHex) throw new Error('Invalid user ID');
      const profile = mx.profiles.get(pubkeyHex);
      if (profile) {
        updateUsers([
          {
            user_id: inputUsername,
            display_name: profile.name,
            avatarUrl: profile.picture,
          },
        ]);
      } else {
        updateUsers([
          {
            user_id: inputUsername,
            display_name: defaultName(inputUsername, 'npub')!,
            avatarUrl: null,
          },
        ]);
        mx.getUserWithCB(pubkeyHex, (profile) => {
          if (profile && toNostrHexAddress(users[0].user_id) == pubkeyHex) {
            updateUsers([
              {
                user_id: inputUsername,
                display_name: profile.name,
                avatarUrl: profile.picture,
              },
            ]);
          }
        });
      }
      // const result = await mx.getProfileInfo(inputUsername);
      // if (result) {
      //   updateUsers([
      //     {
      //       user_id: inputUsername,
      //       display_name: result.name,
      //       avatarUrl: result.picture,
      //     },
      //   ]);
      // } else {
      //   updateSearchQuery({ error: `${inputUsername} not found!` });
      // }
    } catch (e: any) {
      console.error(e.message);
      updateSearchQuery({ error: `${inputUsername} not found!` });
    }
    updateIsSearching(false);
  }

  async function createDM(userId: string, user: SearchResultUser) {
    userId = toNostrHexAddress(userId)!;
    user.user_id = userId;
    if (mx.getUserId() === userId) return;
    const dmRoomId = hasDMWith(userId);
    if (dmRoomId) {
      selectRoom(dmRoomId);
      onRequestClose();
      return;
    }

    try {
      addUserToProc(userId);
      procUserError.delete(userId);
      updateUserProcError(getMapCopy(procUserError));

      const result = await roomActions.createDM(userId, await hasDevices(userId), user);
      roomIdToUserId.set(result.roomId, userId);
      updateRoomIdToUserId(getMapCopy(roomIdToUserId));
    } catch (e: any) {
      deleteUserFromProc(userId);
      if (typeof e.message === 'string') procUserError.set(userId, e.message);
      else procUserError.set(userId, 'Something went wrong!');
      updateUserProcError(getMapCopy(procUserError));
    }
  }

  async function inviteToRoom(userId) {
    if (typeof roomId === 'undefined') return;
    try {
      addUserToProc(userId);
      procUserError.delete(userId);
      updateUserProcError(getMapCopy(procUserError));

      await roomActions.invite(roomId, userId);

      invitedUserIds.add(userId);
      updateInvitedUserIds(new Set(Array.from(invitedUserIds)));
      deleteUserFromProc(userId);
    } catch (e: any) {
      deleteUserFromProc(userId);
      if (typeof e.message === 'string') procUserError.set(userId, e.message);
      else procUserError.set(userId, 'Something went wrong!');
      updateUserProcError(getMapCopy(procUserError));
    }
  }

  function renderUserList() {
    const renderOptions = (userId: string, user: SearchResultUser) => {
      const messageJSX = (message, isPositive) => (
        <Text variant="b2">
          <span style={{ color: isPositive ? 'var(--bg-positive)' : 'var(--bg-negative)' }}>
            {message}
          </span>
        </Text>
      );

      if (mx.getUserId() === userId) return null;
      if (procUsers.has(userId)) {
        return <Spinner size="small" />;
      }
      if (createdDM.has(userId)) {
        // eslint-disable-next-line max-len
        return (
          <Button
            onClick={() => {
              selectRoom(createdDM.get(userId));
              onRequestClose();
            }}
          >
            Open
          </Button>
        );
      }
      if (invitedUserIds.has(userId)) {
        return messageJSX('Invited', true);
      }
      if (typeof roomId === 'string') {
        const member = mx.getRoom(roomId)!.getMember(userId);
        if (member !== null) {
          const userMembership = member.membership;
          switch (userMembership) {
            case 'join':
              return messageJSX('Already joined', true);
            case 'invite':
              return messageJSX('Already Invited', true);
            case 'ban':
              return messageJSX('Banned', false);
            default:
          }
        }
      }
      return typeof roomId === 'string' ? (
        <Button onClick={() => inviteToRoom(userId)} variant="primary">
          Invite
        </Button>
      ) : (
        <Button onClick={() => createDM(userId, user)} variant="primary">
          Message
        </Button>
      );
    };
    const renderError = (userId) => {
      if (!procUserError.has(userId)) return null;
      return (
        <Text variant="b2">
          <span style={{ color: 'var(--bg-danger)' }}>{procUserError.get(userId)}</span>
        </Text>
      );
    };
    return users.map((user) => (
      <RenderUserTile user={user} renderOptions={renderOptions} renderError={renderError} />
    ));
  }
  useEffect(() => {
    if (isOpen && (typeof searchTerm != 'string' || searchTerm.length == 0)) {
      let auserList: SearchResultUser[] = [];
      initMatrix.roomList.mDirects.forEach((d) => {
        const auser = mx.getUser(d);
        auserList.push({
          user_id: auser.userId,
          display_name: auser.displayName,
          avatarUrl: auser.avatarUrl,
        });
      });
      if (auserList.length > 0) updateUsers(auserList);
      // mx.fetchUsersMeta(Array.from(initMatrix.roomList.mDirects));
    }
  }, [isOpen, searchTerm]);

  useEffect(() => {
    if (isOpen && typeof searchTerm === 'string') searchNostrUser(searchTerm);
    return () => {
      updateIsSearching(false);
      updateSearchQuery({});
      updateUsers([]);
      updateProcUsers(new Set());
      updateUserProcError(new Map());
      updateCreatedDM(new Map());
      updateRoomIdToUserId(new Map());
      updateInvitedUserIds(new Set());
    };
  }, [isOpen, searchTerm]);

  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOM_CREATED, onDMCreated);
    mx.on('foundProfileInfo', updateFoundProfileInfo);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_CREATED, onDMCreated);
    };
  }, [isOpen, procUsers, createdDM, roomIdToUserId]);

  return (
    <PopupWindow
      isOpen={isOpen}
      title={
        typeof roomId === 'string' ? `Invite to ${mx.getRoom(roomId)?.name}` : 'Direct message'
      }
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
      onRequestClose={onRequestClose}
    >
      <div className="invite-user">
        <form
          className="invite-user__form"
          onSubmit={(e) => {
            e.preventDefault();
            searchNostrUser(usernameRef.current.value);
          }}
        >
          <Input value={searchTerm} forwardRef={usernameRef} label="npub..." />
          <Button disabled={isSearching} iconSrc={UserIC} variant="primary" type="submit">
            Search
          </Button>
        </form>
        <div className="invite-user__search-status">
          {typeof searchQuery.username !== 'undefined' && isSearching && (
            <div className="flex--center">
              <Spinner size="small" />
              <Text variant="b2">{`Searching for user "${searchQuery.username}"...`}</Text>
            </div>
          )}
          {typeof searchQuery.username !== 'undefined' && !isSearching && (
            <Text variant="b2">{`Search result for user "${searchQuery.username}"`}</Text>
          )}
          {searchQuery.error && (
            <Text className="invite-user__search-error" variant="b2">
              {searchQuery.error}
            </Text>
          )}
        </div>
        {users.length !== 0 && <div className="invite-user__content">{renderUserList()}</div>}
      </div>
    </PopupWindow>
  );
}

interface IPropsRenderUserTile {
  user: SearchResultUser;
  renderOptions: (arg0: string, user: SearchResultUser) => void;
  renderError: (arg0: string) => void;
}

function RenderUserTile({ user, renderOptions, renderError }: IPropsRenderUserTile) {
  const userId = user.user_id;
  let name =
    typeof user.display_name === 'string' ? user.display_name : defaultName(userId, 'npub');

  return (
    <RoomTile
      key={userId}
      avatarSrc={
        typeof user?.avatarUrl === 'string'
          ? // ? mx.mxcUrlToHttp(user.avatarUrl, 42, 42, 'crop')
            user.avatarUrl
          : null
      }
      name={name ?? defaultName(userId, 'npub')}
      id={userId}
      options={renderOptions(userId, user)}
      desc={renderError(userId)}
      type="single"
    />
  );
}

// InviteUser.defaultProps = {
//   roomId: undefined,
//   searchTerm: undefined,
// };

// InviteUser.propTypes = {
//   isOpen: PropTypes.bool.isRequired,
//   roomId: PropTypes.string,
//   searchTerm: PropTypes.string,
//   onRequestClose: PropTypes.func.isRequired,
// };

export default InviteUser;
