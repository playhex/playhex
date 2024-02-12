import { PrismaClient } from '@prisma/client';

/*
 * To show SQL queries while debugging, do:

    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

 */

const prisma = new PrismaClient();

export default prisma;
