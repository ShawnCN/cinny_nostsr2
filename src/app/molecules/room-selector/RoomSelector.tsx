import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './RoomSelector.scss';

import { twemojify } from '../../../util/twemojify';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import { blurOnBubbling } from '../../atoms/button/script';
import { toNostrBech32Address } from '../../../util/nostrUtil';
import initMatrix from '../../../client/InitMatrix';

function RoomSelectorWrapper({
  isSelected,
  isMuted,
  isUnread,
  onClick,
  content,
  options,
  onContextMenu,
}) {
  const classes = ['room-selector'];
  if (isMuted) classes.push('room-selector--muted');
  if (isUnread) classes.push('room-selector--unread');
  if (isSelected) classes.push('room-selector--selected');

  return (
    <div className={classes.join(' ')}>
      <button
        className="room-selector__content"
        type="button"
        onClick={onClick}
        onMouseUp={(e) => blurOnBubbling(e, '.room-selector__content')}
        onContextMenu={onContextMenu}
      >
        {content}
      </button>
      <div className="room-selector__options">{options}</div>
    </div>
  );
}
RoomSelectorWrapper.defaultProps = {
  isMuted: false,
  options: null,
  onContextMenu: null,
};
RoomSelectorWrapper.propTypes = {
  isSelected: PropTypes.bool.isRequired,
  isMuted: PropTypes.bool,
  isUnread: PropTypes.bool.isRequired,
  onClick: PropTypes.func.isRequired,
  content: PropTypes.node.isRequired,
  options: PropTypes.node,
  onContextMenu: PropTypes.func,
};

function RoomSelector({
  name,
  type,
  parentName,
  roomId,
  imageSrc,
  iconSrc,
  isSelected,
  isMuted,
  isUnread,
  notificationCount,
  isAlert,
  options,
  onClick,
  onContextMenu,
}) {
  const room = initMatrix.matrixClient.getRoom(roomId);
  const [display, setDisplay] = useState({ name, imageSrc });
  useEffect(() => {
    let unmounted = false;
    function handleGetProfile(profile) {
      if (profile && !unmounted) {
        setDisplay({ name: profile.name, imageSrc: profile.picture });
      }
    }
    if (type == 'groupChannel') {
      initMatrix.matrixClient.getChannelInfoWithCB(roomId, handleGetProfile);
    }
    if (type == 'single') {
      initMatrix.matrixClient.getUserWithCB(roomId, handleGetProfile);
    }
    return () => {
      unmounted = true;
    };
  }, []);
  return (
    <RoomSelectorWrapper
      isSelected={isSelected}
      isMuted={isMuted}
      isUnread={isUnread}
      content={
        <>
          <Avatar
            text={display.name}
            bgColor={colorMXID(roomId)}
            imageSrc={display.imageSrc}
            iconColor="var(--ic-surface-low)"
            iconSrc={iconSrc}
            size="extra-small"
            id={roomId}
            type={room!.type}
          />
          <Text variant="b1" weight={isUnread ? 'medium' : 'normal'}>
            {twemojify(display.name)}
            {parentName && (
              <Text variant="b3" span>
                {' — '}
                {twemojify(parentName)}
              </Text>
            )}
          </Text>
          {isUnread && (
            <NotificationBadge
              alert={isAlert}
              content={notificationCount !== 0 ? notificationCount : null}
            />
          )}
        </>
      }
      options={options}
      onClick={onClick}
      onContextMenu={onContextMenu}
    />
  );
}
RoomSelector.defaultProps = {
  parentName: null,
  isSelected: false,
  imageSrc: null,
  iconSrc: null,
  isMuted: false,
  options: null,
  onContextMenu: null,
};
RoomSelector.propTypes = {
  name: PropTypes.string.isRequired,
  parentName: PropTypes.string,
  roomId: PropTypes.string.isRequired,
  imageSrc: PropTypes.string,
  iconSrc: PropTypes.string,
  isSelected: PropTypes.bool,
  isMuted: PropTypes.bool,
  isUnread: PropTypes.bool.isRequired,
  notificationCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  isAlert: PropTypes.bool.isRequired,
  options: PropTypes.node,
  onClick: PropTypes.func.isRequired,
  onContextMenu: PropTypes.func,
};

export default RoomSelector;
