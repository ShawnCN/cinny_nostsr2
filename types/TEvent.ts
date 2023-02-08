class TEvent {
  event: {
    state_key: string;
  };
  constructor() {}
  getTs() {
    return 1;
  }
  getType() {
    return 'type';
  }
  getRelation() {
    return {
      rel_type: 'm.replace',
    };
  }
  getSender() {
    return '11';
  }
  isRedacted() {
    return false;
  }
  getId() {
    return 'id';
  }
  getContent() {
    return {
      topic: 'topic',
      suggested: 'suggested',
    };
  }
}
export default TEvent;
