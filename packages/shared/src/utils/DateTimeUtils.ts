import { DateTime } from 'luxon';

export class DateTimeUtils {
  public static getTimeAgo(timestamp: Date): string {
    const now = DateTime.now();
    const past = DateTime.fromJSDate(timestamp);

    const diffInSeconds = now.diff(past, 'seconds').seconds;
    const diffInMinutes = now.diff(past, 'minutes').minutes;
    const diffInHours = now.diff(past, 'hours').hours;
    const diffInDays = now.diff(past, 'days').days;

    if (diffInSeconds < 60) {
      return `${Math.floor(diffInSeconds)} seconds ago`;
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} minutes ago`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} hours ago`;
    } else if (diffInDays < 2) {
      return 'yesterday';
    } else if (diffInDays < 7) {
      return `${Math.floor(diffInDays)} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else if (diffInDays < 365) {
      const months = Math.floor(diffInDays / 30);
      return `${months} month${months > 1 ? 's' : ''} ago`;
    } else {
      const years = Math.floor(diffInDays / 365);
      return `${years} year${years > 1 ? 's' : ''} ago`;
    }
  }

  public static isValidDateString(s: string): boolean {
    const date = new Date(s);
    return !isNaN(date.getTime());
  }

  public static toDateString(date: Date, timezone?: string): string {
    return date.toLocaleDateString('en-CA', { timeZone: timezone });
  }

  public static getTodayString(timezone: string): string {
    return DateTimeUtils.toDateString(DateTime.now().toJSDate(), timezone);
  }

  public static getYesterdayString(timezone: string): string {
    return DateTimeUtils.toDateString(DateTime.now().minus({ days: 1 }).toJSDate(), timezone);
  }
}
