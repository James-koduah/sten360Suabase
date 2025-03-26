import { startOfWeek, endOfWeek, format } from 'date-fns';

export function getWeekNumber(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

export function getWeekRange(weekNumber: number) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const januaryFirst = new Date(currentYear, 0, 1);
  const firstWeekDay = januaryFirst.getDay();
  const daysToAdd = (weekNumber - 1) * 7 - firstWeekDay + 1;
  
  const start = new Date(currentYear, 0, daysToAdd);
  const end = new Date(currentYear, 0, daysToAdd + 6);
  
  return { start, end };
}

export function formatDate(date: Date): string {
  return format(new Date(date), 'EEEE, d MMMM yyyy');
}

export function getCurrentWeekRange() {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }),
    end: endOfWeek(now, { weekStartsOn: 1 })
  };
}