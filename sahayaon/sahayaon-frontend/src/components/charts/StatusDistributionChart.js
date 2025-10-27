import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Disable animations for better performance
ChartJS.defaults.animation = false;

const StatusDistributionChart = ({ data, darkMode = false }) => {
  // Prepare chart data
  const chartData = {
    labels: ['Status Distribution'],
    datasets: [
      {
        label: 'Open',
        data: [data.open || 0],
        backgroundColor: '#8B5CF6', // Purple
        borderColor: '#8B5CF6',
        borderWidth: 0,
      },
      {
        label: 'In Progress',
        data: [data.inProgress || 0],
        backgroundColor: '#3B82F6', // Bright blue
        borderColor: '#3B82F6',
        borderWidth: 0,
      },
      {
        label: 'Resolved',
        data: [data.resolved || 0],
        backgroundColor: '#06B6D4', // Light blue/cyan
        borderColor: '#06B6D4',
        borderWidth: 0,
      },
      {
        label: 'Completed',
        data: [data.completed || 0],
        backgroundColor: '#10B981', // Light green
        borderColor: '#10B981',
        borderWidth: 0,
      },
      {
        label: 'Assigned',
        data: [data.assigned || 0],
        backgroundColor: '#6B7280', // Dark gray/charcoal
        borderColor: '#6B7280',
        borderWidth: 0,
      },
    ],
  };

  const options = {
    indexAxis: 'y', // Horizontal bar chart
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          pointStyle: 'rect',
          padding: 20,
          font: {
            size: 12,
            family: 'Arial, sans-serif',
          },
          color: darkMode ? '#E5E7EB' : '#374151',
        },
      },
      tooltip: {
        backgroundColor: darkMode ? '#374151' : '#FFFFFF',
        titleColor: darkMode ? '#E5E7EB' : '#374151',
        bodyColor: darkMode ? '#E5E7EB' : '#374151',
        borderColor: darkMode ? '#4B5563' : '#E5E7EB',
        borderWidth: 1,
        cornerRadius: 6,
        displayColors: true,
        callbacks: {
          label: function(context) {
            const label = context.dataset.label || '';
            const value = context.parsed.x;
            const total = data.total || 1;
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      },
    },
    scales: {
      x: {
        stacked: true,
        beginAtZero: true,
        grid: {
          color: darkMode ? '#374151' : '#E5E7EB',
          drawBorder: false,
        },
        ticks: {
          color: darkMode ? '#9CA3AF' : '#6B7280',
          font: {
            size: 11,
            family: 'Arial, sans-serif',
          },
        },
      },
      y: {
        stacked: true,
        display: false, // Hide y-axis labels since we only have one category
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="w-full h-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default StatusDistributionChart;

