import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfWeek, endOfWeek, format, isAfter, getWeek, getYear } from 'date-fns';
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
  const [tasks, setTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
  const now = new Date();
  const currentWeek = getWeek(currentDate, { weekStartsOn: 1 });
  const currentYear = getYear(currentDate);

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();

  useEffect(() => {
    if (!organization || !id) return;
    loadData();
  }, [id, organization, currentDate]);

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

      // Load worker's tasks with deductions
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          deductions (*)
        `)
        .eq('worker_id', id)
        .gte('date', weekStart.toISOString())
        .lte('date', weekEnd.toISOString())
        .order('created_at', { ascending: false });

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

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

  const handleWeekChange = (direction: 'prev' | 'next') => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7);
      } else {
        newDate.setDate(newDate.getDate() + 7);
      }
      return newDate;
    });
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
      <div className="bg-white shadow rounded-lg">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleWeekChange('prev')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
            >
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div className="text-sm">
              <span className="font-medium text-gray-900">
                Week {currentWeek}, {currentYear}
              </span>
              <p className="text-gray-500 text-xs mt-0.5">
                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d')}
              </p>
            </div>
            <button
              onClick={() => handleWeekChange('next')}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              disabled={isAfter(weekEnd, now)}
            >
              <ChevronRight className="h-5 w-5 text-gray-600" />
            </button>
          </div>
          <div className="text-sm text-gray-500">
            {tasks.length} tasks this week
          </div>
        </div>
      </div>

      <WorkerHeader
        worker={worker}
        tasks={tasks}
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

      <WorkerTasks
        worker={worker}
        tasks={tasks}
        setTasks={setTasks}
        workerProjects={workerProjects}
        organization={organization}
      />
    </div>
  );
}