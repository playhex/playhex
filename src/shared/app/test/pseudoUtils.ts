import assert from 'assert';
import { pseudoSlug } from '../pseudoUtils.js';
import { describe, it } from 'mocha';

describe('pseudoUtils', () => {
    describe('pseudoSlug', () => {
        it('slugify username', () => {
            const testHelloWorld = (expected: string, pseudo: string): void => assert.strictEqual(
                pseudoSlug(pseudo),
                expected,
                `Failed to assert that "${pseudo}" slugs to "${expected}".`,
            );

            testHelloWorld('hello-world', 'Hello World');
            testHelloWorld('hello-world', 'hello world');
            testHelloWorld('hello-world', 'hello-world');
            testHelloWorld('hello-world', 'hello_world');
            testHelloWorld('hello-world', 'hello  world');
            testHelloWorld('hello-world', 'hello#world');
            testHelloWorld('hello-world', 'hello(world)');
            testHelloWorld('hello-world', 'hello\'world');
            testHelloWorld('hello-world', 'hello"world');
            testHelloWorld('hello-world', '_hello_world_');
            testHelloWorld('hello-world', 'Héllo world');
            testHelloWorld('hello-world', 'Hello/world');
            testHelloWorld('hello-world', 'Hello////world');
            testHelloWorld('hello-world', 'Hello.world');
            testHelloWorld('hello-world', 'Hello@world');
            testHelloWorld('hello-world', 'Hello&world');
            testHelloWorld('hello-world', 'Hello world--');

            testHelloWorld('bjjcvjgjxb-jjjfkjkdcuf9-95', 'Bjjcvjgjxb jjjfkjkdcuf9#95&');
        });
    });
});
