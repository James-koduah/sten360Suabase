import React, { useRef, useState } from 'react';
import { Edit2, Upload, Loader2, Download, MessageSquare, Phone, Calendar, CheckCircle, DollarSign, Trash2 } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { generateWorkerReport } from '../../utils/reportUtils';
import { CURRENCIES } from '../../utils/constants';
import { useUI } from '../../context/UIContext';
import { useAuthStore } from '../../stores/authStore';

interface WorkerHeaderProps {
  worker: any;
  tasks: any[];
  workerProjects: any[];
  isEditing: boolean;
  setIsEditing: (value: boolean) => void;
  editedWorker: any;
  setEditedWorker: (worker: any) => void;
  handleEditWorker: () => Promise<void>;
  handleDeleteWorker: () => Promise<void>;
}

export default function WorkerHeader({
  worker,
  tasks,
  workerProjects,
  isEditing,
  setIsEditing,
  editedWorker,
  setEditedWorker,
  handleEditWorker,
  handleDeleteWorker
}: WorkerHeaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addToast } = useUI();
  const { organization } = useAuthStore();
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

  // Calculate stats
  const assignedTasks = tasks.filter(t => t.status === 'pending');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  // Calculate completed earnings for the week from completed tasks only
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !worker) return;

    try {
      setIsUploading(true);

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Please upload a JPG, JPEG, or PNG file');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image must be less than 5MB');
      }

      // Create a unique file path
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (!fileExt || !['jpg', 'jpeg', 'png'].includes(fileExt)) {
        throw new Error('Invalid file extension');
      }

      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `worker-${worker.id}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      // Update worker with new image URL
      const { error: updateError } = await supabase
        .from('workers')
        .update({ image: publicUrl })
        .eq('id', worker.id);

      if (updateError) throw updateError;

      // Update local state
      setEditedWorker(prev => prev ? { ...prev, image: publicUrl } : null);

      addToast({
        type: 'success',
        title: 'Image Uploaded',
        message: 'Profile image has been updated successfully.'
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      addToast({
        type: 'error',
        title: 'Upload Failed',
        message: error instanceof Error ? error.message : 'Failed to upload image'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownloadReport = () => {
    if (!worker) return;

    generateWorkerReport(
      worker,
      tasks,
      workerProjects,
      weekStart,
      weekEnd,
      organization.currency
    );
  };

  const handleWhatsAppMessage = () => {
    if (!worker?.whatsapp) return;

    const { whatsappMessage } = generateWorkerReport(
      worker,
      tasks,
      workerProjects,
      weekStart,
      weekEnd,
      organization.currency
    );

    window.open(
      `https://wa.me/${worker.whatsapp}?text=${whatsappMessage}`,
      '_blank'
    );
  };

  const completedEarnings = completedTasks.reduce((sum, task) => {
    const deductions = task.deductions?.reduce((dSum, d) => dSum + d.amount, 0) || 0;
    return sum + (task.amount - deductions);
  }, 0);

  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-5">
            <div className="relative h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
              {worker.image ? (
                <img 
                  src={worker.image} 
                  alt={worker.name} 
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    console.error('Image failed to load:', worker.image);
                    e.currentTarget.src = ''; // Clear the src on error
                    e.currentTarget.onerror = null; // Prevent infinite loop
                  }}
                />
              ) : (
                <span className="text-3xl font-medium text-gray-600">
                  {worker.name[0].toUpperCase()}
                </span>
              )}
              {isEditing && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="p-2 bg-white rounded-full hover:bg-gray-100"
                  >
                    {isUploading ? (
                      <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
                    ) : (
                      <Upload className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                </div>
              )}
            </div>
            <div>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Name</label>
                    <input
                      type="text"
                      value={editedWorker?.name || ''}
                      onChange={(e) => setEditedWorker(prev => prev ? { ...prev, name: e.target.value } : null)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                    <input
                      type="text"
                      value={editedWorker?.whatsapp || ''}
                      onChange={(e) => setEditedWorker(prev => prev ? { ...prev, whatsapp: e.target.value } : null)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      placeholder="Enter WhatsApp number"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      onClick={handleEditWorker}
                      disabled={isUploading}
                      className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400"
                    >
                      {isUploading ? 'Uploading...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedWorker(worker);
                      }}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 className="text-2xl font-bold text-gray-900">{worker.name}</h2>
                  {worker.whatsapp && (
                    <div className="mt-2 flex items-center text-gray-500">
                      <Phone className="h-4 w-4 mr-2" />
                      <span>{worker.whatsapp}</span>
                    </div>
                  )}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit Profile
                    </button>
                    <button
                      onClick={handleDownloadReport}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download Report
                    </button>
                    {worker.whatsapp && (
                      <button
                        onClick={handleWhatsAppMessage}
                        className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <MessageSquare className="h-4 w-4 mr-2" />
                        WhatsApp
                      </button>
                    )}
                    <button
                      onClick={handleDeleteWorker}
                      className="inline-flex items-center px-3 py-1.5 border border-red-300 rounded-md text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Worker
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Calendar className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-900">Assigned Tasks</p>
                <p className="mt-1 text-2xl font-semibold text-yellow-900">{assignedTasks.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-900">Completed Tasks</p>
                <p className="mt-1 text-2xl font-semibold text-green-900">{completedTasks.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-900">Completed Earnings</p>
                <p className="mt-1 text-2xl font-semibold text-yellow-900">
                  {currencySymbol} {completedEarnings.toFixed(2)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}