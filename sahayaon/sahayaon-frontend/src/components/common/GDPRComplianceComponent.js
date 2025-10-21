// components/common/GDPRComplianceComponent.js
import React, { useState, useEffect } from 'react';
import { useThemeContext } from '../../contexts/ThemeContext';
import { Download, Trash2, Shield, Eye, Clock, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { authClient } from '../../config/firebase';
import PrimaryButton from './PrimaryButton';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const GDPRComplianceComponent = () => {
    const { theme } = useThemeContext();
    const [loading, setLoading] = useState(false);
    const [gdprRequests, setGdprRequests] = useState([]);
    const [consents, setConsents] = useState([]);
    const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
    const [confirmEmail, setConfirmEmail] = useState('');
    const [deleteReason, setDeleteReason] = useState('');
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchGDPRRequests();
        fetchConsentHistory();
    }, []);

    const fetchGDPRRequests = async () => {
        try {
            const token = await authClient.currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/gdpr/my-requests`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setGdprRequests(data.requests || []);
            }
        } catch (error) {
            console.error('Error fetching GDPR requests:', error);
        }
    };

    const fetchConsentHistory = async () => {
        try {
            const token = await authClient.currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/gdpr/consent-history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setConsents(data.consents || []);
            }
        } catch (error) {
            console.error('Error fetching consent history:', error);
        }
    };

    const handleExportData = async () => {
        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const token = await authClient.currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/gdpr/export-data`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `my_data_export_${Date.now()}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                window.URL.revokeObjectURL(url);

                setMessage({ 
                    text: 'Your data has been exported successfully!', 
                    type: 'success' 
                });
                
                fetchGDPRRequests(); // Refresh requests list
            } else {
                const error = await response.json();
                setMessage({ 
                    text: `Failed to export data: ${error.error || 'Unknown error'}`, 
                    type: 'error' 
                });
            }
        } catch (error) {
            console.error('Error exporting data:', error);
            setMessage({ 
                text: 'An error occurred while exporting your data', 
                type: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRequestDeletion = async () => {
        if (confirmEmail !== authClient.currentUser.email) {
            setMessage({ 
                text: 'Please enter your email address correctly to confirm', 
                type: 'error' 
            });
            return;
        }

        setLoading(true);
        setMessage({ text: '', type: '' });

        try {
            const token = await authClient.currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/gdpr/request-deletion`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    confirmEmail,
                    reason: deleteReason
                })
            });

            if (response.ok) {
                const data = await response.json();
                setMessage({ 
                    text: data.message || 'Deletion request submitted successfully', 
                    type: 'success' 
                });
                setShowDeleteConfirmation(false);
                setConfirmEmail('');
                setDeleteReason('');
                
                fetchGDPRRequests(); // Refresh requests list
            } else {
                const error = await response.json();
                setMessage({ 
                    text: `Failed to submit deletion request: ${error.error || 'Unknown error'}`, 
                    type: 'error' 
                });
            }
        } catch (error) {
            console.error('Error requesting deletion:', error);
            setMessage({ 
                text: 'An error occurred while submitting your deletion request', 
                type: 'error' 
            });
        } finally {
            setLoading(false);
        }
    };

    const handleManageConsent = async (consentType, granted) => {
        try {
            const token = await authClient.currentUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/api/gdpr/consent`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    consentType,
                    granted,
                    version: '1.0'
                })
            });

            if (response.ok) {
                setMessage({ 
                    text: 'Consent preference updated successfully', 
                    type: 'success' 
                });
                
                fetchConsentHistory(); // Refresh consent history
            } else {
                const error = await response.json();
                setMessage({ 
                    text: `Failed to update consent: ${error.error || 'Unknown error'}`, 
                    type: 'error' 
                });
            }
        } catch (error) {
            console.error('Error managing consent:', error);
            setMessage({ 
                text: 'An error occurred while updating your consent', 
                type: 'error' 
            });
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'N/A';
        try {
            const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
            return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
        } catch {
            return 'N/A';
        }
    };

    const getRequestStatusColor = (status) => {
        switch (status) {
            case 'completed': return 'text-green-600';
            case 'pending': return 'text-yellow-600';
            case 'initiated': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className={`space-y-6 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-900'}`}>
            {/* Header */}
            <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center space-x-3 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                        <Shield className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                        <h2 className={`text-2xl font-bold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                            GDPR & Data Privacy
                        </h2>
                        <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            Manage your data rights and privacy preferences
                        </p>
                    </div>
                </div>

                {message.text && (
                    <div className={`p-4 rounded-lg mb-4 ${
                        message.type === 'success' 
                            ? 'bg-green-100 text-green-800 border border-green-200' 
                            : 'bg-red-100 text-red-800 border border-red-200'
                    }`}>
                        <div className="flex items-center">
                            {message.type === 'success' ? (
                                <CheckCircle className="w-5 h-5 mr-2" />
                            ) : (
                                <AlertTriangle className="w-5 h-5 mr-2" />
                            )}
                            <span>{message.text}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Your Rights */}
            <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                    Your Data Rights
                </h3>
                
                <div className="space-y-4">
                    {/* Right to Access */}
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                                <Download className="w-5 h-5 mt-1 text-blue-500" />
                                <div>
                                    <h4 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                                        Right to Access
                                    </h4>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                        Download all your personal data in a machine-readable format
                                    </p>
                                </div>
                            </div>
                            <PrimaryButton
                                onClick={handleExportData}
                                disabled={loading}
                                Icon={Download}
                                className="bg-blue-600 hover:bg-blue-700"
                            >
                                {loading ? 'Exporting...' : 'Export Data'}
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* Right to Erasure */}
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                                <Trash2 className="w-5 h-5 mt-1 text-red-500" />
                                <div>
                                    <h4 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                                        Right to Erasure
                                    </h4>
                                    <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                                        Request deletion of your account and personal data
                                    </p>
                                </div>
                            </div>
                            <PrimaryButton
                                onClick={() => setShowDeleteConfirmation(true)}
                                Icon={Trash2}
                                className="bg-red-600 hover:bg-red-700"
                            >
                                Request Deletion
                            </PrimaryButton>
                        </div>
                    </div>

                    {/* Right to Object */}
                    <div className={`p-4 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}>
                        <div className="flex items-start space-x-3">
                            <Eye className="w-5 h-5 mt-1 text-purple-500" />
                            <div>
                                <h4 className={`font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                                    Right to Object
                                </h4>
                                <p className={`text-sm ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'} mb-3`}>
                                    Manage your consent for different types of data processing
                                </p>
                                
                                <div className="space-y-2">
                                    <ConsentToggle
                                        theme={theme}
                                        label="Analytics & Performance Tracking"
                                        description="Help us improve by allowing anonymous usage analytics"
                                        consentType="analytics"
                                        onToggle={handleManageConsent}
                                    />
                                    <ConsentToggle
                                        theme={theme}
                                        label="Marketing Communications"
                                        description="Receive product updates and newsletters"
                                        consentType="marketing"
                                        onToggle={handleManageConsent}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Request History */}
            {gdprRequests.length > 0 && (
                <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                    <div className="flex items-center space-x-3 mb-4">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                            Request History
                        </h3>
                    </div>
                    
                    <div className="space-y-2">
                        {gdprRequests.map((request) => (
                            <div
                                key={request.id}
                                className={`p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}`}
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                                            {request.requestType.replace('_', ' ').toUpperCase()}
                                        </span>
                                        <span className={`ml-2 text-sm ${getRequestStatusColor(request.status)}`}>
                                            • {request.status}
                                        </span>
                                    </div>
                                    <span className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {formatDate(request.timestamp)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Privacy Information */}
            <div className={`p-6 rounded-lg shadow-xl border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-center space-x-3 mb-4">
                    <FileText className="w-5 h-5 text-gray-500" />
                    <h3 className={`text-lg font-semibold ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                        Privacy Information
                    </h3>
                </div>
                
                <div className="space-y-2">
                    <a
                        href="/privacy-policy"
                        className="block text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Privacy Policy
                    </a>
                    <a
                        href="/terms-of-service"
                        className="block text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Terms of Service
                    </a>
                    <a
                        href="/cookie-policy"
                        className="block text-blue-600 hover:text-blue-700 hover:underline"
                    >
                        Cookie Policy
                    </a>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirmation && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className={`p-6 rounded-lg max-w-md w-full mx-4 ${theme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
                        <h3 className={`text-xl font-bold mb-4 text-red-600`}>
                            Confirm Account Deletion
                        </h3>
                        <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-600'}`}>
                            This action will request deletion of your account. Your data will be anonymized within 30 days.
                        </p>
                        
                        <div className="space-y-4">
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Confirm your email address
                                </label>
                                <input
                                    type="email"
                                    value={confirmEmail}
                                    onChange={(e) => setConfirmEmail(e.target.value)}
                                    placeholder={authClient.currentUser?.email}
                                    className={`w-full p-2 border rounded-lg ${
                                        theme === 'dark' 
                                            ? 'bg-gray-700 border-gray-600 text-gray-100' 
                                            : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                />
                            </div>
                            
                            <div>
                                <label className={`block text-sm font-medium mb-2 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                                    Reason for deletion (optional)
                                </label>
                                <textarea
                                    value={deleteReason}
                                    onChange={(e) => setDeleteReason(e.target.value)}
                                    placeholder="Tell us why you're leaving..."
                                    rows={3}
                                    className={`w-full p-2 border rounded-lg ${
                                        theme === 'dark' 
                                            ? 'bg-gray-700 border-gray-600 text-gray-100' 
                                            : 'bg-white border-gray-300 text-gray-900'
                                    }`}
                                />
                            </div>
                        </div>
                        
                        <div className="flex space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowDeleteConfirmation(false);
                                    setConfirmEmail('');
                                    setDeleteReason('');
                                }}
                                className={`flex-1 px-4 py-2 rounded-lg ${
                                    theme === 'dark'
                                        ? 'bg-gray-700 hover:bg-gray-600 text-gray-100'
                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                                }`}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRequestDeletion}
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50"
                            >
                                {loading ? 'Submitting...' : 'Confirm Deletion'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Consent Toggle Component
const ConsentToggle = ({ theme, label, description, consentType, onToggle }) => {
    const [enabled, setEnabled] = useState(false);

    const handleToggle = () => {
        const newValue = !enabled;
        setEnabled(newValue);
        onToggle(consentType, newValue);
    };

    return (
        <div className={`flex items-center justify-between p-3 rounded-lg ${theme === 'dark' ? 'bg-gray-600' : 'bg-white'}`}>
            <div>
                <div className={`font-medium text-sm ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>
                    {label}
                </div>
                <div className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                    {description}
                </div>
            </div>
            <button
                onClick={handleToggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    enabled ? 'bg-blue-600' : 'bg-gray-400'
                }`}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        enabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
            </button>
        </div>
    );
};

export default GDPRComplianceComponent;

