describe('Chat', () => {
    it('can post chat message', () => {
        cy.visit('/');
        cy.get('.menu-top').contains(/Guest \d+/);

        cy.createAIGameWithRandom();

        cy.get('.chat-input input').type('Hello, have a good game!');
        cy.contains('.chat-input button', 'Send').click();

        cy.contains('.chat-messages', /\d+:\d+ Guest \d+ Hello, have a good game!/);
        cy.get('.chat-input input').should('have.value', '');

        // Chat messages stays after page refresh
        cy.reload();
        cy.contains('.chat-messages', /\d+:\d+ Guest \d+ Hello, have a good game!/);
    });

    it('shows previous chat message on game page load', () => {
        cy.mockSocketIO();
        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('chat/game-playing.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains(/\d+:48 Guest 7614 Hello, I am a watcher/);
        cy.contains(/\d+:48 Guest 6569 Hi, I am your opponent, ready \?/);
        cy.contains(/\d+:49 aaa Hello, ready. Let's play/);

        cy.contains('.chat-messages .text-body', 'Guest 7614');
        cy.contains('.chat-messages .text-primary', 'Guest 6569');
        cy.contains('.chat-messages .text-danger', 'aaa');

        cy.contains('Close').click();

        cy.contains('.chat-messages .text-body', 'Guest 7614').should('not.visible');
    });

    it('shows chat message length limit when I am about to reach it, instead of crashing when sending a too long message', () => {
        cy.mockSocketIO();
        cy.intercept('/api/auth/me-or-guest', {
            fixture: 'game/me-or-guest.json',
        });

        cy.visit('/games/00000000-0000-0000-0000-000000000000');

        cy.contains('Loading game…');
        cy.receiveGameUpdate('chat/game-playing.json');
        cy.contains('Loading game…').should('not.exist');

        cy.contains(/\d+ \/ 1000 characters/).should('not.exist');
        cy.get('.chat-input input').click()
            .invoke('val', 'https://hexworld.org/board/#29r9c1,q22p24g23o23w23r23x18p4d15n5c14l6f8g6h7i5j6i7i6k4l5k6k5h21f22g20e21f19h20g21g19f20d20e18f18e19d18d19b20h24f25c20b21c21b22c22b23c23b24c24b25c26c25d25d24f24e24e25g24f23i21j23i23i24j21j22h22e27g26f28h27h26g27i28h28q5m5m6o5r6m13o4i12i20k19j18i19j19l17k16m15l14n13l13m12l12m11l11o7u6q6r5p5aa6z9x10ab13aa17z19aa22t26v20v19s15u13x7y4x3q1i2f3c8e11j10m8o9o11o14o17q19t18t20t23s25q28w28y26z24aa20ab18aa18z16x15y13z12ac7ab6y9w9t11r9t7u5t3s3q3p2o3n2k3j3i3h4g4f5e9f10g11k9l9n9n10m10o10p10q10r10q12n17n18m21l24l26m29q26r25s24t22t21u20v22x20y20y22y23aa19ab17ab14aa13aa11aa9z5z4w5w6u8t10s11r12r13u14s17o20o18p16i16h16j13h13f14f12f11c11b9d7f6o1p1i1f2v9v11w13y11aa10ac9ab9aa8ab7ac5ac4ac3ab1z1w2v2u4u9z27v27t27u26w25x25u28s29r27i27k26e26d26d28c28b27b26h18j16k13j14i15g15e16d16b18a17b15d13d12b12a12b10d9e8f7d6e5e4e2c2b5b6k8r8t9s10q11p11p12p13q13q14q15r15t13u11v10w10x9y8z6y7x8w8w7x6y5x5x4w4')
            .type(' yes that was a long link that should fit in chat message. We do not need limits!', { timeout: 10000 })
        ;

        cy.contains('986 / 1000 characters');
    });
});
