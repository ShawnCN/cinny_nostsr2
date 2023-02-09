import initMatrix from '../InitMatrix';

async function redactEvent(roomId, eventId, reason) {
  const mx = initMatrix.matrixClient;

  try {
    await mx.redactEvent(
      roomId,
      eventId,
      undefined,
      typeof reason === 'undefined' ? undefined : { reason }
    );
    return true;
  } catch (e: any) {
    throw new Error(e);
  }
}

async function sendReaction(roomId, toEventId, reaction, shortcode) {
  const mx = initMatrix.matrixClient;
  let content = {
    'm.relates_to': {
      event_id: toEventId,
      key: reaction,
      rel_type: 'm.annotation',
    },
  };
  if (typeof shortcode === 'string') content['shortcode'] = shortcode;
  try {
    await mx.sendEvent(roomId, 'm.reaction', content);
  } catch (e: any) {
    throw new Error(e);
  }
}

export { redactEvent, sendReaction };
