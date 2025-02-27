import readline from 'node:readline/promises';
import { stdin, stdout } from 'node:process';

export const mustAnswerYes = async (question: string): Promise<void> => {
    const rl = readline.createInterface({ input: stdin, output: stdout });
    const answer = await rl.question(question + ' Type "yes" to continue: ');

    rl.close();

    if ('yes' !== answer) {
        throw new Error('Aborting (type "yes" if you wanted to continue).');
    }
};
