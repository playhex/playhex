let userId = localStorage.getItem('hex-user-id');

if (null === userId) {
    userId = (Math.random() + 1).toString(36).substring(2);
    localStorage.setItem('hex-user-id', userId);
}

export default userId;
