import React, { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Printer, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { CURRENCIES } from '../../utils/constants';
import { useUI } from '../../context/UIContext';

interface Client {
    id: string;
    name: string;
    phone?: string;
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

interface OrderWorker {
    worker: {
        id: string;
        name: string;
    };
    project: {
        id: string;
        name: string;
    };
}

interface OrderReceiptProps {
    orderId: string;
    onClose: () => void;
}

const generateReceiptHTML = (
    organizationName: string,
    organizationAddress: string | undefined,
    selectedClient: Client,
    orderData: any,
    selectedServices: OrderService[],
    formData: any,
    currencySymbol: string,
    totalAmount: number
) => `
  <!DOCTYPE html>
  <html>
    <head>
      <title>Receipt</title>
      <style>
        @page {
          size: 57mm auto;
          margin: 8px;
        }
        body {
          width: 57mm;
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
        }
        .receipt {
          width: 57mm;
          padding: 8px;
          background: white;
        }
        .header {
          text-align: center;
          margin-bottom: 2mm;
        }
        .title {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 1mm;
        }
        .subtitle {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 2mm;
        }
        .text {
          font-size: 12px;
          margin: 1mm 0;
        }
        .text-small {
          font-size: 10px;
        }
        .flex {
          display: flex;
          justify-content: space-between;
        }
        .border-top {
          border-top: 1px solid #000;
          padding-top: 2mm;
          margin-top: 2mm;
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <div class="header">
          <div class="title">${organizationName}</div>
          ${organizationAddress ? `<div class="text">${organizationAddress}</div>` : ''}
          <div class="subtitle">RECEIPT</div>
        </div>
        
        <div class="text">
          <div><strong>Order For:</strong></div>
          <div>${selectedClient.name}</div>
          ${selectedClient.phone ? `<div>${selectedClient.phone}</div>` : ''}
        </div>

        <div class="text">
          <div><strong>Order Date:</strong></div>
          <div>${format(new Date(), 'dd/MM/yyyy HH:mm')}</div>
        </div>

        <div class="text">
          <div><strong>Order Number:</strong></div>
          <div>${orderData.order_number}</div>
        </div>

        <div class="text">
          <div><strong>Services:</strong></div>
          ${selectedServices.map(({ service, quantity }) => `
            <div class="flex">
              <div>
                <div>${service.name}</div>
                <div class="text-small">x${quantity}</div>
              </div>
              <div>${currencySymbol}${service.cost.toFixed(2)}</div>
            </div>
          `).join('')}
        </div>

        <div class="border-top subtitle">
          <div class="flex">
            <div><strong>Total Amount:</strong></div>
            <div><strong>${currencySymbol}${totalAmount.toFixed(2)}</strong></div>
          </div>
        </div>

          <div class="text">
            <div class="flex">
              <div>Initial Payment:</div>
              <div>${currencySymbol}${formData.initial_payment.toFixed(2)}</div>
            </div>
        ${formData.initial_payment > 0 ? `
            <div class="flex">
              <div>Payment Method:</div>
              <div>${formData.payment_method.charAt(0).toUpperCase() + formData.payment_method.slice(1).replace('_', ' ')}</div>
            </div>
        ` : ''}
            <div class="border-top subtitle">
              <div class="flex">
                <div><strong>Outstanding Balance:</strong></div>
                <div><strong>${currencySymbol}${(totalAmount - formData.initial_payment).toFixed(2)}</strong></div>
              </div>
            </div>
          </div>

        <div class="text" style="text-align: center; margin-top: 6mm;">
          Thank you for doing business with us :)
        </div>
      </div>
    </body>
  </html>
`;

export default function OrderReceipt({ orderId, onClose }: OrderReceiptProps) {
    const [isLoading, setIsLoading] = useState(true);
    const [orderData, setOrderData] = useState<any>(null);
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedServices, setSelectedServices] = useState<OrderService[]>([]);
    const [selectedWorkers, setSelectedWorkers] = useState<OrderWorker[]>([]);
    const [formData, setFormData] = useState<any>(null);
    const { organization } = useAuthStore();
    const { addToast } = useUI();
    const currencySymbol = organization?.currency ? CURRENCIES[organization.currency]?.symbol || organization.currency : CURRENCIES['USD'].symbol;

    useEffect(() => {
        const fetchOrderData = async () => {
            try {
                // Fetch order details
                const { data: orderData, error: orderError } = await supabase
                    .from('orders')
                    .select(`
            *,
            client:clients(name, phone),
            workers:order_workers(
              id,
              worker_id,
              status,
              worker:workers(name),
              project:projects(name)
            ),
            services:order_services(
              id,
              service_id,
              quantity,
              cost,
              service:services(name)
            ),
            custom_fields:order_custom_fields(
              id,
              field:client_custom_fields(title, value, type)
            )
          `)
                    .eq('id', orderId)
                    .single();

                if (orderError) throw orderError;

                // Fetch payments
                const { data: paymentsData, error: paymentsError } = await supabase
                    .from('payments')
                    .select('*')
                    .eq('reference_type', 'service_order')
                    .eq('reference_id', orderData.id);

                if (paymentsError) throw paymentsError;

                // Transform the data
                const client: Client = {
                    id: orderData.client_id,
                    name: orderData.client.name,
                    phone: orderData.client.phone,
                    custom_fields: orderData.custom_fields?.map((field: any) => ({
                        id: field.id,
                        title: field.field.title,
                        value: field.field.value,
                        type: field.field.type
                    }))
                };

                const services: OrderService[] = orderData.services.map((service: any) => ({
                    service: {
                        id: service.service_id,
                        name: service.service.name,
                        cost: service.cost
                    },
                    quantity: service.quantity
                }));

                const workers: OrderWorker[] = orderData.workers.map((worker: any) => ({
                    worker: {
                        id: worker.worker_id,
                        name: worker.worker.name
                    },
                    project: {
                        id: worker.project_id,
                        name: worker.project.name
                    }
                }));

                const initialPayment = paymentsData?.reduce((sum, payment) => sum + payment.amount, 0) || 0;
                const paymentMethod = paymentsData?.[0]?.payment_method || 'cash';

                setOrderData(orderData);
                setSelectedClient(client);
                setSelectedServices(services);
                setSelectedWorkers(workers);
                setFormData({
                    initial_payment: initialPayment,
                    payment_method: paymentMethod
                });
            } catch (error) {
                console.error('Error fetching order data:', error);
                addToast({
                    type: 'error',
                    title: 'Error',
                    message: 'Failed to load order details'
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrderData();
    }, [orderId, addToast]);

    const totalAmount = selectedServices.reduce(
        (sum, { service }) => sum + (service.cost),
        0
    );

    const handlePrint = useCallback(() => {
        if (!selectedClient || !orderData || !formData) return;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(
                generateReceiptHTML(
                    organization?.name || '',
                    organization?.address,
                    selectedClient,
                    orderData,
                    selectedServices,
                    formData,
                    currencySymbol,
                    totalAmount
                )
            );
            printWindow.document.close();
            printWindow.focus();
            printWindow.print();
            printWindow.close();
        }
    }, [
        organization,
        selectedClient,
        orderData,
        selectedServices,
        formData,
        currencySymbol,
        totalAmount
    ]);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!orderData || !selectedClient || !formData) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-500">Order not found.</p>
            </div>
        );
    }

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

                <div className="receipt-content">
                    {/* Organization Header */}
                    <div className="text-center mb-2">
                        <h1 className="text-[18px] font-bold">{organization?.name}</h1>
                        {organization?.address && (
                            <p className="text-[12px] mb-2">{organization.address}</p>
                        )}
                    </div>

                    {/* Receipt Title */}
                    <div className="text-center mb-4">
                        <h2 className="text-[12px] font-bold">RECEIPT</h2>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-3">
                        <div>
                            <p className="text-[12px] font-bold">Order For:</p>
                            <div className="pl-2">
                                <p className="text-[12px]">{selectedClient.name}</p>
                                {selectedClient.phone && (
                                    <p className="text-[12px]">{selectedClient.phone}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <p className="text-[12px] font-bold">Order Date:</p>
                            <p className="text-[12px] pl-2">{format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
                        </div>

                        <div>
                            <p className="text-[12px] font-bold">Order Number:</p>
                            <p className="text-[12px] pl-2">{orderData.order_number}</p>
                        </div>

                        {/* Services */}
                        <div>
                            <p className="text-[12px] font-bold mb-2">Services:</p>
                            <div className="space-y-1">
                                {selectedServices.map(({ service, quantity }) => (
                                    <div key={service.id} className="flex justify-between pl-2">
                                        <div>
                                            <p className="text-[12px]">{service.name}</p>
                                            <p className="text-[10px] text-gray-500">x{quantity}</p>
                                        </div>
                                        <p className="text-[12px]">
                                            {currencySymbol} {service.cost.toFixed(2)}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Total Amount */}
                        <div className="border-t pt-2">
                            <div className="flex justify-between">
                                <p className="text-[12px] font-bold">Total Amount:</p>
                                <p className="text-[12px] font-bold">
                                    {currencySymbol} {totalAmount.toFixed(2)}
                                </p>
                            </div>
                            <div className="flex justify-between">
                                <p className="text-[12px]">Initial Payment:</p>
                                <p className="text-[12px]">
                                    {currencySymbol} {formData.initial_payment.toFixed(2)}
                                </p>
                            </div>
                            {formData.initial_payment > 0 && (
                                <div className="flex justify-between">
                                    <p className="text-[12px]">Payment Method:</p>
                                    <p className="text-[12px]">
                                        {formData.payment_method.charAt(0).toUpperCase() + formData.payment_method.slice(1).replace('_', ' ')}
                                    </p>
                                </div>
                            )}
                            <div className="flex justify-between border-t pt-1 mt-2">
                                <p className="text-[12px] font-bold">Outstanding Bal:</p>
                                <p className="text-[12px] font-bold">
                                    {currencySymbol} {(totalAmount - formData.initial_payment).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="mt-6 text-center">
                        <p className="text-[12px]">Thank you for doing business with us :)</p>
                    </div>
                </div>
            </div>
        </div>
    );
} 