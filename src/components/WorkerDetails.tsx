import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, endOfWeek, format, isAfter, getWeek, getYear, startOfMonth, endOfMonth, startOfYear, endOfYear, addWeeks, addMonths, addYears } from 'date-fns';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import WorkerHeader from './worker/WorkerHeader';
import WorkerProjects from './worker/WorkerProjects';
import WorkerTasks from './worker/WorkerTasks';

interface Worker {
  id: string;
  name: string;
  whatsapp: string | null;
  image: string | null;
  organization_id: string;
}

export default function WorkerDetails() {
  const [worker, setWorker] = useState<Worker | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedWorker, setEditedWorker] = useState<Worker | null>(null);
  const [workerProjects, setWorkerProjects] = useState<any[]>([]);
  const [allTasks, setAllTasks] = useState<any[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dateFilterType, setDateFilterType] = useState<'week' | 'month' | 'year'>('week');
  
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();

  // Calculate date range based on filter type
  const getDateRange = () => {
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
  };

  const { start: dateRangeStart, end: dateRangeEnd } = getDateRange();

  useEffect(() => {
    if (!organization || !id) return;
    loadData();
  }, [id, organization]);

  useEffect(() => {
    if (allTasks.length > 0) {
      const filtered = allTasks.filter(task => {
        const taskDate = new Date(task.created_at);
        return taskDate >= dateRangeStart && taskDate <= dateRangeEnd;
      });
      setFilteredTasks(filtered);
    }
  }, [allTasks, dateRangeStart, dateRangeEnd]);

  const loadData = async () => {
    try {
      // Load worker details with organization_id
      const { data: workerData, error: workerError } = await supabase
        .from('workers')
        .select('*, organization:organizations(id)')
        .eq('id', id)
        .single();

      if (workerError) throw workerError;
      setWorker({
        ...workerData,
        organization_id: workerData.organization.id
      });
      setEditedWorker({
        ...workerData,
        organization_id: workerData.organization.id
      });

      // Load worker's projects with rates
      const { data: workerProjectsData, error: workerProjectsError } = await supabase
        .from('worker_project_rates')
        .select(`
          id,
          worker_id,
          project_id,
          rate,
          project:projects(*)
        `)
        .eq('worker_id', id);

      if (workerProjectsError) throw workerProjectsError;
      setWorkerProjects(workerProjectsData || []);

      // Load all worker's tasks with deductions
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          deductions (*)
        `)
        .eq('worker_id', id)
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setAllTasks(tasksData || []);
      setFilteredTasks(tasksData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load worker data. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditWorker = async () => {
    if (!worker || !editedWorker || !organization) return;

    try {
      const { error } = await supabase
        .from('workers')
        .update({
          name: editedWorker.name,
          whatsapp: editedWorker.whatsapp,
          image: editedWorker.image
        })
        .eq('id', worker.id)
        .eq('organization_id', organization.id);

      if (error) throw error;
      
      setWorker(editedWorker);
      setIsEditing(false);

      addToast({
        type: 'success',
        title: 'Worker Updated',
        message: 'Worker details have been updated successfully.'
      });
    } catch (error) {
      console.error('Error updating worker:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update worker. Please try again.'
      });
    }
  };

  const handleDeleteWorker = async () => {
    if (!worker) return;

    const confirmed = await confirm({
      title: 'Delete Worker',
      message: 'Are you sure you want to delete this worker? This action cannot be undone.',
      type: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      // Delete worker's image from storage if it exists
      if (worker.image) {
        const imagePath = worker.image.split('/').slice(-2).join('/');
        await supabase.storage
          .from('profiles')
          .remove([imagePath]);
      }

      // Delete worker from database
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', worker.id);

      if (error) throw error;

      addToast({
        type: 'success',
        title: 'Worker Deleted',
        message: 'The worker has been deleted successfully.'
      });

      // Navigate back to workers list
      navigate('/dashboard/workers');
    } catch (error) {
      console.error('Error deleting worker:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete worker. Please try again.'
      });
    }
  };

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

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading worker details...</p>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Worker not found.</p>
          <button
            onClick={() => navigate('/dashboard/workers')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Workers
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        <button
          onClick={() => navigate('/dashboard/workers')}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Workers
        </button>
      </div>

      <WorkerHeader
        worker={worker}
        tasks={allTasks}
        workerProjects={workerProjects}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        editedWorker={editedWorker}
        setEditedWorker={setEditedWorker}
        handleEditWorker={handleEditWorker}
        handleDeleteWorker={handleDeleteWorker}
      />

      <WorkerProjects
        worker={worker}
        workerProjects={workerProjects}
        setWorkerProjects={setWorkerProjects}
        organization={organization}
      />

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
          <div className="text-sm text-gray-500">
            {filteredTasks.length} tasks in this {dateFilterType}
          </div>
        </div>
      </div>
      
      <WorkerTasks
        worker={worker}
        tasks={filteredTasks}
        setTasks={setFilteredTasks}
        workerProjects={workerProjects}
        organization={organization}
      />
    </div>
  );
}