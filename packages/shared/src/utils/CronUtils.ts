import { parseExpression } from 'cron-parser';
import { isValidCron } from 'cron-validator';
import cronstrue from 'cronstrue';
import moment from 'moment-timezone';
import { ALogger } from '~shared/logging/ALogger';

export interface CronSchedule {
  hour: number;
  minute: number;
  timezone: string;
  weekdays: (0 | 1 | 2 | 3 | 4 | 5 | 6)[]; // represents 0-6 for Sunday-Saturday
}

export class CronUtils {
  public static isValidCronExpression(cronExpression: string): boolean {
    return isValidCron(cronExpression, { alias: true, seconds: false });
  }

  public static getAdjustedCron(cronExpression: string, minutesToSubtract: number): string {
    const interval = parseExpression(cronExpression);
    const nextDate = interval.next();
    nextDate.setMinutes(nextDate.getMinutes() - minutesToSubtract);
    const adjustedMinutes = nextDate.getMinutes();
    const adjustedHours = nextDate.getHours();
    const [, , dayOfMonth, month, dayOfWeek] = cronExpression.split(' ');
    return `${adjustedMinutes} ${adjustedHours} ${dayOfMonth} ${month} ${dayOfWeek}`;
  }

  // TODO: improve this translation for better wording for weekdays (current: "At 05:00 PM, only on Monday, Tuesday, Wednesday, Thursday, and Friday.")
  public static translateCronToEnglish(cronExpression: string, timezone?: string): string {
    const cron = timezone ? this.UTCExpressionToLocalExpression(cronExpression, timezone) : cronExpression;
    try {
      return cronstrue.toString(cron);
    } catch (error) {
      ALogger.error('Error translating cron expression:', error);
      return 'Invalid cron expression';
    }
  }

  public static expressionToCronSchedule(cronExpression: string, cronTimezone: string): CronSchedule {
    if (!this.isValidCronExpression(cronExpression)) throw new Error('Invalid cron expression');

    const parts = cronExpression.split(' ');
    const [minute, hour, , , dayOfWeek] = parts;
    const weekdays =
      dayOfWeek === '*'
        ? ([0, 1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[])
        : (dayOfWeek
            .split(',')
            .map((day) => {
              const parsedDay = parseInt(day);
              if (!Number.isInteger(parsedDay) || parsedDay < 0 || parsedDay > 6) {
                ALogger.warn({ error: 'Invalid day of week', dayOfWeek });
                return undefined;
              }
              return parsedDay;
            })
            .filter((day) => day !== undefined) as (0 | 1 | 2 | 3 | 4 | 5 | 6)[]);

    return { hour: parseInt(hour), minute: parseInt(minute), timezone: cronTimezone, weekdays };
  }

  public static cronScheduleToExpression(schedule: CronSchedule): string {
    const { hour, minute, weekdays } = schedule;
    const dayOfWeek = weekdays.join(',');
    return `${minute} ${hour} * * ${dayOfWeek}`;
  }

  public static cronScheduleToTime(schedule?: CronSchedule): string | undefined {
    if (!schedule) return undefined;

    const { hour, minute, timezone } = schedule;
    const date = moment.tz({ hour, minute }, timezone);
    return date.format('HH:mm');
  }

  public static localExpressionToUTCExpression(cronExpression: string, localTimezone: string): string {
    const [minute, hour, , , dayOfWeek] = cronExpression.split(' ');
    const date = moment.tz({ hour: parseInt(hour), minute: parseInt(minute) }, localTimezone);
    const utcDate = date.utc();
    return `${utcDate.minute()} ${utcDate.hour()} * * ${dayOfWeek}`;
  }

  public static UTCExpressionToLocalExpression(cronExpression: string, localTimezone: string): string {
    const [minute, hour, , , dayOfWeek] = cronExpression.split(' ');
    const date = moment.utc({ hour: parseInt(hour), minute: parseInt(minute) });
    const localDate = date.tz(localTimezone);
    return `${localDate.minute()} ${localDate.hour()} * * ${dayOfWeek}`;
  }
}
