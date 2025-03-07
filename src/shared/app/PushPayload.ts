import { IsDate, IsOptional, IsString } from 'class-validator';

/**
 * Sent from server, through push services, to service worker.
 *
 * Will be used to create a Notification.
 */
export class PushPayload
{
    /**
     * Description, second line of notification
     */
    @IsString()
    body: string;

    /**
     * First line of notification
     */
    @IsString()
    title = 'PlayHex';

    /**
     * Relative url we wish to redirect on click on notification
     */
    @IsString()
    @IsOptional()
    goToPath: null | string = null;

    /**
     * Date relative to the event that trigger this push
     */
    @IsDate()
    date: Date = new Date();

    /**
     * Locale used for texts in this notification
     */
    @IsString()
    lang = 'en';

    constructor(body: string)
    {
        this.body = body;
    }
}
