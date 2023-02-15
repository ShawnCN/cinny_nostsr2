import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/InitMatrix';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Button from '../../atoms/button/Button';
import ImageUpload from '../../molecules/image-upload/ImageUpload';
import Input from '../../atoms/input/Input';

import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import './ProfileEditor.scss';
import { defaultName, toNostrBech32Address } from '../../../util/nostrUtil';
interface IPropsProfileEditor {
  userId: string;
}

function ProfileEditor({ userId = null as unknown as string }: IPropsProfileEditor) {
  const [isEditing, setIsEditing] = useState(false);
  const mx = initMatrix.matrixClient;
  const user = mx.getUser(mx.getUserId());
  const displayNameRef = useRef<any>(null);
  const [avatarSrc, setAvatarSrc] = useState(
    // user.avatarUrl ? mx.mxcUrlToHttp(user.avatarUrl, 80, 80, 'crop') : null
    user.avatarUrl ? user.avatarUrl : null
  );
  const [username, setUsername] = useState(user.displayName);
  const [disabled, setDisabled] = useState(true);

  // useEffect(() => {
  //   let isMounted = true;
  //   mx.getProfileInfo(mx.getUserId()).then((info) => {
  //     if (!isMounted || !info) return;
  //     // setAvatarSrc(info.avatarUrl ? mx.mxcUrlToHttp(info.avatarUrl, 80, 80, 'crop') : null);
  //     setAvatarSrc(info.avatarUrl ? info.avatarUrl : null);
  //     setUsername(info.displayName);
  //   });
  //   return () => {
  //     // isMounted = false;
  //   };
  // }, [userId]);

  useEffect(() => {
    initMatrix.matrixClient.getUserWithCB(userId, (profile) => {
      if (profile) {
        setAvatarSrc(profile.picture && profile.picture.length > 0 ? profile.picture : null);
        setUsername(profile.name ? profile.name : defaultName(userId, 'npub'));
      }
    });
  }, []);

  const handleAvatarUpload = async (url: string) => {
    console.log('handleAvatarUpload', url);
    if (url === null) {
      const isConfirmed = await confirmDialog(
        'Remove avatar',
        'Are you sure that you want to remove avatar?',
        'Remove',
        'caution'
      );
      if (isConfirmed) {
        mx.setAvatarUrl('');
        setAvatarSrc(null);
      }
      return;
    }
    await mx.setAvatarUrl(url);
    // setAvatarSrc(mx.mxcUrlToHttp(url, 80, 80, 'crop'));
    setAvatarSrc(url);
  };

  const saveDisplayName = () => {
    const newDisplayName = displayNameRef.current?.value;
    if (newDisplayName !== null && newDisplayName !== username) {
      mx.setDisplayName(newDisplayName);
      setUsername(newDisplayName);
      setDisabled(true);
      setIsEditing(false);
    }
  };

  const onDisplayNameInputChange = () => {
    setDisabled(username === displayNameRef.current.value || displayNameRef.current.value == null);
  };
  const cancelDisplayNameChanges = () => {
    displayNameRef.current.value = username;
    onDisplayNameInputChange();
    setIsEditing(false);
  };

  const renderForm = () => (
    <form
      className="profile-editor__form"
      style={{ marginBottom: avatarSrc ? '24px' : '0' }}
      onSubmit={(e) => {
        e.preventDefault();
        saveDisplayName();
      }}
    >
      <Input
        label={`Display name of ${mx.getUserId()}`}
        onChange={onDisplayNameInputChange}
        value={mx.getUser(mx.getUserId()).displayName}
        forwardRef={displayNameRef}
      />
      <Button variant="primary" type="submit" disabled={disabled}>
        Save
      </Button>
      <Button onClick={cancelDisplayNameChanges}>Cancel</Button>
    </form>
  );

  const renderInfo = () => (
    <div className="profile-editor__info" style={{ marginBottom: avatarSrc ? '24px' : '0' }}>
      <div>
        <Text variant="h2" primary weight="medium">
          {twemojify(username) ?? userId}
        </Text>
        <IconButton
          src={PencilIC}
          size="extra-small"
          tooltip="Edit"
          onClick={() => setIsEditing(true)}
        />
      </div>
      <Text variant="b2">{toNostrBech32Address(mx.getUserId()!, 'npub')!}</Text>
      <Text variant="b2">{mx.getUserId()}</Text>
    </div>
  );

  return (
    <div className="profile-editor">
      <ImageUpload
        text={username ?? userId}
        bgColor={colorMXID(userId)}
        imageSrc={avatarSrc}
        onUpload={handleAvatarUpload}
        onRequestRemove={() => handleAvatarUpload(null)}
      />
      {isEditing ? renderForm() : renderInfo()}
    </div>
  );
}

// ProfileEditor.defaultProps = {
//   userId: null,
// };

// ProfileEditor.propTypes = {
//   userId: PropTypes.string,
// };

export default ProfileEditor;
