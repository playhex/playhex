import { execSync } from 'child_process';

const commitRef = {
    date: '',
};

commitRef.date = execSync('git show --no-patch --format=%cD')
    .toString()
    .split(' ')
    .slice(1, 4)
    .join(' ')
;

export {
    commitRef,
};
