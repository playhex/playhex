/* eslint-disable @typescript-eslint/no-unused-vars */
import { Logger, QueryRunner } from 'typeorm';
import winston from 'winston';

const { DATABASE_LOG_QUERIES_FILE } = process.env;

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
    ),
    transports: [
        new winston.transports.File({ filename: DATABASE_LOG_QUERIES_FILE ?? 'hex-sql.log' }),
    ],
});

const shortenQuery = (query: string): string => {
    return query
        // collapse long select
        .replace(
            /(SELECT\s+)(.+?)(\s+FROM\b)/gi,
            (_, select, columns, from) => columns.length > 50
                ? `${select}${columns.slice(0, 50)}...${from}`
                : `${select}${columns}${from}`
            ,
        )

        // remove backticks
        .replace(/`/g, '')
    ;
};

export class TypeOrmLogger implements Logger
{
    logQuery(query: string, parameters?: unknown[], queryRunner?: QueryRunner)
    {
    }

    logQueryError(error: string | Error, query: string, parameters?: unknown[], queryRunner?: QueryRunner)
    {
        logger.error(shortenQuery(query), { parameters, error: error instanceof Error ? error.message : error });
    }

    logQuerySlow(time: number, query: string, parameters?: unknown[], queryRunner?: QueryRunner)
    {
        logger.warn(shortenQuery(query), { time, parameters });
    }

    logSchemaBuild(message: string, queryRunner?: QueryRunner)
    {
    }

    logMigration(message: string, queryRunner?: QueryRunner)
    {
    }

    log(level: 'log' | 'info' | 'warn', message: unknown, queryRunner?: QueryRunner)
    {
    }
}
