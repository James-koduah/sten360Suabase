import React, { useState } from 'react';
import { Plus, CheckCircle, XCircle, MinusCircle, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { format, isAfter, startOfDay, endOfDay } from 'date-fns';
import WorkerDeductions from './WorkerDeductions';
import { useUI } from '../../context/UIContext';
import { CURRENCIES } from '../../utils/constants';

const STATUS_COLORS = {
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', hover: 'hover:bg-yellow-200' },
  in_progress: { bg: 'bg-blue-100', text: 'text-blue-800', hover: 'hover:bg-blue-200' },
  delayed: { bg: 'bg-red-100', text: 'text-red-800', hover: 'hover:bg-red-200' },
  completed: { bg: 'bg-green-100', text: 'text-green-800', hover: 'hover:bg-green-200' }
};

const STATUS_LABELS = {
  pending: 'Assigned',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed'
};

interface WorkerTasksProps {
  worker: any;
  tasks: any[];
  setTasks: (tasks: any[]) => void;
  workerProjects: any[];
  organization: any;
}

const baseInputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2";

export default function WorkerTasks({
  worker,
  tasks,
  setTasks,
  workerProjects,
  organization
}: WorkerTasksProps) {
  const [showAddTask, setShowAddTask] = useState(false);
  const [showDeductions, setShowDeductions] = useState<string | null>(null);
  const [showStatusUpdate, setShowStatusUpdate] = useState<string | null>(null);
  const [delayReason, setDelayReason] = useState('');
  const [newTask, setNewTask] = useState({
    project_id: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    late_reason: ''
  });
  const { confirm, addToast } = useUI();
  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;

  const updateTaskStatus = async (taskId: string, newStatus: Task['status'], reason?: string) => {
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

  const handleAddTask = async () => {
    if (!organization || !worker || !newTask.project_id) return;

    const projectRate = workerProjects.find(wp => wp.project_id === newTask.project_id)?.rate || 0;
    const taskDate = new Date(newTask.date);
    const today = startOfDay(new Date());
    const needsLateReason = isAfter(today, taskDate);

    if (needsLateReason && !newTask.late_reason) {
      addToast({
        type: 'warning',
        title: 'Late Entry',
        message: 'Please provide a reason for adding a task for a past date.'
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          organization_id: organization.id,
          worker_id: worker.id,
          project_id: newTask.project_id,
          description: newTask.description.trim() || null,
          date: newTask.date,
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
        project_id: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        late_reason: ''
      });
      setShowAddTask(false);

      addToast({
        type: 'success',
        title: 'Task Added',
        message: 'The task has been added successfully.'
      });
    } catch (error) {
      console.error('Error adding task:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add task. Please try again.'
      });
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'pending' | 'completed') => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          completed_at: newStatus === 'completed' ? new Date().toISOString() : null
        })
        .eq('id', taskId);

      if (error) throw error;

      setTasks(prev =>
        prev.map(task =>
          task.id === taskId
            ? { ...task, status: newStatus, completed_at: newStatus === 'completed' ? new Date().toISOString() : null }
            : task
        )
      );

      addToast({
        type: 'success',
        title: 'Task Updated',
        message: `Task marked as ${newStatus}.`
      });
    } catch (error) {
      console.error('Error updating task status:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update task status. Please try again.'
      });
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
        .delete()
        .eq('id', taskId);

      if (error) throw error;
      
      setTasks(prev => prev.filter(task => task.id !== taskId));
      
      addToast({
        type: 'success',
        title: 'Task Deleted',
        message: 'The task has been deleted successfully.'
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

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Tasks</h2>
          <button
            onClick={() => setShowAddTask(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </button>
        </div>

        {showAddTask && (
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">New Task</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project</label>
                <select
                  value={newTask.project_id}
                  onChange={(e) => setNewTask(prev => ({ ...prev, project_id: e.target.value }))}
                  className={baseInputClasses}
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
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <input
                  type="text"
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className={baseInputClasses}
                  placeholder="Enter task description (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  value={newTask.date}
                  onChange={(e) => setNewTask(prev => ({ ...prev, date: e.target.value }))}
                  className={baseInputClasses}
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              {isAfter(startOfDay(new Date()), new Date(newTask.date)) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Reason for Late Entry
                  </label>
                  <textarea
                    value={newTask.late_reason}
                    onChange={(e) => setNewTask(prev => ({ ...prev, late_reason: e.target.value }))}
                    className={`${baseInputClasses} h-20`}
                    placeholder="Please provide a reason for adding this task after the date"
                    required
                  />
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddTask}
                  disabled={!newTask.project_id}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  Add Task
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No tasks found. Start by adding a new task.
            </div>
          ) : (
            tasks.map(task => {
              const project = workerProjects.find(wp => wp.project_id === task.project_id)?.project;
              const totalDeductions = task.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
              const netAmount = task.amount - totalDeductions;
              
              return (
                <div key={task.id} className="bg-white border rounded-lg shadow-sm">
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-start space-x-3">
                        <span className={`mt-1 ${task.status === 'completed' ? 'text-green-500' : 'text-yellow-500'}`}>
                          {task.status === 'completed' ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        </span>
                        <div className="flex-1">
                          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                            <h4 className="text-lg font-medium text-gray-900">
                              {project?.name}
                            </h4>
                          </div>
                          {task.description && (
                            <p className="text-sm text-gray-500 mt-1">{task.description}</p>
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
                          <button
                            onClick={() => {
                              setShowStatusUpdate(showStatusUpdate === task.id ? null : task.id);
                            }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full ${STATUS_COLORS[task.status].bg} ${STATUS_COLORS[task.status].text} ${STATUS_COLORS[task.status].hover}`}
                          >
                            {STATUS_LABELS[task.status]}
                          </button>
                          <button
                            onClick={() => setShowDeductions(showDeductions === task.id ? null : task.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                          >
                            <MinusCircle className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteTask(task.id)}
                            className="p-2 text-red-400 hover:text-red-600 rounded-full hover:bg-red-50"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {showStatusUpdate === task.id && (
                      <div className="mt-4 border-t pt-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="text-sm font-medium text-gray-900 mb-4">
                            Update Task Status
                          </h4>
                          <div className="space-y-4">
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                key !== task.status && (
                                  key !== 'delayed' ? (
                                    <button
                                      key={key}
                                      onClick={() => updateTaskStatus(task.id, key as Task['status'])}
                                      className={`px-3 py-1.5 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50`}
                                    >
                                      {label}
                                    </button>
                                  ) : null
                                )
                              ))}
                            </div>

                            {task.status !== 'delayed' && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700">
                                  Delay Reason
                                </label>
                                <textarea
                                  value={delayReason}
                                  onChange={(e) => setDelayReason(e.target.value)}
                                  className={`${baseInputClasses} h-20`}
                                  placeholder="Please provide a reason for the delay"
                                  required
                                />
                                <button
                                  onClick={() => updateTaskStatus(task.id, 'delayed', delayReason)}
                                  disabled={!delayReason.trim()}
                                  className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                                >
                                  Mark as Delayed
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {showDeductions === task.id && (
                      <WorkerDeductions
                        task={task}
                        tasks={tasks}
                        setTasks={setTasks}
                        organization={organization}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}