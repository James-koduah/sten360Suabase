import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, Upload, Loader2, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useUI } from '../context/UIContext';
import { Link } from 'react-router-dom';
import { startOfWeek, endOfWeek, startOfDay, endOfDay, isWithinInterval } from 'date-fns';
import { CURRENCIES } from '../utils/constants';

interface Worker {
  id: string;
  name: string;
  whatsapp: string | null;
  image: string | null;
  stats?: {
    completedEarnings: number;
    weeklyProjectTotal: number;
    allTimeTasks: number;
    weeklyTasks: number;
    dailyTasks: number;
  };
}

interface Task {
  id: string;
  worker_id: string;
  project_id: string;
  amount: number;
  date: string;
  status: 'completed' | 'pending';
  deductions?: { amount: number }[];
}

export default function WorkersList() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddWorker, setShowAddWorker] = useState(false);
  const [newWorker, setNewWorker] = useState({
    name: '',
    whatsapp: '',
    image: ''
  });
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { organization } = useAuthStore();
  const { confirm, addToast } = useUI();
  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        alert('Please upload a JPG, JPEG, or PNG file');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }

      setSelectedFile(file);
    }
  };

  const loadWorkersWithStats = async () => {
    if (!organization) return;

    try {
      setIsLoading(true);
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('*')
        .eq('organization_id', organization.id)
        .order('name');

      if (workersError) throw workersError;

      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      const dayStart = startOfDay(now);
      const dayEnd = endOfDay(now);

      // Load tasks and deductions for all workers
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          deductions (
            amount
          )
        `)
        .eq('organization_id', organization.id);

      if (tasksError) throw tasksError;

      const workersWithStats = workersData?.map(worker => {
        const workerTasks = tasksData?.filter(task => task.worker_id === worker.id) || [];
        
        // Filter tasks for current week
        const weeklyTasks = workerTasks.filter(task => 
          isWithinInterval(new Date(task.date), { start: weekStart, end: weekEnd })
        );

        // Get weekly completed and assigned tasks
        const weeklyCompletedTasks = weeklyTasks.filter(task => task.status === 'completed');
        const weeklyAssignedTasks = weeklyTasks.filter(task => task.status === 'pending');
        
        // Calculate weekly completed earnings (only from completed tasks)
        const completedEarnings = weeklyCompletedTasks.reduce((sum, task) => {
          const deductionsTotal = task.deductions?.reduce((dSum, d) => dSum + (d.amount || 0), 0) || 0;
          return sum + (task.amount - deductionsTotal);
        }, 0);

        // Calculate weekly project total (total amount for all tasks this week)
        const weeklyProjectTotal = weeklyTasks.reduce((sum, task) => {
          const deductionsTotal = task.deductions?.reduce((dSum, d) => dSum + (d.amount || 0), 0) || 0;
          return sum + (task.amount - deductionsTotal);
        }, 0);

        const stats = {
          completedEarnings,
          weeklyProjectTotal,
          assignedTasks: weeklyAssignedTasks.length,
          completedTasks: weeklyCompletedTasks.length,
          allTimeTasks: workerTasks.length,
          weeklyTasks: weeklyTasks.length,
          dailyTasks: workerTasks.filter(task =>
            isWithinInterval(new Date(task.date), { start: dayStart, end: dayEnd })
          ).length
        };

        return { ...worker, stats };
      }) || [];

      setWorkers(workersWithStats);
    } catch (error) {
      console.error('Error loading workers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWorkersWithStats();
  }, [organization]);

  const addWorker = async () => {
    if (!organization || !newWorker.name.trim()) return;

    try {
      setIsUploading(true);
      let imageUrl = null;

      // Upload image if selected
      if (selectedFile) {
        // Validate file extension
        const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
        if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
          throw new Error('Invalid file extension');
        }

        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${organization.id}/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('profiles')
          .upload(filePath, selectedFile, {
            contentType: selectedFile.type,
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        imageUrl = publicUrl;
      }

      // Create worker
      const { data, error } = await supabase
        .from('workers')
        .insert([{
          organization_id: organization.id,
          name: newWorker.name.trim(),
          whatsapp: newWorker.whatsapp.trim() || null,
          image: imageUrl
        }])
        .select()
        .single();

      if (error) throw error;

      setWorkers(prev => [...prev, { ...data, stats: {
        completedEarnings: 0,
        weeklyProjectTotal: 0,
        assignedTasks: 0,
        completedTasks: 0,
        allTimeTasks: 0,
        weeklyTasks: 0,
        dailyTasks: 0
      }}]);
      setNewWorker({ name: '', whatsapp: '', image: '' });
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setShowAddWorker(false);
    } catch (error) {
      console.error('Error adding worker:', error);
      alert(error instanceof Error ? error.message : 'Failed to add worker');
    } finally {
      setIsUploading(false);
    }
  };

  const deleteWorker = async (workerId: string) => {
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
      const worker = workers.find(w => w.id === workerId);
      if (worker?.image) {
        const imagePath = worker.image.split('/').slice(-2).join('/');
        await supabase.storage
          .from('profiles')
          .remove([imagePath]);
      }

      // Delete worker from database
      const { error } = await supabase
        .from('workers')
        .delete()
        .eq('id', workerId);

      if (error) throw error;

      // Update local state
      setWorkers(prev => prev.filter(w => w.id !== workerId));
      
      addToast({
        type: 'success',
        title: 'Worker Deleted',
        message: 'The worker has been deleted successfully.'
      });
    } catch (error) {
      console.error('Error deleting worker:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to delete worker. Please try again.'
      });
    }
  };

  // Filter workers based on search query
  const filteredWorkers = workers.filter(worker =>
    worker.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading workers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900">Workers</h2>
        <button
          onClick={() => setShowAddWorker(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Worker
        </button>
      </div>

      {showAddWorker && (
        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Worker</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                value={newWorker.name}
                onChange={(e) => setNewWorker(prev => ({ ...prev, name: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Enter worker name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">WhatsApp Number</label>
              <input
                type="text"
                value={newWorker.whatsapp}
                onChange={(e) => setNewWorker(prev => ({ ...prev, whatsapp: e.target.value }))}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                placeholder="Enter WhatsApp number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Profile Image</label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
              />
              <div className="mt-1 flex items-center space-x-4">
                {selectedFile ? (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">{selectedFile.name}</span>
                    <button
                      onClick={() => {
                        setSelectedFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = '';
                        }
                      }}
                      className="text-red-600 hover:text-red-700"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Choose Image
                  </button>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddWorker(false);
                  setSelectedFile(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={addWorker}
                disabled={!newWorker.name.trim() || isUploading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 flex items-center"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  'Add Worker'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="p-4 border-b">
          <div className="flex items-center px-3 py-2 border rounded-lg focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
            <Search className="h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search workers..."
              className="ml-2 flex-1 outline-none bg-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-4">
          {filteredWorkers.length === 0 ? (
            <div className="col-span-full text-center text-gray-500 py-4">
              {searchQuery ? 'No workers found matching your search.' : 'No workers added yet.'}
            </div>
          ) : (
            filteredWorkers.map(worker => (
              <div key={worker.id} className="relative">
                <Link
                  to={`/dashboard/workers/${worker.id}`}
                  className="block bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                        {worker.image ? (
                          <img src={worker.image} alt={worker.name} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-2xl font-medium text-gray-600">
                            {worker.name[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">{worker.name}</h3>
                        {worker.whatsapp && (
                          <p className="text-sm text-gray-500">WhatsApp: {worker.whatsapp}</p>
                        )}
                      </div>
                    </div>

                    <div className="mt-6 space-y-4">
                      <div className="space-y-2">
                        <p className="text-sm text-green-600 font-medium">
                          Completed Earnings: {currencySymbol} {worker.stats?.completedEarnings.toFixed(2)}
                        </p>
                        <p className="text-sm text-blue-600 font-medium">
                          Weekly Project Total: {currencySymbol} {worker.stats?.weeklyProjectTotal.toFixed(2)}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm text-yellow-600 font-medium">
                            Tasks Assigned: {worker.stats?.assignedTasks}
                          </p>
                          <p className="text-sm text-green-600 font-medium">
                            Tasks Completed: {worker.stats?.completedTasks}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">All-time</p>
                          <p className="text-lg font-semibold text-gray-900">{worker.stats?.allTimeTasks}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">This week</p>
                          <p className="text-lg font-semibold text-gray-900">{worker.stats?.weeklyTasks}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-3 text-center">
                          <p className="text-xs text-gray-500 mb-1">Today</p>
                          <p className="text-lg font-semibold text-gray-900">{worker.stats?.dailyTasks}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={() => deleteWorker(worker.id)}
                  className="absolute top-4 right-4 p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50 z-10"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
