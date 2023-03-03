import './Copy.css';
import Check from '../../icons/Check';
import CopyIcon from '../../icons/Copy';
import { useCopy } from '../../hooks/useCopy';
import React from 'react';

export interface CopyProps {
  text: string;
  maxSize?: number;
}
export default function Copy({ text, maxSize = 32 }: CopyProps) {
  const { copy, copied } = useCopy();
  const sliceLength = maxSize / 2;
  const trimmed =
    text.length > maxSize ? `${text.slice(0, sliceLength)}...${text.slice(-sliceLength)}` : text;

  return (
    <div className="flex flex-row copy" onClick={() => copy(text)}>
      <span className="body">{trimmed}</span>
      <span className="icon" style={{ color: copied ? 'var(--success)' : 'var(--highlight)' }}>
        {copied ? <Check width={14} height={14} /> : <CopyIcon width={14} height={14} />}
      </span>
    </div>
  );
}
