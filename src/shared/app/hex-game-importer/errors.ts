/**
 * Error that should be displayed to player
 */
export class ImportUserError extends Error {}

export class SourceNotSupportedError extends ImportUserError
{
    constructor(source: string)
    {
        super(
            'Source not supported: '
            + source.substring(0, 64)
            + (source.length > 64 ? '...' : ''),
        );
    }
}
