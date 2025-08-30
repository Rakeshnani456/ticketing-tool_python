import React, { useState, useEffect, useCallback } from 'react';
import { 
    TrendingUp, 
    FileText, 
    Users, 
    Clock, 
    AlertCircle, 
    CheckCircle,
    Download,
    Calendar,
    Filter,
    BarChart3,
    PieChart,
    Activity,
    RefreshCw,
    Eye
} from 'lucide-react';
import { useRealTimeAnalytics } from '../hooks/useRealTimeAnalytics';
import { websocketClient } from '../utils/websocketClient';
import { API_BASE_URL } from '../config/constants';
import { Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

// Disable Chart.js animations globally for this component
ChartJS.defaults.animation = false;
ChartJS.defaults.responsiveAnimationDuration = 0;

const ReportsComponent = ({ user, showFlashMessage }) => {
    const [activeTab, setActiveTab] = useState('tickets');
    const [dateRange, setDateRange] = useState('30d');
    const [selectedClients, setSelectedClients] = useState([]);
    const [clients, setClients] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [reportData, setReportData] = useState(null);
    const [filters, setFilters] = useState({
        dateRange: '30d',
        clients: [],
        status: 'all',
        priority: 'all'
    });

    // Use the existing real-time analytics hook
    const { data: analyticsData, loading: analyticsLoading, error: analyticsError } = useRealTimeAnalytics(user, filters);

    // Fetch clients for filtering
    useEffect(() => {
        const fetchClients = async () => {
            try {
                const idToken = await user.firebaseUser.getIdToken();
                const response = await fetch(`${API_BASE_URL}/api/clients`, {
                    headers: { 'Authorization': `Bearer ${idToken}` }
                });
                if (response.ok) {
                    const clientsData = await response.json();
                    setClients(clientsData);
                }
            } catch (error) {
                console.error('Error fetching clients:', error);
            }
        };

        if (user) {
            fetchClients();
        }
    }, [user]);

    // Generate report data based on current filters
    const generateReport = useCallback(async () => {
        setIsLoading(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const params = new URLSearchParams({
                dateRange: filters.dateRange,
                clients: filters.clients.join(','),
                status: filters.status,
                priority: filters.priority
            });

            const response = await fetch(`${API_BASE_URL}/analytics/tickets?${params}`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                setReportData(data);
            } else {
                throw new Error('Failed to fetch report data');
            }
        } catch (error) {
            console.error('Error generating report:', error);
            showFlashMessage('Failed to generate report. Please try again.', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [user, filters, showFlashMessage]);

    // Download report as Excel
    const downloadExcel = async () => {
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const params = new URLSearchParams({
                dateRange: filters.dateRange,
                clients: filters.clients.join(','),
                status: filters.status,
                priority: filters.priority,
                format: 'excel'
            });

            const response = await fetch(`${API_BASE_URL}/analytics/export?${params}`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ticket-report-${new Date().toISOString().split('T')[0]}.xlsx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showFlashMessage('Report downloaded successfully!', 'success');
            } else {
                throw new Error('Failed to download report');
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            showFlashMessage('Failed to download report. Please try again.', 'error');
        }
    };

    // Download report as PDF
    const downloadPDF = async () => {
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const params = new URLSearchParams({
                dateRange: filters.dateRange,
                clients: filters.clients.join(','),
                status: filters.status,
                priority: filters.priority,
                format: 'pdf'
            });

            const response = await fetch(`${API_BASE_URL}/analytics/export?${params}`, {
                headers: { 'Authorization': `Bearer ${idToken}` }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ticket-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showFlashMessage('Report downloaded successfully!', 'success');
            } else {
                throw new Error('Failed to download report');
            }
        } catch (error) {
            console.error('Error downloading report:', error);
            showFlashMessage('Failed to download report. Please try again.', 'error');
        }
    };

    // Update filters
    const updateFilters = (newFilters) => {
        setFilters(prev => ({ ...prev, ...newFilters }));
    };

    // Clear all filters
    const clearFilters = () => {
        setFilters({
            dateRange: '30d',
            clients: [],
            status: 'all',
            priority: 'all'
        });
    };

    // Generate report when filters change
    useEffect(() => {
        if (user) {
            generateReport();
        }
    }, [filters, user, generateReport]);

    const tabs = [
        { id: 'tickets', label: 'Tickets', icon: FileText },
        { id: 'clients', label: 'Clients', icon: Users },
        { id: 'engineers', label: 'Engineers', icon: Users },
        { id: 'performance', label: 'Performance', icon: TrendingUp }
    ];

    const dateRangeOptions = [
        { value: '7d', label: 'Last 7 Days' },
        { value: '30d', label: 'Last 30 Days' },
        { value: '90d', label: 'Last 90 Days' },
        { value: '1y', label: 'Last Year' },
        { value: 'custom', label: 'Custom Range' }
    ];

    const statusOptions = [
        { value: 'all', label: 'All Statuses' },
        { value: 'Open', label: 'Open' },
        { value: 'In Progress', label: 'In Progress' },
        { value: 'Resolved', label: 'Resolved' },
        { value: 'Cancelled', label: 'Cancelled' }
    ];

    const priorityOptions = [
        { value: 'all', label: 'All Priorities' },
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                                <TrendingUp className="mr-3 text-orange-600" size={28} />
                                Reports & Analytics (Work in progress)
                            </h1>
                            <p className="text-gray-600 mt-2">
                                Comprehensive insights and analytics for your ticketing system
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={generateReport}
                                disabled={isLoading}
                                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                <RefreshCw className={`mr-2 ${isLoading ? 'animate-spin' : ''}`} size={16} />
                                {isLoading ? 'Generating...' : 'Generate Report'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                            <Filter className="mr-2" size={20} />
                            Filters
                        </h2>
                        <button
                            onClick={clearFilters}
                            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                        >
                            Clear All
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Date Range
                            </label>
                            <select
                                value={filters.dateRange}
                                onChange={(e) => updateFilters({ dateRange: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                                {dateRangeOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clients */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Clients
                            </label>
                            <select
                                multiple
                                value={filters.clients}
                                onChange={(e) => {
                                    const selected = Array.from(e.target.selectedOptions, option => option.value);
                                    updateFilters({ clients: selected });
                                }}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                                <option value="">All Clients</option>
                                {clients.map(client => (
                                    <option key={client.id} value={client.id}>
                                        {client.client_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Status */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Status
                            </label>
                            <select
                                value={filters.status}
                                onChange={(e) => updateFilters({ status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                                {statusOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Priority */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Priority
                            </label>
                            <select
                                value={filters.priority}
                                onChange={(e) => updateFilters({ priority: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                            >
                                {priorityOptions.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-lg shadow-sm mb-6">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6">
                            {tabs.map(tab => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                                            activeTab === tab.id
                                                ? 'border-orange-500 text-orange-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                    >
                                        <Icon className="mr-2" size={16} />
                                        {tab.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    {activeTab === 'tickets' && (
                        <TicketsTab 
                            data={analyticsData} 
                            isLoading={analyticsLoading} 
                            error={analyticsError}
                            onDownloadExcel={downloadExcel}
                            onDownloadPDF={downloadPDF}
                        />
                    )}
                    {activeTab === 'clients' && (
                        <ClientsTab 
                            data={analyticsData} 
                            isLoading={analyticsLoading} 
                            error={analyticsError}
                        />
                    )}
                    {activeTab === 'engineers' && (
                        <EngineersTab 
                            data={analyticsData} 
                            isLoading={analyticsLoading} 
                            error={analyticsError}
                        />
                    )}
                    {activeTab === 'performance' && (
                        <PerformanceTab 
                            data={analyticsData} 
                            isLoading={analyticsLoading} 
                            error={analyticsError}
                        />
                    )}
                </div>
            </div>
        </div>
    );
};

// Tickets Tab Component
const TicketsTab = ({ data, isLoading, error, onDownloadExcel, onDownloadPDF }) => {
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                <span className="ml-3 text-gray-600">Loading ticket data...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
                <p className="text-red-600">Error loading ticket data: {error.message}</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="text-center py-12">
                <FileText className="mx-auto text-gray-400 mb-4" size={48} />
                <p className="text-gray-600">No ticket data available</p>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900">Ticket Analytics</h3>
                <div className="flex space-x-3">
                    <button
                        onClick={onDownloadExcel}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                        <Download className="mr-2" size={16} />
                        Export Excel
                    </button>
                    <button
                        onClick={onDownloadPDF}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        <Download className="mr-2" size={16} />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <SummaryCard
                    title="Total Tickets"
                    value={data.totalTickets || 0}
                    icon={FileText}
                    color="blue"
                />
                <SummaryCard
                    title="Open Tickets"
                    value={data.openTickets || 0}
                    icon={AlertCircle}
                    color="orange"
                />
                <SummaryCard
                    title="Resolved Tickets"
                    value={data.resolvedTickets || 0}
                    icon={CheckCircle}
                    color="green"
                />
                <SummaryCard
                    title="Avg Resolution Time"
                    value={`${data.avgResolutionTime || 0}h`}
                    icon={Clock}
                    color="purple"
                />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <BarChart3 className="mr-2" size={20} />
                        Ticket Volume Trend
                    </h4>
                    <div className="h-64">
                        <TicketVolumeChart data={data} />
                    </div>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                        <PieChart className="mr-2" size={20} />
                        Status Distribution
                    </h4>
                    <div className="h-64">
                        <StatusDistributionChart data={data} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// Summary Card Component
const SummaryCard = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        blue: 'bg-blue-50 text-blue-600',
        orange: 'bg-orange-50 text-orange-600',
        green: 'bg-green-50 text-green-600',
        purple: 'bg-purple-50 text-purple-600'
    };

    return (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center">
                <div className={`p-3 rounded-full ${colorClasses[color]}`}>
                    <Icon size={24} />
                </div>
                <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600">{title}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                </div>
            </div>
        </div>
    );
};

// Placeholder components for other tabs
const ClientsTab = ({ data, isLoading, error }) => (
    <div className="text-center py-12">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Client Analytics</h3>
        <p className="text-gray-600">Client analytics will be implemented in the next phase</p>
    </div>
);

const EngineersTab = ({ data, isLoading, error }) => (
    <div className="text-center py-12">
        <Users className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Engineer Analytics</h3>
        <p className="text-gray-600">Engineer analytics will be implemented in the next phase</p>
    </div>
);

const PerformanceTab = ({ data, isLoading, error }) => (
    <div className="text-center py-12">
        <Activity className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Performance Analytics</h3>
        <p className="text-gray-600">Performance analytics will be implemented in the next phase</p>
    </div>
);

// Chart Components
const TicketVolumeChart = ({ data }) => {
    if (!data || !data.dailyVolume) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                No data available for chart
            </div>
        );
    }

    // Process data for the chart
    const chartData = {
        labels: data.dailyVolume.map(item => item.date),
        datasets: [
            {
                label: 'Open Tickets',
                data: data.dailyVolume.map(item => item.openTickets || 0),
                backgroundColor: 'rgba(239, 68, 68, 0.8)', // Red for open tickets
                borderColor: 'rgba(239, 68, 68, 1)',
                borderWidth: 1,
            },
            {
                label: 'Resolved Tickets',
                data: data.dailyVolume.map(item => item.resolvedTickets || 0),
                backgroundColor: 'rgba(34, 197, 94, 0.8)', // Green for resolved tickets
                borderColor: 'rgba(34, 197, 94, 1)',
                borderWidth: 1,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
            }
        },
        scales: {
            x: {
                display: true,
                title: {
                    display: true,
                    text: 'Date',
                    font: {
                        size: 12
                    }
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 45,
                    font: {
                        size: 10
                    }
                }
            },
            y: {
                display: true,
                title: {
                    display: true,
                    text: 'Number of Tickets',
                    font: {
                        size: 12
                    }
                },
                beginAtZero: true,
                ticks: {
                    stepSize: 1,
                    font: {
                        size: 10
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        }
    };

    return <Bar data={chartData} options={options} />;
};

const StatusDistributionChart = ({ data }) => {
    if (!data || !data.statusDistribution) {
        return (
            <div className="h-full flex items-center justify-center text-gray-500">
                No data available for chart
            </div>
        );
    }

    // Process data for the pie chart
    const chartData = {
        labels: Object.keys(data.statusDistribution).map(status => 
            status === 'In Progress' ? 'In Progress' : status.charAt(0).toUpperCase() + status.slice(1)
        ),
        datasets: [
            {
                data: Object.values(data.statusDistribution),
                backgroundColor: [
                    'rgba(239, 68, 68, 0.8)',   // Red for open
                    'rgba(245, 158, 11, 0.8)',   // Yellow for in_progress
                    'rgba(34, 197, 94, 0.8)',    // Green for resolved
                    'rgba(107, 114, 128, 0.8)',  // Gray for closed
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(107, 114, 128, 1)',
                ],
                borderWidth: 2,
            }
        ]
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    usePointStyle: true,
                    padding: 20,
                    font: {
                        size: 12
                    }
                }
            },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: 'rgba(255, 255, 255, 0.2)',
                borderWidth: 1,
                callbacks: {
                    label: function(context) {
                        const label = context.label || '';
                        const value = context.parsed;
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = ((value / total) * 100).toFixed(1);
                        return `${label}: ${value} (${percentage}%)`;
                    }
                }
            }
        }
    };

    return <Bar data={chartData} options={options} />;
};

export default ReportsComponent;
