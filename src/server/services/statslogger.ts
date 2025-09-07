/* eslint-disable @stylistic/ts/member-delimiter-style */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable comma-dangle */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Logger, QueryRunner } from 'typeorm';

type QueryStats = {
    count: number;
    times: number[];
    lastExecution?: number;
};

export class StatsLogger implements Logger {
    private queryTimes: { [sql: string]: number[] } = {};

    logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    }

    logQueryError(
        error: string | Error,
        query: string,
    ) {
    }

    logQuerySlow(
        time: number,
        query: string,
        parameters?: any[],
        queryRunner?: QueryRunner,
    ) {
        if (!this.queryTimes[query]) {
            this.queryTimes[query] = [];
        }

        this.queryTimes[query].push(time);
    }

    dump()
    {
        const stats: { sql: string, total: number, median: number, avg: number, sum: number }[] = [];
        for (const sql in this.queryTimes) {
            console.log(sql.substring(0, 128));

            const times = this.queryTimes[sql];
            const { length } = times;

            times.sort();
            const median = (length % 2) === 0
                ? Math.round((times[length / 2 - 1] + times[length / 2]) / 2)
                : times[(length - 1) / 2]
            ;

            const sum = times.reduce((acc, curr) => acc + curr, 0);

            console.log('    - total calls:', length);
            console.log('    - median:', median, 'ms');
            console.log('    - avg:', Math.round(sum / length), 'ms');
            console.log('    - sum:', sum, 'ms');
            console.log('    - details times:', times);
        }
    }

    logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    }

    logMigration(message: string, queryRunner?: QueryRunner) {
    }

    log(level: 'log' | 'info' | 'warn', message: any, queryRunner?: QueryRunner) {
    }
}
