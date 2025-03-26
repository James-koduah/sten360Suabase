import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { CURRENCIES } from './constants';

interface Task {
  id: string;
  date: string;
  project_id: string;
  description: string | null;
  amount: number;
  status: 'pending' | 'completed';
  completed_at: string | null;
  deductions?: { amount: number; reason: string }[];
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
  // Generate PDF Report
  const pdf = new jsPDF();
  
  // Add header with proper styling
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(20);
  pdf.text(`Worker Report: ${worker.name}`, 14, 20);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.text(`Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`, 14, 30);

  const currencySymbol = CURRENCIES[currency]?.symbol || currency;

  // Calculate totals
  // Calculate stats
  const completedTasks = tasks.filter(t => t.status === 'completed');
  const assignedTasks = tasks.filter(t => t.status === 'pending');

  // Calculate deductions from completed tasks only
  const totalDeductions = completedTasks.reduce((sum, task) => 
    sum + (task.deductions?.reduce((dSum, d) => dSum + d.amount, 0) || 0), 0);
  
  // Calculate completed earnings (from completed tasks only)
  const completedEarnings = completedTasks.reduce((sum, task) => {
    const deductions = task.deductions?.reduce((dSum, d) => dSum + d.amount, 0) || 0;
    return sum + (task.amount - deductions);
  }, 0);

  // Calculate weekly projects total
  const weeklyProjectTotal = tasks.reduce((sum, task) => sum + task.amount, 0);

  // Add summary
  pdf.setFont('helvetica', 'bold');
  pdf.text('Summary:', 14, 40);
  const summaryStartY = 48;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total Tasks: ${tasks.length}`, 20, summaryStartY);
  pdf.text(`Assigned Tasks: ${assignedTasks.length}`, 20, summaryStartY + 8);
  pdf.text(`Completed Tasks: ${completedTasks.length}`, 20, summaryStartY + 16);
  pdf.text(`Weekly Project Total: ${currencySymbol} ${weeklyProjectTotal.toFixed(2)}`, 20, summaryStartY + 24);
  pdf.text(`Completed Earnings: ${currencySymbol} ${completedEarnings.toFixed(2)}`, 20, summaryStartY + 32);

  // Add tasks details
  pdf.setFont('helvetica', 'bold');
  pdf.text('Tasks Details:', 14, summaryStartY + 56);
  pdf.setFont('helvetica', 'normal');

  let yPos = summaryStartY + 70;
  tasks.forEach((task, index) => {
    const project = workerProjects.find(wp => wp.project_id === task.project_id)?.project;
    const deductionsTotal = task.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0;
    const taskNet = task.amount - deductionsTotal;

    // Add new page if needed
    if (yPos > 250) {
      pdf.addPage();
      yPos = 20;
    }

    // Task header with proper styling
    autoTable(pdf, {
      startY: yPos,
      head: [[{
        content: `Task ${index + 1}`,
        styles: { halign: 'left', fillColor: [37, 99, 235] }
      }]],
      theme: 'plain',
      headStyles: {
        textColor: 255,
        fontSize: 12,
        fontStyle: 'bold',
        cellPadding: 8
      },
      margin: { left: 20 }
    });

    // Task details in a clean table format
    autoTable(pdf, {
      startY: pdf.lastAutoTable.finalY,
      body: [
        ['Date', format(new Date(task.date), 'MMM dd, yyyy')],
        ['Project', project?.name || 'Unknown Project'],
        ['Status', task.status.charAt(0).toUpperCase() + task.status.slice(1)],
        ['Completed', task.completed_at ? format(new Date(task.completed_at), 'MMM dd, yyyy HH:mm') : '-'],
        ['Amount', `${currencySymbol} ${task.amount.toFixed(2)}`],
        ['Deductions', `${currencySymbol} ${deductionsTotal.toFixed(2)}`],
        ['Net Amount', `${currencySymbol} ${taskNet.toFixed(2)}`]
      ],
      theme: 'striped',
      styles: {
        fontSize: 10,
        cellPadding: 8,
        overflow: 'linebreak',
        minCellWidth: 80
      },
      columnStyles: {
        0: { fontStyle: 'bold', fillColor: [243, 244, 246] }
      },
      margin: { left: 20 }
    });

    // Add description if exists
    if (task.description) {
      autoTable(pdf, {
        startY: pdf.lastAutoTable.finalY + 2,
        head: [['Description']],
        body: [[task.description]],
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 8,
          overflow: 'linebreak',
          cellWidth: 'wrap'
        },
        headStyles: {
          fillColor: [253, 224, 71],
          textColor: [120, 53, 15],
          fontStyle: 'bold'
        },
        margin: { left: 20 }
      });
    }

    // Add deductions details if exists
    if (task.deductions?.length) {
      const deductionsData = task.deductions.map(d => [
        `GHS ${d.amount.toFixed(2)}`,
        d.reason
      ]);

      autoTable(pdf, {
        startY: pdf.lastAutoTable.finalY + 2,
        head: [['Deduction Amount', 'Deduction Reason']],
        body: deductionsData,
        theme: 'plain',
        styles: {
          fontSize: 10,
          cellPadding: 8,
          overflow: 'linebreak'
        },
        headStyles: {
          fillColor: [252, 165, 165],
          textColor: [127, 29, 29],
          fontStyle: 'bold'
        },
        margin: { left: 20 }
      });
    }

    yPos = pdf.lastAutoTable.finalY + 15;
  });

  // Generate WhatsApp message
  const whatsappMessage = `
*Work Report for ${worker.name}*
Period: ${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}

*Summary*
Total Tasks: ${tasks.length} 
Assigned Tasks: ${assignedTasks.length}
Tasks Completed: ${completedTasks.length}
Weekly Project Total: ${currencySymbol} ${weeklyProjectTotal.toFixed(2)}
Completed Earnings: ${currencySymbol} ${completedEarnings.toFixed(2)}

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