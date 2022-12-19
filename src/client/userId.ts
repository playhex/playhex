import randomId from '../shared/game-engine/randomId';

let userId = localStorage.getItem('hex-user-id');

if (null === userId) {
    userId = randomId();
    localStorage.setItem('hex-user-id', userId);
}

export default userId;
