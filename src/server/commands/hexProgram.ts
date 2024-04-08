import { Command } from '@commander-js/extra-typings';

const hexProgram = new Command();

hexProgram
    .name('Hex')
    .description('Commands to manage Hex instance.')
    .version('1.0.0')
;

export default hexProgram;
