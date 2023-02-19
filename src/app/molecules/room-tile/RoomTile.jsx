import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './RoomTile.scss';

import { twemojify } from '../../../util/twemojify';

import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import { toNostrBech32Address, toNostrHexAddress } from '../../../util/nostrUtil';

function RoomTile({ avatarSrc, name, id, inviterName, memberCount, desc, options, type }) {
  const [displayId, setDisplayId] = useState(id);
  useEffect(() => {
    if (type == 'single') {
      const id2 = toNostrBech32Address(id, 'npub');
      setDisplayId(id2);
    } else {
      const id2 = toNostrBech32Address(id, 'note');
      setDisplayId(id2);
    }
  }, []);
  return (
    <div className="room-tile">
      <div className="room-tile__avatar">
        <Avatar imageSrc={avatarSrc} bgColor={colorMXID(id)} text={name} id={id} type={type} />
      </div>
      <div className="room-tile__content">
        <Text variant="s1">{twemojify(name)}</Text>
        <Text variant="b3">
          {inviterName !== null
            ? `Invited by ${inviterName} to ${id}${
                memberCount === null ? '' : ` • ${memberCount} members`
              }`
            : displayId + (memberCount === null ? '' : ` • ${memberCount} members`)}
        </Text>
        <Text variant="b3">{toNostrHexAddress(displayId)}</Text>
        {desc !== null && typeof desc === 'string' ? (
          <Text className="room-tile__content__desc" variant="b2">
            {twemojify(desc, undefined, true)}
          </Text>
        ) : (
          desc
        )}
      </div>
      {options !== null && <div className="room-tile__options">{options}</div>}
    </div>
  );
}

RoomTile.defaultProps = {
  avatarSrc: null,
  inviterName: null,
  options: null,
  desc: null,
  memberCount: null,
};
RoomTile.propTypes = {
  avatarSrc: PropTypes.string,
  name: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  inviterName: PropTypes.string,
  memberCount: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  desc: PropTypes.node,
  options: PropTypes.node,
};

export default RoomTile;
