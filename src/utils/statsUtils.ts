import { Task } from '../types';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isWithinInterval } from 'date-fns';

export function calculateWorkerStats(workerId: string, tasks: Task[]) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);

  const workerTasks = tasks.filter(task => task.worker_id === workerId);
  
  const allTime = workerTasks.length;
  
  const weekly = workerTasks.filter(task => {
    const taskDate = new Date(task.created_at);
    return isWithinInterval(taskDate, { start: weekStart, end: weekEnd });
  }).length;
  
  const daily = workerTasks.filter(task => {
    const taskDate = new Date(task.created_at);
    return isWithinInterval(taskDate, { start: dayStart, end: dayEnd });
  }).length;

  return { allTime, weekly, daily };
}