// components/assets/RepairQueueWorkflow.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
    ArrowLeftIcon,
    WrenchIcon,
    CheckCircleIcon,
    ClockIcon,
    AlertTriangleIcon,
    UserIcon,
    CalendarIcon,
    FileTextIcon
} from './AssetIcons';
import { API_BASE_URL } from '../../config/constants';
import { authClient } from '../../config/firebase';
import { motion } from 'framer-motion';
import Spinner from '../common/Spinner';

const RepairQueueWorkflow = ({ currentUser, showFlashMessage }) => {
    const { assetId, queueId } = useParams();
    const navigate = useNavigate();
    const [asset, setAsset] = useState(null);
    const [queueItem, setQueueItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [formData, setFormData] = useState({
        status: '',
        retest_result: '',
        completion_notes: '',
    });

    useEffect(() => {
        fetchAssetAndQueueItem();
    }, [assetId, queueId]);

    const fetchAssetAndQueueItem = async () => {
        try {
            setLoading(true);
            const token = await authClient.currentUser?.getIdToken();
            
            // Fetch asset
            const assetResponse = await fetch(`${API_BASE_URL}/api/assets/${assetId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
            });

            if (!assetResponse.ok) {
                throw new Error('Failed to fetch asset');
            }

            const assetData = await assetResponse.json();
            setAsset(assetData);

            // Find the queue item
            const repairQueue = assetData.repair_queue || [];
            const item = repairQueue.find(q => q.id === queueId);
            
            if (!item) {
                throw new Error('Repair queue item not found');
            }

            setQueueItem(item);
            setFormData({
                status: item.status || '',
                retest_result: item.retest_result || '',
                completion_notes: item.completion_notes || '',
            });
        } catch (error) {
            console.error('Error fetching asset and queue item:', error);
            if (showFlashMessage) {
                showFlashMessage(error.message || 'Failed to load repair queue item', 'error');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (newStatus) => {
        try {
            setUpdating(true);
            const token = await authClient.currentUser?.getIdToken();
            
            const updateData = {
                status: newStatus,
            };

            // Add additional data based on status
            if (newStatus === 'Retesting') {
                updateData.retest_date = new Date().toISOString();
            }
            if (newStatus === 'Completed') {
                updateData.completion_notes = formData.completion_notes;
                updateData.completed_at = new Date().toISOString();
            }
            if (newStatus === 'In Progress') {
                updateData.started_at = new Date().toISOString();
            }

            const response = await fetch(`${API_BASE_URL}/api/assets/${assetId}/repair-queue/${queueId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update status');
            }

            if (showFlashMessage) {
                showFlashMessage('Repair queue status updated successfully', 'success');
            }

            // Refresh data
            await fetchAssetAndQueueItem();
        } catch (error) {
            console.error('Error updating status:', error);
            if (showFlashMessage) {
                showFlashMessage(error.message || 'Failed to update status', 'error');
            }
        } finally {
            setUpdating(false);
        }
    };

    const handleRetestSubmit = async () => {
        try {
            setUpdating(true);
            const token = await authClient.currentUser?.getIdToken();
            
            const updateData = {
                status: formData.retest_result === 'Pass' ? 'Completed' : 'In Progress',
                retest_result: formData.retest_result,
            };

            if (formData.retest_result === 'Pass') {
                updateData.completion_notes = formData.completion_notes;
            }

            const response = await fetch(`${API_BASE_URL}/api/assets/${assetId}/repair-queue/${queueId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to submit retest');
            }

            if (showFlashMessage) {
                showFlashMessage('Retest result submitted successfully', 'success');
            }

            await fetchAssetAndQueueItem();
        } catch (error) {
            console.error('Error submitting retest:', error);
            if (showFlashMessage) {
                showFlashMessage(error.message || 'Failed to submit retest', 'error');
            }
        } finally {
            setUpdating(false);
        }
    };

    const getStatusColor = (status) => {
        const statusColors = {
            'Queued': 'bg-gray-100 text-gray-800',
            'In Progress': 'bg-blue-100 text-blue-800',
            'Retesting': 'bg-yellow-100 text-yellow-800',
            'Completed': 'bg-green-100 text-green-800',
        };
        return statusColors[status] || 'bg-gray-100 text-gray-800';
    };

    const getNextActions = (currentStatus) => {
        switch (currentStatus) {
            case 'Queued':
                return [{ label: 'Start Repair', status: 'In Progress', color: 'blue' }];
            case 'In Progress':
                return [{ label: 'Mark for Retest', status: 'Retesting', color: 'yellow' }];
            case 'Retesting':
                return []; // Handled by retest form
            case 'Completed':
                return [];
            default:
                return [];
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <Spinner size="md" className="mx-auto mb-2" />
                    <p className="text-sm text-gray-600">Loading repair queue workflow...</p>
                </div>
            </div>
        );
    }

    if (!asset || !queueItem) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <AlertTriangleIcon className="w-8 h-8 text-red-500 mx-auto mb-2" />
                    <p className="text-sm text-gray-900 font-semibold mb-1">Repair queue item not found</p>
                    <button
                        onClick={() => navigate(`/assets/${assetId}`)}
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-xs font-semibold mt-3"
                    >
                        Back to Asset
                    </button>
                </div>
            </div>
        );
    }

    const nextActions = getNextActions(queueItem.status);

    return (
        <div className="bg-gray-50 min-h-screen p-4">
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="mb-3">
                    <button
                        onClick={() => navigate(`/assets/${assetId}`)}
                        className="flex items-center space-x-1.5 text-gray-600 hover:text-gray-900 mb-2 transition-colors text-xs font-medium"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        <span>Back to Asset</span>
                    </button>
                    
                    <div className="bg-white rounded-lg px-4 py-3 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-lg font-bold text-gray-900">Repair Queue Workflow</h1>
                                <p className="text-xs text-gray-600 mt-0.5">
                                    {asset.asset_name || 'Unnamed Asset'} - {queueItem.id}
                                </p>
                            </div>
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${getStatusColor(queueItem.status)}`}>
                                {queueItem.status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Workflow Steps */}
                <div className="bg-white rounded-lg p-4 shadow-sm mb-3">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-1.5">
                        <WrenchIcon className="w-4 h-4 text-gray-600" />
                        <span>Workflow Status</span>
                    </h3>
                    <div className="flex items-center justify-between">
                        {[
                            { status: 'Queued', label: 'Queued', icon: ClockIcon },
                            { status: 'In Progress', label: 'In Progress', icon: WrenchIcon },
                            { status: 'Retesting', label: 'Retesting', icon: CheckCircleIcon },
                            { status: 'Completed', label: 'Completed', icon: CheckCircleIcon },
                        ].map((step, index) => {
                            const isActive = queueItem.status === step.status;
                            const isCompleted = ['Queued', 'In Progress', 'Retesting', 'Completed'].indexOf(queueItem.status) > 
                                                ['Queued', 'In Progress', 'Retesting', 'Completed'].indexOf(step.status);
                            const StepIcon = step.icon;
                            
                            return (
                                <div key={step.status} className="flex items-center flex-1">
                                    <div className="flex flex-col items-center flex-1">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                            isCompleted 
                                                ? 'bg-green-100 text-green-700' 
                                                : isActive 
                                                ? 'bg-blue-100 text-blue-700' 
                                                : 'bg-gray-100 text-gray-400'
                                        }`}>
                                            <StepIcon className="w-4 h-4" />
                                        </div>
                                        <span className={`text-xs font-semibold mt-1 ${
                                            isActive ? 'text-blue-700' : isCompleted ? 'text-green-700' : 'text-gray-400'
                                        }`}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {index < 3 && (
                                        <div className={`h-0.5 flex-1 mx-2 ${
                                            isCompleted ? 'bg-green-500' : 'bg-gray-200'
                                        }`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Queue Item Details */}
                <div className="bg-white rounded-lg p-4 shadow-sm mb-3">
                    <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-1.5">
                        <FileTextIcon className="w-4 h-4 text-gray-600" />
                        <span>Repair Details</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">Issue Description</p>
                            <p className="text-xs text-gray-900 bg-gray-50 p-2 rounded-md">{queueItem.issue_description}</p>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">Priority</p>
                            <span className={`px-2 py-1 rounded-md text-xs font-semibold ${
                                queueItem.priority === 'High' ? 'bg-red-100 text-red-800' :
                                queueItem.priority === 'Medium' ? 'bg-orange-100 text-orange-800' :
                                'bg-blue-100 text-blue-800'
                            }`}>
                                {queueItem.priority}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-gray-600 mb-1">Created</p>
                            <p className="text-xs text-gray-900">
                                {queueItem.created_at ? new Date(queueItem.created_at).toLocaleString() : '-'}
                            </p>
                            <p className="text-xs text-gray-500">by {queueItem.created_by_name || 'Unknown'}</p>
                        </div>
                        {queueItem.started_at && (
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Started</p>
                                <p className="text-xs text-gray-900">
                                    {new Date(queueItem.started_at).toLocaleString()}
                                </p>
                            </div>
                        )}
                        {queueItem.retest_date && (
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Retest Date</p>
                                <p className="text-xs text-gray-900">
                                    {new Date(queueItem.retest_date).toLocaleString()}
                                </p>
                            </div>
                        )}
                        {queueItem.completed_at && (
                            <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Completed</p>
                                <p className="text-xs text-gray-900">
                                    {new Date(queueItem.completed_at).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                {nextActions.length > 0 && (
                    <div className="bg-white rounded-lg p-4 shadow-sm mb-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-3">Actions</h3>
                        <div className="flex items-center space-x-2">
                            {nextActions.map((action) => {
                                const colorClasses = {
                                    blue: 'bg-blue-600 hover:bg-blue-700',
                                    yellow: 'bg-yellow-600 hover:bg-yellow-700',
                                    green: 'bg-green-600 hover:bg-green-700',
                                };
                                return (
                                    <button
                                        key={action.status}
                                        onClick={() => handleStatusUpdate(action.status)}
                                        disabled={updating}
                                        className={`px-3 py-1.5 ${colorClasses[action.color] || 'bg-blue-600 hover:bg-blue-700'} text-white rounded-md text-xs font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                        {updating ? 'Updating...' : action.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Retest Form */}
                {queueItem.status === 'Retesting' && (
                    <div className="bg-white rounded-lg p-4 shadow-sm mb-3">
                        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center space-x-1.5">
                            <CheckCircleIcon className="w-4 h-4 text-gray-600" />
                            <span>Retest Asset</span>
                        </h3>
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-semibold text-gray-700 mb-1 block">Retest Result</label>
                                <select
                                    value={formData.retest_result}
                                    onChange={(e) => setFormData({ ...formData, retest_result: e.target.value })}
                                    className="w-full px-3 py-1.5 rounded-md text-xs border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                >
                                    <option value="">Select result</option>
                                    <option value="Pass">Pass</option>
                                    <option value="Fail">Fail</option>
                                </select>
                            </div>
                            {formData.retest_result === 'Pass' && (
                                <div>
                                    <label className="text-xs font-semibold text-gray-700 mb-1 block">Completion Notes</label>
                                    <textarea
                                        value={formData.completion_notes}
                                        onChange={(e) => setFormData({ ...formData, completion_notes: e.target.value })}
                                        placeholder="Enter completion notes..."
                                        rows="3"
                                        className="w-full px-3 py-1.5 rounded-md text-xs border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                </div>
                            )}
                            <button
                                onClick={handleRetestSubmit}
                                disabled={updating || !formData.retest_result}
                                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-md text-xs font-semibold transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {updating ? 'Submitting...' : 'Submit Retest Result'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Completion Notes (if completed) */}
                {queueItem.status === 'Completed' && queueItem.completion_notes && (
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                        <h3 className="text-sm font-bold text-gray-900 mb-2 flex items-center space-x-1.5">
                            <FileTextIcon className="w-4 h-4 text-gray-600" />
                            <span>Completion Notes</span>
                        </h3>
                        <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded-md">{queueItem.completion_notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RepairQueueWorkflow;

