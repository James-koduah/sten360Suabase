import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CURRENCIES } from './constants';

interface Task {
  id: string;
  organization_id: string;
  worker_id: string;
  project_id: string;
  description?: string;
  due_date: string;
  status: 'pending' | 'in_progress' | 'delayed' | 'completed';
  amount: number;
  completed_at?: string;
  late_reason?: string;
  created_at: string;
  updated_at: string;
  status_changed_at?: string;
  delay_reason?: string;
  order_id?: string;
  project?: {
    id: string;
    name: string;
  };
  worker?: {
    id: string;
    name: string;
  };
  deductions?: {
    id: string;
    amount: number;
    reason: string;
    created_at: string;
  }[];
}

interface Worker {
  id: string;
  name: string;
  whatsapp: string | null;
}

interface WorkerProject {
  id: string;
  worker_id: string;
  project_id: string;
  project: {
    id: string;
    name: string;
  };
}

export const generateWorkerReport = (
  worker: Worker, 
  tasks: Task[], 
  workerProjects: WorkerProject[],
  startDate: Date,
  endDate: Date,
  currency: string = 'GHS'
) => {
  const pdf = new jsPDF();
  
  // Set default font and size for the entire document
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  // Add header with modern styling
  pdf.setFillColor(17, 24, 39);
  pdf.rect(0, 0, 210, 25, 'F');
  pdf.setTextColor(255);
  pdf.setFontSize(14);
  pdf.text(`Worker Report: ${worker.name}`, 14, 18);
  
  // Reset text color and add period
  pdf.setTextColor(0);
  pdf.setFontSize(8);
  pdf.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 14, 28);

  // Get the correct currency symbol and ensure it's properly encoded
  const currencySymbol = CURRENCIES[currency]?.symbol || currency;
  
  // Function to format currency values
  const formatCurrency = (amount: number) => {
    // Use a more reliable way to display currency
    return `${currencySymbol} ${amount.toFixed(2)}`;
  };

  // Calculate totals
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const assignedTasks = tasks.filter(t => t.status === 'pending');
  const totalDeductions = completedTasks.reduce((sum, task) => 
    sum + (task.deductions?.reduce((dSum, d) => dSum + d.amount, 0) || 0), 0);
  const completedEarnings = completedTasks.reduce((sum, task) => {
    const deductions = task.deductions?.reduce((dSum, d) => dSum + d.amount, 0) || 0;
    return sum + (task.amount - deductions);
  }, 0);
  const weeklyProjectTotal = tasks.reduce((sum, task) => sum + task.amount, 0);

  // Add summary section with modern styling
  pdf.setFillColor(249, 250, 251);
  pdf.rect(10, 35, 190, 35, 'F');
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(10);
  pdf.text('Summary', 14, 42);
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const summaryStartY = 50;
  pdf.text(`Total Tasks: ${tasks.length}`, 20, summaryStartY);
  pdf.text(`Assigned Tasks: ${assignedTasks.length}`, 20, summaryStartY + 6);
  pdf.text(`Completed Tasks: ${completedTasks.length}`, 20, summaryStartY + 12);
  pdf.text(`Weekly Project Total: ${formatCurrency(weeklyProjectTotal)}`, 20, summaryStartY + 18);
  pdf.text(`Completed Earnings: ${formatCurrency(completedEarnings)}`, 20, summaryStartY + 24);

  // Add tasks details with improved styling
  let yPos = 80;
  tasks.forEach((task, index) => {
    const project = workerProjects.find(wp => wp.project_id === task.project_id)?.project;
    const deductionsTotal = task.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
    const taskNet = task.amount - deductionsTotal;

    // Add new page if needed
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }

    // Task header with modern styling
    autoTable(pdf, {
      startY: yPos,
      head: [[{
        content: `Task ${index + 1}`,
        styles: { 
          halign: 'left', 
          fillColor: [17, 24, 39],
          textColor: 255,
          fontSize: 8,
          fontStyle: 'bold'
        }
      }]],
      theme: 'plain',
      headStyles: {
        cellPadding: 4
      },
      margin: { left: 14 }
    });

    // Task details with improved styling
    autoTable(pdf, {
      startY: (pdf as any).lastAutoTable.finalY,
      body: [
        ['Date', format(new Date(task.due_date), 'MMM dd, yyyy')],
        ['Project', project?.name || 'Unknown Project'],
        ['Status', task.status.charAt(0).toUpperCase() + task.status.slice(1)],
        ['Completed', task.completed_at ? format(new Date(task.completed_at), 'MMM dd, yyyy HH:mm') : '-'],
        ['Amount', formatCurrency(task.amount)],
        ['Deductions', formatCurrency(deductionsTotal)],
        ['Net Amount', formatCurrency(taskNet)]
      ],
      theme: 'plain',
      styles: {
        fontSize: 7,
        cellPadding: 4,
        overflow: 'linebreak',
        minCellWidth: 80
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [249, 250, 251] }
      },
      margin: { left: 14 }
    });

    // Add description if exists
    if (task.description) {
      autoTable(pdf, {
        startY: (pdf as any).lastAutoTable.finalY + 1,
        head: [['Description']],
        body: [[task.description]],
        theme: 'plain',
        styles: {
          fontSize: 7,
          cellPadding: 4,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [253, 224, 71],
          textColor: [120, 53, 15],
          fontStyle: 'bold'
        },
        margin: { left: 14 }
      });
    }

    // Add deductions details if exists
    if (task.deductions?.length) {
      const deductionsData = task.deductions.map(d => [
        formatCurrency(d.amount),
        d.reason
      ]);

      autoTable(pdf, {
        startY: (pdf as any).lastAutoTable.finalY + 1,
        head: [['Deduction Amount', 'Deduction Reason']],
        body: deductionsData,
        theme: 'plain',
        styles: {
          fontSize: 7,
          cellPadding: 4,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [252, 165, 165],
          textColor: [127, 29, 29],
          fontStyle: 'bold'
        },
        margin: { left: 14 }
      });
    }

    yPos = (pdf as any).lastAutoTable.finalY + 8;
  });

  // Generate WhatsApp message with improved formatting
  const whatsappMessage = `
*Work Report for ${worker.name}*
Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}

*Summary*
• Total Tasks: ${tasks.length} 
• Assigned Tasks: ${assignedTasks.length}
• Tasks Completed: ${completedTasks.length}
• Weekly Project Total: ${formatCurrency(weeklyProjectTotal)}
• Completed Earnings: ${formatCurrency(completedEarnings)}

Your detailed report has been attached as a PDF.

Thank you for your service!
`;
  
  return {
    pdf: pdf.save(`${worker.name}_report_${format(startDate, 'yyyy-MM-dd')}.pdf`),
    whatsappMessage: encodeURIComponent(whatsappMessage)
  };
};

interface FinancialData {
  date: string;
  totalTasks: number;
  totalAmount: number;
  totalDeductions: number;
  netAmount: number;
}

export const generateFinancialReport = (data: FinancialData[], period: { start: Date; end: Date }, currency: string = 'GHS') => {
  const currencySymbol = CURRENCIES[currency]?.symbol || currency;

  // Generate Excel Report
  const workbook = XLSX.utils.book_new();
  
  // Format data for Excel
  const formattedData = data.map(record => ({
    Date: format(new Date(record.date), 'MMM dd, yyyy'),
    'Total Tasks': record.totalTasks,
    'Total Amount': `${currencySymbol} ${record.totalAmount.toFixed(2)}`,
    'Total Deductions': `${currencySymbol} ${record.totalDeductions.toFixed(2)}`,
    'Net Amount': `${currencySymbol} ${record.netAmount.toFixed(2)}`
  }));

  const worksheet = XLSX.utils.json_to_sheet(formattedData);
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Financial Report');

  // Generate PDF Report
  const pdf = new jsPDF();
  
  pdf.setFontSize(20);
  pdf.text('Financial Report', 14, 20);
  pdf.setFontSize(12);
  pdf.text(`Period: ${format(period.start, 'MMM dd, yyyy')} - ${format(period.end, 'MMM dd, yyyy')}`, 14, 30);

  // Calculate totals
  const totals = data.reduce((acc, record) => ({
    tasks: acc.tasks + record.totalTasks,
    amount: acc.amount + record.totalAmount,
    deductions: acc.deductions + record.totalDeductions,
    net: acc.net + record.netAmount
  }), { tasks: 0, amount: 0, deductions: 0, net: 0 });

  // Add summary
  pdf.text('Summary:', 14, 40);
  pdf.text(`Total Tasks: ${totals.tasks}`, 20, 48);
  pdf.text(`Total Amount: ${currencySymbol} ${totals.amount.toFixed(2)}`, 20, 56);
  pdf.text(`Total Deductions: ${currencySymbol} ${totals.deductions.toFixed(2)}`, 20, 64);
  pdf.text(`Net Amount: ${currencySymbol} ${totals.net.toFixed(2)}`, 20, 72);

  // Add data table
  const tableData = data.map(record => [
    format(new Date(record.date), 'MMM dd, yyyy'),
    record.totalTasks.toString(),
    `${currencySymbol} ${record.totalAmount.toFixed(2)}`,
    `${currencySymbol} ${record.totalDeductions.toFixed(2)}`,
    `${currencySymbol} ${record.netAmount.toFixed(2)}`
  ]);

  autoTable(pdf, {
    startY: 80,
    head: [['Date', 'Tasks', 'Amount', 'Deductions', 'Net Amount']],
    body: tableData,
    theme: 'striped',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [59, 130, 246] }
  });

  return { workbook, pdf };
};