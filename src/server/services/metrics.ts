import { InfluxDBClient, Point } from '@influxdata/influxdb3-client';
import logger from './logger.js';

let influxDBClient: null | InfluxDBClient = null;

const { INFLUX_HOST, INFLUX_TOKEN, INFLUX_DATABASE } = process.env;

if (INFLUX_HOST && INFLUX_TOKEN && INFLUX_DATABASE) {
    influxDBClient = new InfluxDBClient({
        host: INFLUX_HOST,
        token: INFLUX_TOKEN,
        database: INFLUX_DATABASE,
    });
}

export const isMonitoringEnabled = (): boolean => influxDBClient !== null;

type MetricsTags = {
    ai_time_to_respond: {
        engine: string;
        level: number;
        boardsize: number;
        gameId: string;
    };

    connected_sockets: {
        count: number;
    };
};

export const sendConnectedSocketsPoint = (active: number, inactive: number): void => {
    if (influxDBClient === null) {
        return;
    }

    const point = Point.measurement('connected_sockets')
        .setIntegerField('value', active)
        .setIntegerField('inactive', inactive)
    ;

    logger.debug('sending metric', {
        lineProtocol: point.toLineProtocol(),
    });

    influxDBClient.write(point).catch(reason => {
        logger.warning('Error while sending data to influxDB', { reason });
    });
};

export class TimeMeasureMetric<T extends keyof MetricsTags>
{
    private tStart: Date;
    private timeout: ReturnType<typeof setTimeout>;
    private isFinished = false;

    constructor(
        private name: T,
        private tags: MetricsTags[T],
    ) {
        if (influxDBClient === null) {
            return;
        }

        this.tStart = new Date();

        this.timeout = setTimeout(() => {
            this.finished(false);
        }, 60000);
    }

    finished(success = true): void
    {
        if (influxDBClient === null || this.isFinished) {
            return;
        }

        this.isFinished = true;

        clearInterval(this.timeout);

        const tEnd = new Date();
        const point = Point.measurement(this.name)
            .setTag('success', success ? 'yes' : 'no')
            .setFloatField('value', (tEnd.getTime() - this.tStart.getTime()) / 1000)
        ;

        for (const [key, value] of Object.entries(this.tags)) {
            point.setTag(key, '' + value);
        }

        logger.debug('sending metric', {
            lineProtocol: point.toLineProtocol(),
        });

        influxDBClient.write(point).catch(reason => {
            logger.warning('Error while sending data to influxDB', { reason });
        });
    }
}
