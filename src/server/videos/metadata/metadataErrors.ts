/**
 * Link is valid, but source says there is no video here.
 */
export class VideoNotFoundError extends Error {}

/**
 * Could not get any information from this link.
 */
export class VideoMetadataUnavailableError extends Error {}
