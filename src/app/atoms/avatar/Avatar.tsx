import React from 'react';
import PropTypes from 'prop-types';
import './Avatar.scss';

import { twemojify } from '../../../util/twemojify';

import Text from '../text/Text';
import RawIcon from '../system-icons/RawIcon';

import ImageBrokenSVG from '../../../../public/res/svg/image-broken.svg';
import { avatarInitials } from '../../../util/common';
import CanvasPic from '../avatar-channel/CanvasPic';
import { TRoomType } from '../../../../types';

interface IPropsAvatar {
  text?: string;
  bgColor?: string;
  iconSrc?: string;
  iconColor?: string;
  imageSrc?: string | null;
  size: 'large' | 'normal' | 'small' | 'extra-small';
  id?: string | null;
  type: TRoomType;
}

const Avatar = React.forwardRef(
  (
    {
      text = null as unknown as string,
      bgColor = 'transparent',
      iconSrc = null as unknown as string,
      iconColor = null as unknown as string,
      imageSrc = null as unknown as string,
      size = 'normal',
      id = null,
      type = 'single',
    }: IPropsAvatar,
    ref: any
  ) => {
    let textSize = 's1';
    if (size === 'large') textSize = 'h1';
    if (size === 'small') textSize = 'b1';
    if (size === 'extra-small') textSize = 'b3';
    if (type == 'single') {
      return (
        <div ref={ref} className={`avatar-container avatar-container__${size} noselect`}>
          {imageSrc !== null ? (
            <img
              draggable="false"
              src={imageSrc}
              onLoad={(e: any) => {
                e.target.style.backgroundColor = 'transparent';
              }}
              onError={(e: any) => {
                e.target.src = ImageBrokenSVG;
              }}
              alt=""
            />
          ) : (
            <span
              style={{ backgroundColor: iconSrc === null ? bgColor : 'transparent' }}
              className={`avatar__border${iconSrc !== null ? '--active' : ''}`}
            >
              {iconSrc !== null ? (
                <RawIcon size={size} src={iconSrc} color={iconColor} />
              ) : (
                text !== null && (
                  <Text variant={textSize} primary>
                    {twemojify(avatarInitials(text))}
                  </Text>
                )
              )}
            </span>
          )}
        </div>
      );
    } else {
      return (
        <div ref={ref} className={`avatar-container avatar-container__${size} noselect`}>
          {imageSrc !== null ? (
            <img
              draggable="false"
              src={imageSrc}
              onLoad={(e: any) => {
                e.target.style.backgroundColor = 'transparent';
              }}
              onError={(e: any) => {
                e.target.src = ImageBrokenSVG;
              }}
              alt=""
            />
          ) : (
            <span
              style={{ backgroundColor: iconSrc === null ? bgColor : 'transparent' }}
              className={`avatar__border${iconSrc !== null ? '--active' : ''}`}
            >
              {iconSrc !== null ? (
                <RawIcon size={size} src={iconSrc} color={iconColor} />
              ) : (
                text !== null && (
                  // <Text variant={textSize} primary>
                  //   {twemojify(avatarInitials(text))}
                  // </Text>
                  <CanvasPic text={id as string} type="groupChannel" size={size} />
                )
              )}
            </span>
          )}
        </div>
      );
    }
  }
);

// Avatar.defaultProps = {
//   text: null,
//   bgColor: 'transparent',
//   iconSrc: null,
//   iconColor: null,
//   imageSrc: null,
//   size: 'normal',
// };

// Avatar.propTypes = {
//   text: PropTypes.string,
//   bgColor: PropTypes.string,
//   iconSrc: PropTypes.string,
//   iconColor: PropTypes.string,
//   imageSrc: PropTypes.string,
//   size: PropTypes.oneOf(['large', 'normal', 'small', 'extra-small']),
// };

export default Avatar;
