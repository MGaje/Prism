/**
 * Contains utility functions used throughout the application.
 */
export class Utility
{
    static fromUTCToLocalDate(utcDate: Date): Date
    {
        const offsetMs: number = new Date().getTimezoneOffset() * 60 * 1000;
        return new Date(utcDate.valueOf() - offsetMs);
    }
}