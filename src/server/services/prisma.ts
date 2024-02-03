import { PrismaClient } from '@prisma/client';

/*
 * To show SQL queries while debugging, do:

    const prisma = new PrismaClient({
        // TODO remove this
        log: ['query', 'info', 'warn', 'error'],
    });

 */

const prisma = new PrismaClient({
    // TODO remove this
    log: ['query', 'info', 'warn', 'error'],
});

export default prisma;
