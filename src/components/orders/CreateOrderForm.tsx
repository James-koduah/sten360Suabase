import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { useUI } from '../../context/UIContext';
import { CURRENCIES } from '../../utils/constants';
import { format } from 'date-fns';
import { Plus, Minus, X, User, FileText, Calendar, CreditCard, DollarSign, Printer } from 'lucide-react';

interface Client {
  id: string;
  name: string;
  custom_fields?: {
    id: string;
    title: string;
    value: string;
    type: string;
  }[];
}

interface Worker {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  cost: number;
}

interface OrderService {
  service: Service;
  quantity: number;
}

interface CreateOrderFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface OrderSummaryProps {
  orderData: any;
  selectedClient: Client;
  selectedServices: OrderService[];
  selectedWorkers: { worker_id: string; project_id: string }[];
  formData: any;
  currencySymbol: string;
  onClose: () => void;
  workers: Worker[];
  workerProjects: {[key: string]: any[]};
}

function OrderSummary({ orderData, selectedClient, selectedServices, selectedWorkers, formData, currencySymbol, onClose, workers, workerProjects }: OrderSummaryProps) {
  const totalAmount = selectedServices.reduce(
    (sum, { service, quantity }) => sum + (service.cost * quantity),
    0
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-[57mm] w-full mx-auto overflow-y-auto max-h-[90vh] border border-gray-100">
      <div className="px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-white rounded-full transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="print:block hidden">
          <style>
            {`
              @media print {
                @page {
                  size: 57mm 50mm;
                  margin: 0;
                }
                body {
                  width: 57mm;
                  margin: 0;
                  padding: 0;
                  font-family: monospace;
                  font-size: 7pt;
                  line-height: 1.2;
                }
                .no-print {
                  display: none !important;
                }
                .receipt-content {
                  padding: 1mm;
                }
                .receipt-header {
                  text-align: center;
                  margin-bottom: 1mm;
                  padding-bottom: 1mm;
                  border-bottom: 1px solid #000;
                }
                .receipt-title {
                  font-size: 12pt;
                  font-weight: bold;
                  letter-spacing: 0.5pt;
                }
                .receipt-divider {
                  border-top: 1px solid #000;
                  margin: 0.5mm 0;
                }
                .receipt-row {
                  display: flex;
                  justify-content: space-between;
                  margin: 0.3mm 0;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                .receipt-label {
                  font-weight: bold;
                  margin-right: 1mm;
                }
                .receipt-value {
                  text-align: right;
                }
                .receipt-total {
                  font-weight: bold;
                  font-size: 8pt;
                  margin-top: 0.5mm;
                }
                .receipt-service {
                  margin: 0.2mm 0;
                }
                .receipt-service-name {
                  margin-right: 1mm;
                }
                .receipt-service-quantity {
                  color: #666;
                }
                .receipt-footer {
                  text-align: center;
                  margin-top: 1mm;
                  padding-top: 1mm;
                  border-top: 1px solid #000;
                  font-size: 6pt;
                  color: #666;
                }
              }
            `}
          </style>
        </div>

        <div className="receipt-content">
          {/* Organization Name */}
          <div className="receipt-header">
            <div className="receipt-title">STEN360</div>
          </div>

          {/* Order Number */}
          <div className="receipt-row">
            <span className="receipt-label">Order #:</span>
            <span className="receipt-value">{orderData.order_number}</span>
          </div>

          {/* Description (if exists) */}
          {formData.description && (
            <div className="receipt-row">
              <span className="receipt-label">Desc:</span>
              <span className="receipt-value">{formData.description}</span>
            </div>
          )}

          {/* Due Date */}
          <div className="receipt-row">
            <span className="receipt-label">Due:</span>
            <span className="receipt-value">
              {formData.due_date ? format(new Date(formData.due_date), 'dd/MM/yyyy') : 'N/A'}
            </span>
          </div>

          <div className="receipt-divider" />

          {/* Services */}
          {selectedServices.map(({ service, quantity }) => (
            <div key={service.id} className="receipt-service">
              <div className="receipt-row">
                <span className="receipt-service-name">{service.name}</span>
                <span className="receipt-service-quantity">x{quantity}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-value">{currencySymbol} {(service.cost * quantity).toFixed(2)}</span>
              </div>
            </div>
          ))}

          <div className="receipt-divider" />

          {/* Payment Information */}
          {formData.initial_payment > 0 && (
            <>
              <div className="receipt-row">
                <span className="receipt-label">Payment:</span>
                <span className="receipt-value">{currencySymbol} {formData.initial_payment.toFixed(2)}</span>
              </div>
              <div className="receipt-row">
                <span className="receipt-label">Method:</span>
                <span className="receipt-value">
                  {formData.payment_method.charAt(0).toUpperCase() + formData.payment_method.slice(1).replace('_', ' ')}
                </span>
              </div>
            </>
          )}

          {/* Total Amount */}
          <div className="receipt-row receipt-total">
            <span>Total:</span>
            <span className="receipt-value">{currencySymbol} {totalAmount.toFixed(2)}</span>
          </div>

          {/* Outstanding Balance */}
          {formData.initial_payment > 0 && (
            <div className="receipt-row receipt-total">
              <span>Balance:</span>
              <span className="receipt-value">{currencySymbol} {(totalAmount - formData.initial_payment).toFixed(2)}</span>
            </div>
          )}

          <div className="receipt-divider" />

          {/* Client Name */}
          <div className="receipt-row">
            <span className="receipt-label">Client:</span>
            <span className="receipt-value">{selectedClient.name}</span>
          </div>

          {/* Footer */}
          <div className="receipt-footer">
            Thank you for your business!
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CreateOrderForm({ onClose, onSuccess }: CreateOrderFormProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [workerProjects, setWorkerProjects] = useState<{[key: string]: any[]}>({});
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedCustomFields, setSelectedCustomFields] = useState<string[]>([]);
  const [selectedServices, setSelectedServices] = useState<OrderService[]>([]);
  const [selectedWorkers, setSelectedWorkers] = useState<{
    worker_id: string;
    project_id: string;
  }[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    description: '',
    due_date: '',
    initial_payment: 0,
    payment_method: ''
  });
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any>(null);

  const { organization } = useAuthStore();
  const { addToast } = useUI();
  const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

  useEffect(() => {
    if (!organization?.id) return;
    loadData();
  }, [organization]);

  const loadData = async () => {
    if (!organization?.id) return;
    
    try {
      // Load clients with their custom fields
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          *,
          custom_fields:client_custom_fields(*)
        `)
        .eq('organization_id', organization.id);

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Load workers
      const { data: workersData, error: workersError } = await supabase
        .from('workers')
        .select('id, name')
        .eq('organization_id', organization.id);

      if (workersError) throw workersError;
      setWorkers(workersData || []);

      // Load services
      const { data: servicesData, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', organization.id);

      if (servicesError) throw servicesError;
      setServices(servicesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load required data'
      });
    }
  };

  const loadWorkerProjects = async (workerId: string) => {
    try {
      const { data, error } = await supabase
        .from('worker_project_rates')
        .select(`
          id,
          worker_id,
          project_id,
          rate,
          project:projects(*)
        `)
        .eq('worker_id', workerId);

      if (error) throw error;
      setWorkerProjects(prev => ({
        ...prev,
        [workerId]: data || []
      }));
    } catch (error) {
      console.error('Error loading worker projects:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Failed to load worker projects'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || selectedServices.length === 0 || !selectedWorkers.some(w => w.worker_id && w.project_id)) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Please select a client, at least one service, and assign at least one worker with a project.'
      });
      return;
    }

    if (!organization?.id) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Organization information is missing.'
      });
      return;
    }

    const totalAmount = selectedServices.reduce(
      (sum, { service, quantity }) => sum + (service.cost * quantity),
      0
    );

    if (formData.initial_payment > totalAmount) {
      addToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Initial payment cannot be greater than the total amount.'
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Start a transaction
      const { data: orderData, error: orderError } = await supabase.rpc('create_order', {
        p_organization_id: organization.id,
        p_client_id: selectedClient.id,
        p_description: formData.description.trim() || null,
        p_due_date: formData.due_date || null,
        p_total_amount: totalAmount,
        p_workers: selectedWorkers
          .filter(w => w.worker_id && w.project_id)
          .map(w => ({
            worker_id: w.worker_id,
            project_id: w.project_id
          })),
        p_services: selectedServices.map(({ service, quantity }) => ({
          service_id: service.id,
          quantity,
          cost: service.cost * quantity
        })),
        p_custom_fields: selectedCustomFields
      });

      if (orderError) throw orderError;
      if (!orderData) throw new Error('Failed to create order');

      // Record initial payment if any
      if (formData.initial_payment > 0 && formData.payment_method) {
        const { error: paymentError } = await supabase.rpc('record_payment', {
          p_organization_id: organization.id,
          p_order_id: orderData.id,
          p_amount: formData.initial_payment,
          p_payment_method: formData.payment_method,
          p_payment_reference: `Initial payment for order ${orderData.order_number}`,
          p_recorded_by: (await supabase.auth.getUser()).data.user?.id
        });

        if (paymentError) throw paymentError;
      }

      setCreatedOrder(orderData);
      setShowOrderSummary(true);
      
      addToast({
        type: 'success',
        title: 'Order Created',
        message: 'The order has been created successfully.'
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating order:', error);
      addToast({
        type: 'error',
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to create order. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleServiceQuantity = (service: Service, action: 'add' | 'remove' | 'update', value?: number) => {
    setSelectedServices(prev => {
      const existing = prev.find(s => s.service.id === service.id);
      
      if (action === 'add' && !existing) {
        return [...prev, { service, quantity: 1 }];
      }

      if (action === 'remove') {
        return prev.filter(s => s.service.id !== service.id);
      }

      if (action === 'update' && value !== undefined) {
        return prev.map(s =>
          s.service.id === service.id
            ? { ...s, quantity: Math.max(1, value) }
            : s
        );
      }

      return prev;
    });
  };

  const totalAmount = selectedServices.reduce(
    (sum, { service, quantity }) => sum + (service.cost * quantity),
    0
  );

  if (showOrderSummary && createdOrder) {
    return (
      <OrderSummary
        orderData={createdOrder}
        selectedClient={selectedClient!}
        selectedServices={selectedServices}
        selectedWorkers={selectedWorkers}
        formData={formData}
        currencySymbol={currencySymbol}
        onClose={() => {
          setShowOrderSummary(false);
          onClose();
        }}
        workers={workers}
        workerProjects={workerProjects}
      />
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-auto overflow-y-auto max-h-[90vh] border border-gray-100">
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Create New Order</h2>
            <p className="mt-1 text-sm text-gray-500">Fill in the order details below</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-white rounded-full transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* General Order Info Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 mr-3 font-bold">1</span>
              General Order Info
            </h3>

            {/* Client Selection */}
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-800">
                Select Client *
              </label>
              <div className="mt-1 relative">
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search clients by name..."
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white transition-all duration-200 hover:border-blue-400"
                  />
                </div>
                {searchQuery && (
                  <div className="absolute z-10 mt-2 w-full bg-white shadow-xl rounded-lg border border-gray-200 max-h-60 overflow-auto divide-y divide-gray-100">
                    {filteredClients.map(client => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(client);
                          setSearchQuery('');
                          setSelectedCustomFields(client.custom_fields?.map(f => f.id) || []);
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors duration-150 flex items-center space-x-3"
                      >
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600" />
                        </div>
                        <div>
                        {client.name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedClient && !searchQuery && (
                <div className="mt-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg flex items-center justify-between animate-fadeIn shadow-sm">
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <span className="text-sm font-semibold text-blue-900">{selectedClient.name}</span>
                      <p className="text-xs text-blue-600 mt-0.5">Selected Client</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedClient(null)}
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full transition-colors duration-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Custom Fields Selection */}
              {selectedClient?.custom_fields && selectedClient.custom_fields.length > 0 && (
                <div className="mt-6 animate-fadeIn">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Custom Fields
                  </label>
                  <div className="space-y-2">
                    {selectedClient.custom_fields.map(field => (
                      <label key={field.id} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={selectedCustomFields.includes(field.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCustomFields(prev => [...prev, field.id]);
                            } else {
                              setSelectedCustomFields(prev => prev.filter(id => id !== field.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-900">{field.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Worker Assignment */}
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-semibold text-gray-800">
                    Assign Workers
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedWorkers([...selectedWorkers, { worker_id: '', project_id: '' }])}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Worker
                  </button>
                </div>

                {selectedWorkers.map((selectedWorker, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="flex-1">
                      <select
                        value={selectedWorker.worker_id || ''}
                        onChange={(e) => {
                          const workerId = e.target.value;
                          if (workerId) {
                            loadWorkerProjects(workerId);
                          }
                          const newWorkers = [...selectedWorkers];
                          newWorkers[index] = {
                            ...newWorkers[index],
                            worker_id: workerId,
                            project_id: ''  // Reset project when worker changes
                          };
                          setSelectedWorkers(newWorkers);
                        }}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Worker</option>
                        {workers.map(worker => (
                          <option key={worker.id} value={worker.id}>{worker.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex-1">
                      <select
                        value={selectedWorker.project_id || ''}
                        onChange={(e) => {
                          const newWorkers = [...selectedWorkers];
                          newWorkers[index].project_id = e.target.value;
                          setSelectedWorkers(newWorkers);
                        }}
                        disabled={!selectedWorker.worker_id}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                      >
                        <option value="">Select Project</option>
                        {selectedWorker.worker_id && workerProjects[selectedWorker.worker_id]?.map(wp => (
                          <option key={wp.project_id} value={wp.project_id}>
                            {wp.project.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => {
                        const newWorkers = selectedWorkers.filter((_, i) => i !== index);
                        setSelectedWorkers(newWorkers);
                      }}
                      className="p-2 text-red-600 hover:text-red-800 rounded-full hover:bg-red-50"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Description */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Description
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white transition-all duration-200 hover:border-blue-400 resize-none"
                  placeholder="Enter order description"
                />
                </div>
              </div>

              {/* Due Date */}
              <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Due Date
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white transition-all duration-200 hover:border-blue-400"
                />
                </div>
              </div>
            </div>
          </div>

          {/* Services Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 mr-3 font-bold">2</span>
              Services
            </h3>

            {/* Available Services */}
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {services.map(service => {
                  const selectedService = selectedServices.find(s => s.service.id === service.id);
                  return (
                    <div
                      key={service.id}
                      className={`p-4 rounded-lg border ${
                        selectedService ? 'border-blue-200 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-gray-900">{service.name}</h4>
                          <p className="text-sm text-gray-500 mt-1">
                            {currencySymbol} {service.cost.toFixed(2)}
                          </p>
                        </div>
                        {selectedService ? (
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleServiceQuantity(service, 'update', selectedService.quantity - 1)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="text-gray-900 min-w-[2rem] text-center">
                              {selectedService.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleServiceQuantity(service, 'update', selectedService.quantity + 1)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors duration-200"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleServiceQuantity(service, 'remove')}
                              className="p-1 text-red-400 hover:text-red-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleServiceQuantity(service, 'add')}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-all duration-200"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Amount */}
              {selectedServices.length > 0 && (
                <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg shadow-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total Amount</span>
                    <span className="text-xl font-bold text-blue-600">
                      {currencySymbol} {totalAmount.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Payment Details Section */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 mr-3 font-bold">3</span>
              Payment Details
            </h3>

            <div className="space-y-6">
              {/* Total Amount Display */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Total Order Amount</span>
                  <span className="text-xl font-bold text-blue-600">
                    {currencySymbol} {totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Initial Payment */}
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">
                  Initial Payment (Optional)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    min="0"
                    max={totalAmount}
                    step="0.01"
                    value={formData.initial_payment}
                    onChange={(e) => setFormData(prev => ({ ...prev, initial_payment: parseFloat(e.target.value) || 0 }))}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white transition-all duration-200 hover:border-blue-400"
                    placeholder="Enter initial payment amount"
                  />
                </div>
              </div>

              {/* Payment Method */}
              {formData.initial_payment > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-2">
                    Payment Method *
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <select
                      value={formData.payment_method}
                      onChange={(e) => setFormData(prev => ({ ...prev, payment_method: e.target.value }))}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white transition-all duration-200 hover:border-blue-400"
                      required={formData.initial_payment > 0}
                    >
                      <option value="">Select Payment Method</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Outstanding Balance Display */}
              {formData.initial_payment > 0 && (
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-100 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Outstanding Balance</span>
                    <span className="text-xl font-bold text-green-600">
                      {currencySymbol} {(totalAmount - formData.initial_payment).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedClient || selectedServices.length === 0}
              className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 flex items-center transition-colors duration-200 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Order...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}