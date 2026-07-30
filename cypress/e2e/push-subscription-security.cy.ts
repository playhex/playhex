/*
 * Security regression test for PUT /api/push-subscriptions.
 *
 * The endpoint used to bind the raw web-push PushSubscription type and Object.assign it
 * onto the entity, letting a client set the primary key `id` (or `playerId`/`player`) and
 * overwrite another player's subscription row. The body is now bound to the entity with a
 * dedicated validation group, so identity fields are rejected and can never be assigned
 * from the request body.
 *
 * These tests hit the real API (like auth.cy.ts), no mocks.
 */

const randomString = (): string => (1e24 * Math.random()).toString(36);

const validSubscription = (endpoint: string) => ({
    endpoint,
    expirationTime: null,
    keys: {
        p256dh: 'BEl' + randomString(),
        auth: 'aUtH' + randomString(),
    },
});

/**
 * Create a fresh registered account. Signup also logs the browser session in,
 * so subsequent cy.request() calls act as this player until another login.
 */
const signup = (): Cypress.Chainable<{ pseudo: string, password: string, publicId: string }> => {
    const pseudo = 'push-' + randomString();
    const password = 'test-password';

    return cy
        .request('POST', '/api/auth/signup', { pseudo, password })
        .then(res => {
            expect(res.status).to.eq(200);

            return { pseudo, password, publicId: res.body.publicId };
        })
    ;
};

const loginAs = (account: { pseudo: string, password: string }) =>
    cy.request('POST', '/api/auth/login', { pseudo: account.pseudo, password: account.password })
        .then(res => expect(res.status).to.eq(200))
;

const putSubscription = (body: object) =>
    cy.request({
        method: 'PUT',
        url: '/api/push-subscriptions',
        body,
        failOnStatusCode: false,
    })
;

describe('Push subscription security (PUT /api/push-subscriptions)', () => {
    it('accepts a valid subscription and never leaks identity fields', () => {
        signup();

        putSubscription(validSubscription('https://push.example.com/valid-' + randomString()))
            .then(res => {
                expect(res.status).to.eq(200);

                // Response must expose only the safe fields, never id / playerId / keys.
                expect(res.body).to.have.keys(['endpoint', 'expirationTime', 'createdAt']);
                expect(res.body).to.not.have.any.keys(['id', 'playerId', 'player', 'keys']);
            })
        ;
    });

    it('rejects a body that tries to set the primary key or owner fields', () => {
        signup();

        const base = validSubscription('https://push.example.com/inject-' + randomString());

        // id / playerId / player carry no validator -> forbidNonWhitelisted -> 400
        putSubscription({ ...base, id: 1 }).its('status').should('eq', 400);
        putSubscription({ ...base, playerId: 1 }).its('status').should('eq', 400);
        putSubscription({ ...base, player: { id: 1 } }).its('status').should('eq', 400);
    });

    it('rejects malformed or oversized bodies', () => {
        signup();

        const endpoint = 'https://push.example.com/malformed-' + randomString();

        // Missing keys
        putSubscription({ endpoint }).its('status').should('eq', 400);

        // Extra property inside keys (nested whitelist)
        putSubscription({ endpoint, keys: { p256dh: 'a', auth: 'b', evil: 'x' } })
            .its('status').should('eq', 400);

        // Endpoint longer than the 512 column limit
        putSubscription(validSubscription('https://push.example.com/' + 'a'.repeat(600)))
            .its('status').should('eq', 400);
    });

    it('does not let a second account overwrite the first account subscription', () => {
        const victimEndpoint = 'https://push.example.com/victim-' + randomString();

        // Victim subscribes.
        signup().then(victim => {
            putSubscription(validSubscription(victimEndpoint)).its('status').should('eq', 200);

            // Attacker (a different account) tries to hijack the victim row by guessing ids.
            signup().then(() => {
                for (const id of [1, 2, 3, 50, 9999]) {
                    putSubscription({
                        ...validSubscription('https://push.attacker.example/pwned-' + randomString()),
                        id,
                    }).its('status').should('eq', 400);
                }

                // Back to victim: their subscription list is untouched.
                loginAs(victim);

                cy.request('GET', '/api/push-subscriptions').then(res => {
                    expect(res.status).to.eq(200);
                    expect(res.body).to.be.an('array').with.length(1);
                    expect(res.body[0].endpoint).to.eq(victimEndpoint);
                    expect(res.body[0]).to.not.have.any.keys(['id', 'playerId', 'player', 'keys']);
                });
            });
        });
    });
});
