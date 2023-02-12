import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './PublicRooms.scss';

import initMatrix from '../../../client/InitMatrix';
import cons from '../../../client/state/cons';
import { selectRoom, selectTab } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import Input from '../../atoms/input/Input';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import RoomTile from '../../molecules/room-tile/RoomTile';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';
import { TSearchQuery } from '../../../../types';
import TRoom from '../../../../types/TRoom';

const SEARCH_LIMIT = 20;

function TryJoinWithAlias({ alias, onRequestClose }) {
  const [status, setStatus] = useState({
    isJoining: false,
    error: null as unknown as string | null,
    roomId: null,
    tempRoomId: null,
  });
  function handleOnRoomAdded(roomId) {
    if (status.tempRoomId !== null && status.tempRoomId !== roomId) return;
    setStatus({
      isJoining: false,
      error: null,
      roomId,
      tempRoomId: null,
    });
  }

  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    };
  }, [status]);

  async function joinWithAlias() {
    setStatus({
      isJoining: true,
      error: null,
      roomId: null,
      tempRoomId: null,
    });
    try {
      const roomId = await roomActions.join(alias, false);
      setStatus({
        isJoining: true,
        error: null,
        roomId: null,
        tempRoomId: roomId,
      });
    } catch (e) {
      setStatus({
        isJoining: false,
        error: `Unable to join ${alias}. Either room is private or doesn't exist.`,
        roomId: null,
        tempRoomId: null,
      });
    }
  }

  return (
    <div className="try-join-with-alias">
      {status.roomId === null && !status.isJoining && status.error === null && (
        <Button onClick={() => joinWithAlias()}>{`Try joining ${alias}`}</Button>
      )}
      {status.isJoining && (
        <>
          <Spinner size="small" />
          <Text>{`Joining ${alias}...`}</Text>
        </>
      )}
      {status.roomId !== null && (
        <Button
          onClick={() => {
            onRequestClose();
            selectRoom(status.roomId);
          }}
        >
          Open
        </Button>
      )}
      {status.error !== null && (
        <Text variant="b2">
          <span style={{ color: 'var(--bg-danger)' }}>{status.error}</span>
        </Text>
      )}
    </div>
  );
}

TryJoinWithAlias.propTypes = {
  alias: PropTypes.string.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

interface IPropsPublicRooms {
  isOpen: boolean;
  searchTerm: string | undefined;
  onRequestClose: () => void;
}

function PublicRooms({ isOpen, searchTerm = undefined, onRequestClose }: IPropsPublicRooms) {
  const [isSearching, updateIsSearching] = useState(false);
  const [isViewMore, updateIsViewMore] = useState(false);
  const [publicRooms, updatePublicRooms] = useState<TRoom[]>([]);
  const [nextBatch, updateNextBatch] = useState(undefined);
  const [searchQuery, updateSearchQuery] = useState<TSearchQuery>({});
  const [joiningRooms, updateJoiningRooms] = useState(new Set<string>());

  const roomNameRef = useRef<any>(null);
  const hsRef = useRef<any>(null);
  const userId = initMatrix.matrixClient.getUserId();

  async function searchRooms(viewMore = false) {
    let inputRoomName = roomNameRef?.current?.value || searchTerm;
    let isInputAlias = false;
    if (typeof inputRoomName === 'string') {
      isInputAlias = inputRoomName[0] === '#' && inputRoomName.indexOf(':') > 1;
    }
    const hsFromAlias = isInputAlias ? inputRoomName.slice(inputRoomName.indexOf(':') + 1) : null;
    let inputHs = hsFromAlias || hsRef?.current?.value;

    if (typeof inputHs !== 'string') inputHs = userId.slice(userId.indexOf(':') + 1);
    if (typeof inputRoomName !== 'string') inputRoomName = '';

    if (isSearching) return;
    if (
      viewMore !== true &&
      inputRoomName === searchQuery.name &&
      inputHs === searchQuery.homeserver
    )
      return;

    updateSearchQuery({
      name: inputRoomName,
      homeserver: inputHs,
    });
    if (isViewMore !== viewMore) updateIsViewMore(viewMore);
    updateIsSearching(true);

    try {
      const result = await initMatrix.matrixClient.publicRooms({
        server: inputHs,
        limit: SEARCH_LIMIT,
        since: viewMore ? nextBatch : undefined,
        include_all_networks: true,
        filter: {
          generic_search_term: inputRoomName,
        },
      });

      const totalRooms = viewMore ? publicRooms.concat(result.chunk) : result.chunk;
      updatePublicRooms(totalRooms);
      updateNextBatch(result.next_batch);
      updateIsSearching(false);
      updateIsViewMore(false);
      if (totalRooms.length === 0) {
        updateSearchQuery({
          error:
            inputRoomName === ''
              ? `No public rooms on ${inputHs}`
              : `No result found for "${inputRoomName}" on ${inputHs}`,
          alias: isInputAlias ? inputRoomName : null,
        });
      }
    } catch (e: any) {
      updatePublicRooms([]);
      let err = 'Something went wrong!';
      if (e?.httpStatus >= 400 && e?.httpStatus < 500) {
        err = e.message;
      }
      updateSearchQuery({
        error: err,
        alias: isInputAlias ? inputRoomName : null,
      });
      updateIsSearching(false);
      updateNextBatch(undefined);
      updateIsViewMore(false);
    }
  }
  async function searchNostrRooms(viewMore = false) {
    let inputRoomName = roomNameRef?.current?.value || searchTerm;
    let isInputAlias = false;
    if (typeof inputRoomName === 'string') {
      isInputAlias = inputRoomName[0] === '#' && inputRoomName.indexOf(':') > 1;
    }
    const hsFromAlias = isInputAlias ? inputRoomName.slice(inputRoomName.indexOf(':') + 1) : null;
    let inputHs = hsFromAlias || hsRef?.current?.value;

    if (typeof inputHs !== 'string') inputHs = userId.slice(userId.indexOf(':') + 1);
    if (typeof inputRoomName !== 'string') inputRoomName = '';

    if (isSearching) return;
    if (
      viewMore !== true &&
      inputRoomName === searchQuery.name &&
      inputHs === searchQuery.homeserver
    )
      return;

    updateSearchQuery({
      name: inputRoomName,
      homeserver: inputHs,
    });
    if (isViewMore !== viewMore) updateIsViewMore(viewMore);
    updateIsSearching(true);

    try {
      const result = await initMatrix.matrixClient.publicRooms({
        server: inputHs,
        limit: SEARCH_LIMIT,
        since: viewMore ? nextBatch : undefined,
        include_all_networks: true,
        filter: {
          generic_search_term: inputRoomName,
        },
      });
      console.log('result: ', JSON.stringify(result));
      if (!result) {
        updateSearchQuery({
          error:
            inputRoomName === ''
              ? `No public rooms on ${inputHs}`
              : `No result found for "${inputRoomName}" on ${inputHs}`,
          alias: isInputAlias ? inputRoomName : null,
        });
      }
      const totalRooms = viewMore ? publicRooms.concat(result!.chunk) : result!.chunk;
      updatePublicRooms(totalRooms);
      updateNextBatch(result.next_batch);
      updateIsSearching(false);
      updateIsViewMore(false);
      if (totalRooms.length === 0) {
        updateSearchQuery({
          error:
            inputRoomName === ''
              ? `No public rooms on ${inputHs}`
              : `No result found for "${inputRoomName}" on ${inputHs}`,
          alias: isInputAlias ? inputRoomName : null,
        });
      }
    } catch (e: any) {
      updatePublicRooms([]);
      let err = 'Something went wrong!';
      if (e?.httpStatus >= 400 && e?.httpStatus < 500) {
        err = e.message;
      }
      updateSearchQuery({
        error: err,
        alias: isInputAlias ? inputRoomName : null,
      });
      updateIsSearching(false);
      updateNextBatch(undefined);
      updateIsViewMore(false);
    }
  }

  useEffect(() => {
    if (isOpen) searchNostrRooms();
  }, [isOpen]);

  function handleOnRoomAdded(roomId) {
    console.log('onRoomAdded');
    if (joiningRooms.has(roomId)) {
      joiningRooms.delete(roomId);
      updateJoiningRooms(new Set(Array.from(joiningRooms)));
    }
  }
  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    };
  }, [joiningRooms]);

  function handleViewRoom(roomId) {
    const room = initMatrix.matrixClient.getRoom(roomId);
    // if (room?.isSpaceRoom()) selectTab(roomId);
    // else selectRoom(roomId);
    selectRoom(roomId);
    onRequestClose();
  }

  function joinRoom(roomIdOrAlias: string) {
    console.log('Joining room');
    joiningRooms.add(roomIdOrAlias);

    console.log(joiningRooms);
    updateJoiningRooms(new Set(Array.from(joiningRooms)));
    console.log(joiningRooms);
    roomActions.join(roomIdOrAlias, false);
    console.log('Joining room2');
  }

  function renderRoomList(rooms: TRoom[]) {
    return rooms.map((room) => {
      const alias = typeof room.canonical_alias === 'string' ? room.canonical_alias : room.roomId;
      const name = typeof room.name === 'string' ? room.name : alias;
      const isJoined = initMatrix.matrixClient.getRoom(room.roomId)?.getMyMembership() === 'join';
      return (
        <RoomTile
          key={room.roomId}
          avatarSrc={
            typeof room.avatarUrl === 'string'
              ? // ? initMatrix.matrixClient.mxcUrlToHttp(room.avatarUrl, 42, 42, 'crop')
                room.avatarUrl
              : null
          }
          name={name}
          id={alias}
          memberCount={room.num_joined_members}
          desc={typeof room.topic === 'string' ? room.topic : null}
          options={
            <>
              {isJoined && <Button onClick={() => handleViewRoom(room.roomId)}>Open</Button>}
              {!isJoined &&
                (joiningRooms.has(room.roomId) ? (
                  <Spinner size="small" />
                ) : (
                  <Button
                    onClick={() => joinRoom(room.aliases?.[0] || room.roomId)}
                    variant="primary"
                  >
                    Join
                  </Button>
                ))}
            </>
          }
        />
      );
    });
  }

  return (
    <PopupWindow
      isOpen={isOpen}
      title="Public rooms"
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
      onRequestClose={onRequestClose}
    >
      <div className="public-rooms">
        <form
          className="public-rooms__form"
          onSubmit={(e) => {
            e.preventDefault();
            searchNostrRooms();
          }}
        >
          <div className="public-rooms__input-wrapper">
            <Input value={searchTerm} forwardRef={roomNameRef} label="Room name or alias" />
            <Input
              forwardRef={hsRef}
              value={userId.slice(userId.indexOf(':') + 1)}
              label="Homeserver"
              required
            />
          </div>
          <Button disabled={isSearching} iconSrc={HashSearchIC} variant="primary" type="submit">
            Search
          </Button>
        </form>
        <div className="public-rooms__search-status">
          {typeof searchQuery.name !== 'undefined' &&
            isSearching &&
            (searchQuery.name === '' ? (
              <div className="flex--center">
                <Spinner size="small" />
                <Text variant="b2">{`Loading public rooms from ${searchQuery.homeserver}...`}</Text>
              </div>
            ) : (
              <div className="flex--center">
                <Spinner size="small" />
                <Text variant="b2">{`Searching for "${searchQuery.name}" on ${searchQuery.homeserver}...`}</Text>
              </div>
            ))}
          {typeof searchQuery.name !== 'undefined' &&
            !isSearching &&
            (searchQuery.name === '' ? (
              <Text variant="b2">{`Public rooms on ${searchQuery.homeserver}.`}</Text>
            ) : (
              <Text variant="b2">{`Search result for "${searchQuery.name}" on ${searchQuery.homeserver}.`}</Text>
            ))}
          {searchQuery.error && (
            <>
              <Text className="public-rooms__search-error" variant="b2">
                {searchQuery.error}
              </Text>
              {typeof searchQuery.alias === 'string' && (
                <TryJoinWithAlias onRequestClose={onRequestClose} alias={searchQuery.alias} />
              )}
            </>
          )}
        </div>
        {publicRooms.length !== 0 && (
          <div className="public-rooms__content">{renderRoomList(publicRooms)}</div>
        )}
        {publicRooms.length !== 0 && publicRooms.length % SEARCH_LIMIT === 0 && (
          <div className="public-rooms__view-more">
            {isViewMore !== true && (
              <Button onClick={() => searchNostrRooms(true)}>View more</Button>
            )}
            {isViewMore && <Spinner />}
          </div>
        )}
      </div>
    </PopupWindow>
  );
}

// PublicRooms.defaultProps = {
//   searchTerm: undefined,
// };

// PublicRooms.propTypes = {
//   isOpen: PropTypes.bool.isRequired,
//   searchTerm: PropTypes.string,
//   onRequestClose: PropTypes.func.isRequired,
// };

export default PublicRooms;
