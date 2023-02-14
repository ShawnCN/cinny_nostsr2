import React, { useState, useRef, useEffect } from 'react';
import { invertColor } from '../../../util/matrixUtil';

type Props = {
  text: string;
  w?: number;
  type?: string;
  size?: string;
};

export function CanvasPic({ text, w = 40, type = 'groupChannel', size }: Props) {
  switch (size) {
    case 'large':
      w = 80;
      break;
    case 'normal':
      w = 42;
      break;
    case 'small':
      w = 36;
      break;
    case 'extra-small':
      w = 24;
      break;
  }
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current && type === 'groupChannel') {
      const t = (20 / 40) * w;
      const context = ref.current.getContext('2d');
      const color = `#${text.slice(6, 12)}`;
      context!.fillStyle = color;
      // context.fillRect(x,y,width,height)
      context!.fillRect(0, 0, w, w);
      const c11 = `#${text.slice(text.length - 6, text.length)}`;
      context!.fillStyle = c11;
      context!.fillRect(0, 0, t, t);
      const c12 = `#${text.slice(12, 18)}`;
      context!.fillStyle = c12;
      context!.fillRect(t, 0, t, t);

      const c21 = `#${text.slice(24, 30)}`;
      context!.fillStyle = c21;
      context!.fillRect(0, t, t, t);
      const c22 = `#${text.slice(30, 36)}`;
      context!.fillStyle = c22;
      context!.fillRect(t, t, t, t);

      // do something here with the canvas
    } else if (ref.current) {
      const context = ref.current.getContext('2d');
      const color = `#${text.slice(6, 12)}`;
      context!.fillStyle = color;
      // context.fillRect(x,y,width,height)
      context!.fillRect(0, 0, w, w);
      const colorDownside = `#${text.slice(text.length - 6, text.length)}`;
      context!.fillStyle = colorDownside;
      context!.fillRect(0, (25 / 40) * w, w, (16 / 40) * w);
      context!.fillStyle = '#111';
      context!.font = `bold ${(15 / 40) * w}px monospace`;
      // if (color === '#000000') {
      //   context.fillStyle = '#fff';
      // }
      context!.fillStyle = invertColor(color, true);
      context!.textAlign = 'center';
      context!.fillText(text.slice(0, 4), (20 / 40) * w, (19 / 40) * w);
      // do something here with the canvas
    }
  }, [text, type, w]);

  return <canvas height={w} width={w} data-pubkey={text} ref={ref} />;
}

export default CanvasPic;
