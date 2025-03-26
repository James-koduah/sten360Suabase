import React, { useState } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useConfirmDialog } from '../../hooks';
import { useToast } from '../../hooks';
import { CURRENCIES } from '../../utils/constants';

interface WorkerProjectsProps {
  worker: any;
  workerProjects: any[];
  setWorkerProjects: (projects: any[]) => void;
  organization: any;
}

interface Project {
  id: string;
  name: string;
  rate: number;
}

const baseInputClasses = "mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2";

export default function WorkerProjects({
  worker,
  workerProjects,
  setWorkerProjects,
  organization
}: WorkerProjectsProps) {
  const [showAddProject, setShowAddProject] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingRate, setEditingRate] = useState<number>(0);
  const [editingName, setEditingName] = useState<string>('');
  const [newProject, setNewProject] = useState({
    name: '',
    rate: 0
  });
  const { confirm } = useConfirmDialog();
  const { addToast } = useToast();
  const currencySymbol = CURRENCIES[organization.currency]?.symbol || organization.currency;

  const handleAddProject = async () => {
    if (!organization || !worker || !newProject.name.trim() || !newProject.rate) return;

    try {
      // First create the project
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{
          organization_id: organization.id,
          name: newProject.name.trim(),
          base_price: newProject.rate
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      // Then create the worker project rate
      const { data: rateData, error: rateError } = await supabase
        .from('worker_project_rates')
        .insert([{
          worker_id: worker.id,
          project_id: projectData.id,
          rate: newProject.rate
        }])
        .select(`
          id,
          worker_id,
          project_id,
          rate,
          project:projects(*)
        `)
        .single();

      if (rateError) throw rateError;

      setWorkerProjects(prev => [...prev, rateData]);
      setNewProject({ name: '', rate: 0 });
      setShowAddProject(false);

      addToast({
        type: 'success',
        title: 'Project Added',
        message: 'The project has been added successfully.'
      });
    } catch (error) {
      console.error('Error adding project:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to add project. Please try again.'
      });
    }
  };

  const handleUpdateProjectRate = async (projectRateId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name: editingName })
        .eq('id', workerProjects.find(wp => wp.id === projectRateId)?.project_id);

      if (error) throw error;

      const { error: rateError } = await supabase
        .from('worker_project_rates')
        .update({ rate: editingRate })
        .eq('id', projectRateId);

      if (rateError) throw rateError;

      setWorkerProjects(prev =>
        prev.map(wp =>
          wp.id === projectRateId ? {
            ...wp,
            rate: editingRate,
            project: {
              ...wp.project,
              name: editingName
            }
          } : wp
        )
      );
      setEditingProjectId(null);
      setEditingName('');
      setEditingRate(0);

      addToast({
        type: 'success',
        title: 'Rate Updated',
        message: 'The project has been updated successfully.'
      });
    } catch (error) {
      console.error('Error updating project rate:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to update project rate. Please try again.'
      });
    }
  };

  const handleDeleteProject = async (projectRateId: string) => {
    const confirmed = await confirm({
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This action cannot be undone.',
      type: 'warning',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (!confirmed) return;

    try {
      const projectToDelete = workerProjects.find(wp => wp.id === projectRateId);
      if (!projectToDelete) throw new Error('Project not found');

      // Delete the project (this will cascade delete the worker_project_rate)
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectToDelete.project_id);

      if (error) throw error;

      setWorkerProjects(prev => prev.filter(wp => wp.id !== projectRateId));

      addToast({
        type: 'success',
        title: 'Project Deleted',
        message: 'Project deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to delete project'
      });
    }
  };


  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-medium text-gray-900">Projects and Rates</h2>
          <button
            onClick={() => setShowAddProject(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Project
          </button>
        </div>

        {showAddProject && (
          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Add New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Project Name</label>
                <input
                  type="text"
                  value={newProject.name}
                  onChange={(e) => setNewProject(prev => ({ ...prev, name: e.target.value }))}
                  className={baseInputClasses}
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Rate ({currencySymbol})</label>
                <input
                  type="number"
                  value={newProject.rate || ''}
                  onChange={(e) => setNewProject(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  className={baseInputClasses}
                  min="0"
                  step="0.01"
                  placeholder="Enter project rate"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowAddProject(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddProject}
                  disabled={!newProject.name.trim() || !newProject.rate}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400"
                >
                  Add Project
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-4">
          {workerProjects.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No projects assigned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rate
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {workerProjects.map(wp => (
                    <tr key={wp.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingProjectId === wp.id ? (
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className={`${baseInputClasses} w-full`}
                            placeholder="Enter project name"
                          />
                        ) : (
                          wp.project.name
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {editingProjectId === wp.id ? (
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={editingRate || ''}
                              onChange={(e) => setEditingRate(parseFloat(e.target.value) || 0)}
                              className={`${baseInputClasses} w-24`}
                              min="0"
                              step="0.01"
                            />
                            <button
                              onClick={() => handleUpdateProjectRate(wp.id)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <CheckCircle className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => setEditingProjectId(null)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          </div>
                        ) : (
                          <span>{currencySymbol} {wp.rate.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingProjectId !== wp.id && (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => {
                                setEditingProjectId(wp.id);
                                setEditingRate(wp.rate);
                                setEditingName(wp.project.name);
                              }}
                              className="text-blue-600 hover:text-blue-700"
                            >
                              <Edit2 className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDeleteProject(wp.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Delete project"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}