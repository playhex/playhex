import { execSync } from 'child_process';

const commitRef = {
    date: '',
    version: '',
};

commitRef.date = execSync('git show --no-patch --format=%cD')
    .toString()
    .split(' ')
    .slice(1, 4)
    .join(' ')
;

commitRef.version = execSync('git show --no-patch --format=%at')
    .toString()
    .trim()
;

export {
    commitRef,
};
