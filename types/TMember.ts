class TMember {
  constructor(id: string) {
    this.userId = id;
    this.name = 'name' + id;
    this.userId = 'username' + id;
  }
  userId: string;
  name: string;
  username: string;
  avatarSrc: string;
  peopleRole: string;
  powerLevel: number;
  getAvatarUrl(arg0: string, arg1: number, arg2: number, arg3: string) {
    return '';
  }
}
export default TMember;
