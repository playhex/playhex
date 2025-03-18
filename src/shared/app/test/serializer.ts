/* eslint-disable @typescript-eslint/no-explicit-any */
import { denormalize, normalize } from '../serializer.js';
import assert from 'assert';
import { describe, it } from 'mocha';

// import { inspect } from 'util';

// const debug = (input: any): any => {
//     console.log('=== input');
//     let data = input;
//     console.log(inspect(data, false, null, true));

//     console.log('=== normalized');
//     data = normalize(data);
//     console.log(inspect(data, false, null, true));

//     console.log('=== json');
//     data = JSON.stringify(data);
//     console.log(inspect(data, false, null, true));

//     console.log('=== parsed');
//     data = JSON.parse(data);
//     console.log(inspect(data, false, null, true));

//     console.log('=== denormalized');
//     data = denormalize(data);
//     console.log(inspect(data, false, null, true));

//     return data;
// };

const transmit = (input: any): any => {
    let data = input;

    data = normalize(data);
    data = JSON.stringify(data);
    data = JSON.parse(data);
    data = denormalize(data);

    return data;
};

describe('serializer', () => {
    it('normalizes and denormalizes keeping Date object', () => {
        const input = {
            d: new Date('2020-03-31 00:00:00Z'),
        };

        const output = transmit(input);

        assert.strictEqual(output.d.getTime(), input.d.getTime());
    });

    it('normalizes a top level array', () => {
        const inputs: [string, { d: Date }, number[]] = [
            'noop',
            {
                d: new Date('2020-03-31 00:00:00Z'),
            },
            [
                1,
                2,
                3,
            ],
        ];

        const outputs = transmit(inputs);

        assert.strictEqual(outputs[0], 'noop');

        assert.notStrictEqual(typeof outputs[1].d, 'string', 'should be an instance of Date now');
        assert.strictEqual(outputs[1].d.getTime(), inputs[1].d.getTime());
    });

    it('normalizes non-objects like a normal JSON.stringify', () => {
        const input = new Date('2020-03-31 00:00:00Z');
        const output = transmit(input);

        assert.strictEqual(output, '2020-03-31T00:00:00.000Z');
    });

    it('normalizes non-objects in arrays like a normal JSON.stringify', () => {
        const inputs = [
            new Date('2020-03-31 00:00:00Z'),
        ];

        const outputs = transmit(inputs);

        assert.strictEqual(outputs[0], '2020-03-31T00:00:00.000Z');
    });
});
