import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';
import { useUI } from '../context/UIContext';
import { CURRENCIES } from '../utils/constants';
import { startOfWeek, endOfWeek, startOfDay, format, isAfter, getWeek, getYear, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, addMonths, addYears } from 'date-fns';
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  MinusCircle,
  Trash2
} from 'lucide-react';

const STATUS_LABELS = {
  pending: 'Pending',
  in_progress: 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
  cancelled: 'Cancelled'
} as const;

const STATUS_COLORS = {
  pending: {
    bg: 'bg-yellow-100',
    text: 'text-yellow-800',
    hover: 'hover:bg-yellow-200'
  },
  in_progress: {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    hover: 'hover:bg-blue-200'
  },
  completed: {
    bg: 'bg-green-100',
    text: 'text-green-800',
    hover: 'hover:bg-green-200'
  },
  delayed: {
    bg: 'bg-red-100',
    text: 'text-red-800',
    hover: 'hover:bg-red-200'
  },
  cancelled: {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    hover: 'hover:bg-gray-200'
  }
} as const;

type TaskStatus = keyof typeof STATUS_LABELS;

interface Task {
  id: string;
  worker_id: string;
  project_id: string;
  due_date: string;
  amount: number;
  status: 'pending' | 'in_progress' | 'delayed' | 'completed' | 'cancelled';
  description?: string;
  completed_at?: string;
  created_at: string;
  notes?: string;
  deductions?: Deduction[];
  late_reason?: string;
  delay_reason?: string;
  project?: {
    id: string;
    name: string;
  };
  worker?: {
    id: string;
    name: string;
  };
}

interface Deduction {
  id: string;
  task_id: string;
  amount: number;
  reason: string;
  created_at: string;
}

interface Worker {
  id: string;
  name: string;
}

interface WorkerProject {
  id: string;
  worker_id: string;
  project_id: string;
  rate: number;
  project: {
    id: string;
    name: string;
  };
}

interface TasksListProps {
  status?: TaskStatus;
}

export default function TasksList({ status }: TasksListProps) {
  const { organization } = useAuthStore();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [workerProjects, setWorkerProjects] = useState<WorkerProject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showDeductions, setShowDeductions] = useState<string | null>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateFilterType, setDateFilterType] = useState<'week' | 'month' | 'year'>('week');
  
  // Memoize the date range calculation
  const dateRange = useMemo(() => {
    switch (dateFilterType) {
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate)
        };
      case 'year':
        return {
          start: startOfYear(currentDate),
          end: endOfYear(currentDate)
        };
    }
  }, [currentDate, dateFilterType]);

  const { start: dateRangeStart, end: dateRangeEnd } = dateRange;

  const handleDateChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      switch (dateFilterType) {
        case 'week':
          return direction === 'prev' ? addWeeks(newDate, -1) : addWeeks(newDate, 1);
        case 'month':
          return direction === 'prev' ? addMonths(newDate, -1) : addMonths(newDate, 1);
        case 'year':
          return direction === 'prev' ? addYears(newDate, -1) : addYears(newDate, 1);
      }
    });
  };

  const getDateRangeLabel = () => {
    switch (dateFilterType) {
      case 'week':
        return `Week ${getWeek(currentDate, { weekStartsOn: 1 })}, ${getYear(currentDate)}`;
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case 'year':
        return format(currentDate, 'yyyy');
    }
  };

  const getDateRangeSubtitle = () => {
    switch (dateFilterType) {
      case 'week':
        return `${format(dateRangeStart, 'MMM d')} - ${format(dateRangeEnd, 'MMM d')}`;
      case 'month':
        return `${format(dateRangeStart, 'MMM d')} - ${format(dateRangeEnd, 'MMM d')}`;
      case 'year':
        return `${format(dateRangeStart, 'MMM d, yyyy')} - ${format(dateRangeEnd, 'MMM d, yyyy')}`;
    }
  };

  const now = new Date();
  const [delayReason, setDelayReason] = useState('');
  const [newTask, setNewTask] = useState({
    worker_id: '',
    project_id: '',
    description: '',
    due_date: new Date().toISOString().split('T')[0],
    late_reason: ''
  });
  const [newDeduction, setNewDeduction] = useState({
    amount: 0,
    reason: ''
  });
  const { confirm, addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : '';

  const loadData = useCallback(async () => {
    if (!organization?.id) return;
    const orgId = organization.id;

    try {
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('id, name')
        .eq('organization_id', orgId);

      if (workersError) throw workersError;
      setWorkers(workersData || []);

      let query = supabase
        .from('tasks')
        .select(`
          *,
          deductions (*),
          project:projects(
            id,
            name
          ),
          worker:workers(
            id,
            name
          )
        `)
        .eq('organization_id', orgId)
        .gte('created_at', dateRangeStart.toISOString())
        .lte('created_at', dateRangeEnd.toISOString())
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data: tasksData, error: tasksError } = await query;

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [organization?.id, dateRangeStart, dateRangeEnd, status]);

  const loadWorkerProjects = useCallback(async (workerId: string) => {
    const orgId = organization?.id;
    if (!orgId) return;

    try {
      const { data, error: projectsError } = await supabase
        .from('worker_project_rates')
        .select(`
          id,
          worker_id,
          project_id,
          rate,
          project:projects!inner(
            id,
            name
          )
        `)
        .eq('worker_id', workerId)
        .returns<WorkerProject[]>();

      if (projectsError) throw projectsError;
      setWorkerProjects(data || []);
    } catch (error) {
      console.error('Error loading worker projects:', error);
    }
  }, [organization?.id]);

  useEffect(() => {
    let mounted = true;
    
    if (organization?.id) {
      loadData();
    }

    return () => {
      mounted = false;
    };
  }, [loadData]);

  useEffect(() => {
    let mounted = true;
    
    if (!organization || !newTask.worker_id) return;
    loadWorkerProjects(newTask.worker_id);

    return () => {
      mounted = false;
    };
  }, [loadWorkerProjects, organization, newTask.worker_id]);

  const addTask = async () => {
    if (!organization || !newTask.worker_id || !newTask.project_id) return;

    const projectRate = workerProjects.find(wp => wp.project_id === newTask.project_id)?.rate || 0;
    const taskDate = new Date(newTask.due_date);
    const today = startOfDay(new Date());
    const needsLateReason = isAfter(today, taskDate);

    if (needsLateReason && !newTask.late_reason) {
      addToast({
        type: 'error',
        title: 'Invalid Date',
        message: 'Please provide a reason for adding a task for a past date.'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          organization_id: organization.id,
          worker_id: newTask.worker_id,
          project_id: newTask.project_id,
          description: newTask.description.trim() || null,
          due_date: newTask.due_date,
          amount: projectRate,
          status: 'pending',
          late_reason: needsLateReason ? newTask.late_reason : null
        }])
        .select(`
          *,
          deductions (*)
        `)
        .single();

      if (error) throw error;

      setTasks(prev => [data, ...prev]);
      setNewTask({
        worker_id: '',
        project_id: '',
        description: '',
        due_date: new Date().toISOString().split('T')[0],
        late_reason: ''
      });
      setShowAddTask(false);
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const confirmed = await confirm({
      title: 'Delete Task',
      message: 'Are you sure you want to delete this task? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: 'cancelled' })
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: 'cancelled' }
          : task
      ));
      
      addToast({
        type: 'success',
        title: 'Task Deleted',
        message: 'The task has been marked as cancelled.'
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete task. Please try again.'
      });
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: TaskStatus, reason?: string) => {
    try {
      const updateData: any = {
        status: newStatus
      };

      // Add status-specific fields
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'delayed') {
        updateData.delay_reason = reason;
      }
      
      // Always update status_changed_at
      updateData.status_changed_at = new Date().toISOString();

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev =>
        prev.map(task =>
          task.id === taskId ? { ...task, ...updateData } : task
        )
      );

      setShowStatusUpdate(null);
      setDelayReason('');

      addToast({
        type: 'success',
        title: 'Status Updated',
        message: `Task marked as ${STATUS_LABELS[newStatus]}`
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task status'
      });
    }
  };

  const addDeduction = async (taskId: string) => {
    if (!taskId || !newDeduction.amount || !newDeduction.reason) return;

    try {
      const { data, error } = await supabase
        .from('deductions')
        .insert([{
          task_id: taskId,
          amount: newDeduction.amount,
          reason: newDeduction.reason.trim()
        }])
        .select()
        .single();

      if (error) throw error;

      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            deductions: [...(task.deductions || []), data]
          };
        }
        return task;
      }));

      setNewDeduction({ amount: 0, reason: '' });
      setShowDeductions(null);
    } catch (error) {
      console.error('Error adding deduction:', error);
    }
  };

  const removeDeduction = async (taskId: string, deductionId: string) => {
    try {
      const { error } = await supabase
        .from('deductions')
        .delete()
        .eq('id', deductionId);

      if (error) throw error;

      setTasks(prev => prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            deductions: task.deductions?.filter(d => d.id !== deductionId)
          };
        }
        return task;
      }));
    } catch (error) {
      console.error('Error removing deduction:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">
          Tasks
        </h2>
        <div className="flex items-center gap-2">
          <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
            <Link
              to="/dashboard/tasks"
              className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                !status ? 'bg-gray-100 text-gray-900' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              All Tasks
            </Link>
            {Object.entries(STATUS_LABELS).map(([key, label]) => (
              <Link
                key={key}
                to={`/dashboard/tasks/${key}`}
                className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                  status === key
                    ? `${STATUS_COLORS[key as keyof typeof STATUS_COLORS].bg} ${STATUS_COLORS[key as keyof typeof STATUS_COLORS].text}`
                    : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
          <button
            onClick={() => setShowAddTask(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        </div>
      </div>

      {/* Date Navigation */}
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleDateChange('prev')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="text-sm">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-gray-900">
                  {getDateRangeLabel()}
                </span>
                <select
                  value={dateFilterType}
                  onChange={(e) => setDateFilterType(e.target.value as 'week' | 'month' | 'year')}
                  className="text-sm border rounded px-2 py-1"
                >
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
              <p className="text-gray-500 text-xs mt-0.5">
                {getDateRangeSubtitle()}
              </p>
            </div>
            <button
              onClick={() => handleDateChange('next')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              disabled={isAfter(dateRangeEnd, new Date())}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="text-sm text-gray-500">{tasks.length} tasks in this {dateFilterType}</div>
        </div>
      </div>

      {showAddTask && (
        <div className="bg-white shadow rounded-lg p-6 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Task</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Worker *</label>
              <select
                value={newTask.worker_id}
                onChange={(e) => setNewTask(prev => ({ ...prev, worker_id: e.target.value, project_id: '' }))}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="">Select a worker</option>
                {workers.map(worker => (
                  <option key={worker.id} value={worker.id}>{worker.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Project *</label>
              <select
                value={newTask.project_id}
                onChange={(e) => setNewTask(prev => ({ ...prev, project_id: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm disabled:bg-gray-50 disabled:text-gray-500"
                disabled={!newTask.worker_id}
              >
                <option value="">Select a project</option>
                {workerProjects.map(wp => (
                  <option key={wp.project_id} value={wp.project_id}>
                    {wp.project.name} - {currencySymbol} {wp.rate.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={newTask.description}
                onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                placeholder="Enter task description (optional)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
              <input
                type="date"
                value={newTask.due_date}
                onChange={(e) => setNewTask(prev => ({ ...prev, due_date: e.target.value }))}
                className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {isAfter(startOfDay(new Date()), new Date(newTask.due_date)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Reason for Late Entry
                </label>
                <textarea
                  value={newTask.late_reason}
                  onChange={(e) => setNewTask(prev => ({ ...prev, late_reason: e.target.value }))}
                  className="block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm h-20"
                  placeholder="Please provide a reason for adding this task after the date"
                  required
                />
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                onClick={() => setShowAddTask(false)}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={addTask}
                disabled={!newTask.worker_id || !newTask.project_id}
                className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 flex items-center transition-colors duration-200 shadow-sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-4 space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              {status ? 'No tasks found matching this status.' : 'No tasks found for this week.'}
            </div>
          ) : (
            tasks.map(task => {
              const totalDeductions = task.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
              const netAmount = task.amount - totalDeductions;
              
              return (
                <div key={task.id} className="bg-white border rounded-lg shadow-sm">
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start space-x-3">
                        <span className={`mt-1 ${task.status === 'completed' ? 'text-green-500' : task.status === 'delayed' ? 'text-red-500' : 'text-yellow-500'}`}>
                          {task.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : task.status === 'delayed' ? <XCircle className="h-5 w-5" /> : <MinusCircle className="h-5 w-5" />}
                        </span>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className={`text-lg font-medium ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                              {task.project?.name || 'Unknown Project'}
                            </h4>
                            <span className={`text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'}`}>
                              • Assigned to {task.worker?.name || 'Unknown Worker'}
                            </span>
                          </div>
                          {task.description && (
                            <p className={`text-sm ${task.status === 'cancelled' ? 'line-through text-gray-400' : 'text-gray-500'} mt-1`}>{task.description}</p>
                          )}
                          {task.late_reason && (
                            <p className="text-sm text-orange-600 mt-1">
                              Late entry: {task.late_reason}
                            </p>
                          )}
                          {task.status === 'delayed' && task.delay_reason && (
                            <p className="text-sm text-red-600 mt-1">
                              Delay reason: {task.delay_reason}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-500">
                            <span>Created: {format(new Date(task.created_at), 'MMM d, yyyy HH:mm')}</span>
                            {task.completed_at && (
                              <span>Completed: {format(new Date(task.completed_at), 'MMM d, yyyy HH:mm')}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">
                            Amount: {currencySymbol} {task.amount.toFixed(2)}
                          </p>
                          {totalDeductions > 0 && (
                            <>
                              <p className="text-sm font-medium text-red-600">
                                -{currencySymbol} {totalDeductions.toFixed(2)}
                              </p>
                              <p className="text-sm font-medium text-green-600">
                                Net: {currencySymbol} {netAmount.toFixed(2)}
                              </p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {task.status !== 'cancelled' && (
                            <button
                              onClick={() => setShowStatusUpdate(showStatusUpdate === task.id ? null : task.id)}
                              className={`px-3 py-1.5 text-xs font-medium rounded-full ${STATUS_COLORS[task.status].bg} ${STATUS_COLORS[task.status].text} ${STATUS_COLORS[task.status].hover}`}
                            >
                              {STATUS_LABELS[task.status]}
                            </button>
                          )}
                          {task.status !== 'cancelled' && (
                            <button
                              onClick={() => setShowDeductions(showDeductions === task.id ? null : task.id)}
                              className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                            >
                              <MinusCircle className="h-5 w-5" />
                            </button>
                          )}
                          {task.status !== 'cancelled' && (
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="p-2 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Status Update Form */}
                  {showStatusUpdate === task.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Update Status</h5>
                      <div className="space-y-3">
                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                          key !== 'cancelled' && (
                            <button
                              key={key}
                              onClick={() => {
                                if (key === 'delayed' && !delayReason) {
                                  addToast({
                                    type: 'error',
                                    title: 'Error',
                                    message: 'Please provide a reason for the delay'
                                  });
                                  return;
                                }
                                updateTaskStatus(task.id, key as TaskStatus, key === 'delayed' ? delayReason : undefined);
                              }}
                              className={`w-full px-3 py-2 text-sm font-medium rounded-md ${
                                task.status === key
                                  ? `${STATUS_COLORS[key].bg} ${STATUS_COLORS[key].text}`
                                  : 'bg-white text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              {label}
                            </button>
                          )
                        ))}
                        {showStatusUpdate === task.id && (
                          <div className="mt-3">
                            <label className="block text-sm font-medium text-gray-700">
                              Delay Reason
                            </label>
                            <textarea
                              value={delayReason}
                              onChange={(e) => setDelayReason(e.target.value)}
                              className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm h-20"
                              placeholder="Required if marking as delayed"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Deductions Form */}
                  {showDeductions === task.id && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border">
                      <h5 className="text-sm font-medium text-gray-900 mb-3">Deductions</h5>
                      {task.deductions && task.deductions.length > 0 && (
                        <div className="mb-4 space-y-2">
                          {task.deductions.map(deduction => (
                            <div key={deduction.id} className="flex items-center justify-between text-sm">
                              <div>
                                <span className="font-medium text-gray-900">
                                  {currencySymbol} {deduction.amount.toFixed(2)}
                                </span>
                                <span className="text-gray-500 ml-2">
                                  - {deduction.reason}
                                </span>
                              </div>
                              <button
                                onClick={() => removeDeduction(task.id, deduction.id)}
                                className="text-red-400 hover:text-red-600"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Amount
                          </label>
                          <input
                            type="number"
                            value={newDeduction.amount}
                            onChange={(e) => setNewDeduction(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700">
                            Reason
                          </label>
                          <input
                            type="text"
                            value={newDeduction.reason}
                            onChange={(e) => setNewDeduction(prev => ({ ...prev, reason: e.target.value }))}
                            className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <button
                          onClick={() => addDeduction(task.id)}
                          disabled={!newDeduction.amount || !newDeduction.reason.trim()}
                          className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                        >
                          Add Deduction
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}