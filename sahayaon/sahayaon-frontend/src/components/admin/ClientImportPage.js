import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomButton from '../common/CustomButton';
import { API_BASE_URL } from '../../config/constants';
import { 
    Box, 
    Typography, 
    Paper, 
    Alert, 
    CircularProgress, 
    LinearProgress,
    Card,
    CardContent,
    Grid,
    Chip,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Divider,
    Stepper,
    Step,
    StepLabel,
    StepContent
} from '@mui/material';
import { 
    Download as DownloadIcon, 
    Upload as UploadIcon, 
    ArrowBack as ArrowBackIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Description as DescriptionIcon,
    People as PeopleIcon,
    Security as SecurityIcon,
    CloudUpload as CloudUploadIcon,
    Preview as PreviewIcon,
    CheckCircleOutline as CheckCircleOutlineIcon,
    Warning as WarningIcon
} from '@mui/icons-material';

const ClientImportPage = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientName = searchParams.get('client');
    
    const [importError, setImportError] = useState('');
    const [importResults, setImportResults] = useState(null);
    const [importedUsers, setImportedUsers] = useState([]);
    const [importedPasswords, setImportedPasswords] = useState([]);
    const [credentialsDownloaded, setCredentialsDownloaded] = useState(false);
    const [importProgress, setImportProgress] = useState({ show: false, current: 0, total: 0, status: '' });
    const [uploadedRows, setUploadedRows] = useState(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    
    const fileInputRef = React.useRef();

    // Template headers for the CSV (companyName will be added dynamically)
    const USER_TEMPLATE_HEADERS = [
        'firstName',
        'lastName',
        'employeeId',
        'email',
        'designation',
        'contactNumber',
        'managerEmail',
        'employmentType'
    ];

    useEffect(() => {
        if (!clientName) {
            navigate('/user-management');
        }
    }, [clientName, navigate]);

    const handleDownloadTemplate = () => {
        // Create CSV content with headers and sample row
        const csvContent = [
            USER_TEMPLATE_HEADERS.join(','),
            // Add sample row with empty values
            USER_TEMPLATE_HEADERS.map(() => '').join(',')
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', clientName ? `${clientName}_user_template.csv` : 'user_import_template.csv');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleFileUpload = (e) => {
        setImportError('');
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const text = evt.target.result;
                const lines = text.split('\n').filter(line => line.trim());
                
                if (lines.length < 2) {
                    setImportError('File must contain at least a header row and one data row.');
                    return;
                }
                
                const headers = lines[0].split(',').map(h => h.trim());
                const expectedHeaders = [...USER_TEMPLATE_HEADERS];
                
                const missingCols = expectedHeaders.filter(h => !headers.includes(h));
                if (missingCols.length > 0) {
                    setImportError('Missing required columns: ' + missingCols.join(', ') + '. Please use the provided template.');
                    return;
                }
                
                const users = [];
                for (let i = 1; i < lines.length; i++) {
                    if (lines[i].trim()) {
                        const values = lines[i].split(',').map(v => v.trim());
                        const user = {};
                        headers.forEach((header, index) => {
                            user[header] = values[index] || '';
                        });
                        
                        if (user.email) {
                            users.push({
                                ...user,
                                companyName: clientName, // Set the client name from URL parameter
                                password: generatePassword()
                            });
                        }
                    }
                }
                
                if (users.length === 0) {
                    setImportError('No valid user data found in the file.');
                    return;
                }
                
                setImportedUsers(users);
                setImportedPasswords(users.map(u => ({ 
                    firstName: u.firstName || '',
                    lastName: u.lastName || '',
                    email: u.email || '',
                    password: u.password || '',
                    contactNumber: u.contactNumber || '',
                    employeeId: u.employeeId || ''
                })));
                
            } catch (err) {
                setImportError('Failed to parse file. Please use the provided template.');
            }
        };
        
        if (file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            setImportError('Please upload a CSV file.');
        }
    };

    const generatePassword = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 12; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    const handleConfirmImport = async () => {
        if (!importedUsers || importedUsers.length === 0) return;
        
        setImportError('');
        setImportProgress({ 
            show: true, 
            current: 0, 
            total: importedUsers.length, 
            status: 'Starting import...' 
        });
        setIsProcessing(true);
        
        try {
            // Add client name to all users
            const usersWithClient = importedUsers.map(userData => ({
                ...userData,
                companyName: clientName
            }));
            
            setImportProgress(prev => ({ ...prev, status: 'Preparing data for import...' }));
            
            for (let i = 0; i < usersWithClient.length; i++) {
                const currentUser = usersWithClient[i];
                
                setImportProgress(prev => ({ 
                    ...prev, 
                    current: i + 1, 
                    status: `Processing: ${currentUser.firstName} ${currentUser.lastName} (${currentUser.email})` 
                }));
                
                setUploadedRows(prev => new Set([...prev, i]));
                await new Promise(resolve => setTimeout(resolve, 150));
            }
            
            setImportProgress(prev => ({ ...prev, status: 'Sending data to server...' }));
            
            const res = await fetch(`${API_BASE_URL}/api/users/bulk`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    users: usersWithClient,
                    siteAdminCompany: clientName
                }),
            });
            
            setImportProgress(prev => ({ ...prev, status: 'Processing server response...' }));
            
            const data = await res.json();
            if (!res.ok) {
                setImportError(data.error || 'Bulk import failed.');
                setImportResults(null);
                setImportProgress({ show: false, current: 0, total: 0, status: '' });
            } else {
                setImportProgress(prev => ({ 
                    ...prev, 
                    current: importedUsers.length, 
                    status: 'Import completed successfully!' 
                }));
                
                setTimeout(() => {
                    setImportProgress({ show: false, current: 0, total: 0, status: '' });
                    setImportResults(data.results);
                    setImportedPasswords(importedPasswords.filter(pw => data.results.some(r => r.email === pw.email && r.success)));
                    setImportedUsers([]);
                }, 1000);
            }
        } catch (err) {
            setImportError('Bulk import failed.');
            setImportResults(null);
            setImportProgress({ show: false, current: 0, total: 0, status: '' });
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDownloadCredentials = () => {
        if (!importedPasswords.length) return;
        
        const csvContent = [
            'First Name,Last Name,Email,Password,Contact Number,Employee ID',
            ...importedPasswords.map(pw => [
                pw.firstName,
                pw.lastName,
                pw.email,
                pw.password,
                pw.contactNumber,
                pw.employeeId || ''
            ].join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${clientName}_user_credentials_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        setCredentialsDownloaded(true);
    };

    if (!clientName) {
        return null;
    }

    return (
        <Box sx={{ minHeight: '100vh', backgroundColor: '#f5f5f5', py: 2 }}>
            <Box sx={{ maxWidth: '1200px', mx: 'auto', px: 2 }}>
                {/* Header */}
                <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                    <CustomButton
                        variant="outline"
                        size="sm"
                        startIcon={<ArrowBackIcon />}
                        onClick={() => navigate('/user-management')}
                        sx={{ fontSize: '0.8rem', py: 0.5, px: 1.5 }}
                    >
                        Back
                    </CustomButton>
                    <Typography variant="h6" sx={{ fontWeight: 600, color: '#333', fontSize: '1.1rem' }}>
                        Import Users for {clientName}
                    </Typography>
                </Box>

                {/* Main Content */}
                <Paper elevation={1} sx={{ p: 3 }}>
                    {!importResults && !importedUsers.length && (
                        <Box sx={{ 
                            display: 'flex', 
                            justifyContent: 'center',
                            width: '100%',
                            pt: 2
                        }}>
                            <Box sx={{ 
                                display: 'flex', 
                                gap: 2, 
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'stretch',
                                width: '100%'
                            }}>
                                {/* Download Template */}
                                <Box sx={{ 
                                    border: '1px solid #ddd', 
                                    borderRadius: 1, 
                                    p: 2, 
                                    flex: '1 1 45%',
                                    minWidth: '280px',
                                    minHeight: '200px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>
                                            Download Template
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#666', mb: 2, fontSize: '0.8rem' }}>
                                            Download CSV template (company name will be added automatically)
                                        </Typography>
                                    </Box>
                                    <CustomButton
                                        variant="outline"
                                        size="sm"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleDownloadTemplate}
                                        sx={{ fontSize: '0.8rem', alignSelf: 'flex-start' }}
                                    >
                                        Download Template
                                    </CustomButton>
                                </Box>

                                {/* Upload File */}
                                <Box sx={{ 
                                    border: '1px solid #ddd', 
                                    borderRadius: 1, 
                                    p: 2, 
                                    flex: '1 1 45%',
                                    minWidth: '280px',
                                    minHeight: '200px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between'
                                }}>
                                    <Box>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>
                                            Upload CSV File
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#666', mb: 2, fontSize: '0.8rem' }}>
                                            Upload your filled CSV file
                                        </Typography>
                                    </Box>
                                    
                                    <Box
                                        sx={{
                                            border: '2px dashed #ccc',
                                            borderRadius: 1,
                                            p: 2,
                                            textAlign: 'center',
                                            cursor: 'pointer',
                                            '&:hover': { borderColor: '#999' }
                                        }}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <UploadIcon sx={{ color: '#999', fontSize: 24, mb: 1 }} />
                                        <Typography variant="body2" sx={{ color: '#666', mb: 1, fontSize: '0.8rem' }}>
                                            Click to upload CSV
                                        </Typography>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".csv"
                                            onChange={handleFileUpload}
                                            style={{ display: 'none' }}
                                        />
                                        <CustomButton
                                            variant="outline"
                                            size="sm"
                                            sx={{ fontSize: '0.8rem' }}
                                        >
                                            Choose File
                                        </CustomButton>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Data Preview */}
                    {importedUsers.length > 0 && !importResults && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, fontSize: '0.9rem' }}>
                                Preview ({importedUsers.length} users)
                            </Typography>
                            
                            <TableContainer sx={{ border: '1px solid #ddd', borderRadius: 1, mb: 2 }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', py: 1 }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', py: 1 }}>Email</TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', py: 1 }}>Employee ID</TableCell>
                                            <TableCell sx={{ fontWeight: 600, fontSize: '0.8rem', py: 1 }}>Contact</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {importedUsers.map((user, index) => (
                                            <TableRow key={index}>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>
                                                    {user.firstName} {user.lastName}
                                                </TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>{user.email}</TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>{user.employeeId || 'N/A'}</TableCell>
                                                <TableCell sx={{ fontSize: '0.8rem', py: 1 }}>{user.contactNumber || 'N/A'}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                                <CustomButton
                                    variant="primary"
                                    size="sm"
                                    onClick={handleConfirmImport}
                                    disabled={isProcessing}
                                    startIcon={isProcessing ? <CircularProgress size={16} /> : null}
                                    sx={{ fontSize: '0.8rem' }}
                                >
                                    {isProcessing ? 'Processing...' : `Import ${importedUsers.length} Users`}
                                </CustomButton>
                                
                                <CustomButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                        setImportedUsers([]);
                                        setImportError('');
                                        if (fileInputRef.current) fileInputRef.current.value = '';
                                    }}
                                    sx={{ fontSize: '0.8rem' }}
                                >
                                    Cancel
                                </CustomButton>
                            </Box>
                        </Box>
                    )}

                    {/* Import Progress */}
                    {importProgress.show && (
                        <Box sx={{ mt: 3, p: 2, border: '1px solid #ddd', borderRadius: 1 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, fontSize: '0.9rem' }}>
                                Importing Users...
                            </Typography>
                            <LinearProgress 
                                variant="determinate" 
                                value={(importProgress.current / importProgress.total) * 100}
                                sx={{ mb: 1 }}
                            />
                            <Typography variant="body2" sx={{ color: '#666', fontSize: '0.8rem' }}>
                                {importProgress.status}
                            </Typography>
                            {importError && (
                                <Typography variant="body2" sx={{ color: 'red', fontSize: '0.8rem', mt: 1, fontWeight: 600 }}>
                                    Error: {importError}
                                </Typography>
                            )}
                        </Box>
                    )}

                    {/* Import Results */}
                    {importResults && (
                        <Box sx={{ mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                {importResults.filter(r => r.success).length > 0 ? (
                                    <CheckCircleIcon sx={{ color: 'green', mr: 1, fontSize: 20 }} />
                                ) : (
                                    <ErrorIcon sx={{ color: 'red', mr: 1, fontSize: 20 }} />
                                )}
                                <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                    {importResults.filter(r => r.success).length > 0 ? 'Import Completed' : 'Import Failed'}
                                </Typography>
                            </Box>
                            
                            {/* Results Summary */}
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 3, flexWrap: 'wrap' }}>
                                <Box sx={{ 
                                    textAlign: 'center', 
                                    p: 2, 
                                    backgroundColor: '#e8f5e8', 
                                    borderRadius: 2,
                                    border: '1px solid #c8e6c9',
                                    minWidth: '120px'
                                }}>
                                    <Typography variant="h4" sx={{ color: 'green', fontWeight: 700, mb: 0.5 }}>
                                        {importResults.filter(r => r.success).length}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#2e7d32' }}>
                                        Success
                                    </Typography>
                                </Box>
                                
                                <Box sx={{ 
                                    textAlign: 'center', 
                                    p: 2, 
                                    backgroundColor: '#ffeaea', 
                                    borderRadius: 2,
                                    border: '1px solid #ffcdd2',
                                    minWidth: '120px'
                                }}>
                                    <Typography variant="h4" sx={{ color: 'red', fontWeight: 700, mb: 0.5 }}>
                                        {importResults.filter(r => !r.success).length}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#d32f2f' }}>
                                        Failed
                                    </Typography>
                                </Box>
                                
                                <Box sx={{ 
                                    textAlign: 'center', 
                                    p: 2, 
                                    backgroundColor: '#f5f5f5', 
                                    borderRadius: 2,
                                    border: '1px solid #e0e0e0',
                                    minWidth: '120px'
                                }}>
                                    <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5, color: '#424242' }}>
                                        {importResults.length}
                                    </Typography>
                                    <Typography variant="body2" sx={{ fontSize: '0.9rem', fontWeight: 600, color: '#666' }}>
                                        Total
                                    </Typography>
                                </Box>
                            </Box>

                            {/* Failed Import Details */}
                            {importResults.filter(r => !r.success).length > 0 && (
                                <Box sx={{ mb: 3 }}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        mb: 2,
                                        p: 2,
                                        backgroundColor: '#ffebee',
                                        borderRadius: 2,
                                        border: '1px solid #ffcdd2'
                                    }}>
                                        <ErrorIcon sx={{ color: '#d32f2f', mr: 1, fontSize: 20 }} />
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, fontSize: '1rem', color: '#d32f2f' }}>
                                            Failed Import Details ({importResults.filter(r => !r.success).length} errors)
                                        </Typography>
                                    </Box>
                                    
                                    <Box sx={{ 
                                        border: '1px solid #ffcdd2', 
                                        borderRadius: 2, 
                                        p: 2, 
                                        backgroundColor: '#fff',
                                        maxHeight: '300px',
                                        overflowY: 'auto'
                                    }}>
                                        {importResults.filter(r => !r.success).map((result, index) => (
                                            <Box key={index} sx={{ 
                                                mb: 2, 
                                                p: 2, 
                                                border: '1px solid #ffebee',
                                                borderRadius: 1,
                                                backgroundColor: '#fafafa'
                                            }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <Typography variant="body1" sx={{ fontWeight: 600, color: '#d32f2f', fontSize: '0.9rem' }}>
                                                        {result.email || 'Unknown user'}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body2" sx={{ color: '#666', fontSize: '0.8rem', lineHeight: 1.4 }}>
                                                    <strong>Error:</strong> {result.error || 'Unknown error occurred'}
                                                </Typography>
                                            </Box>
                                        ))}
                                    </Box>
                                </Box>
                            )}

                            {credentialsDownloaded && (
                                <Alert severity="success" sx={{ mb: 2, fontSize: '0.8rem' }}>
                                    <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                        Credentials downloaded successfully!
                                    </Typography>
                                </Alert>
                            )}

                            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                                {importedPasswords.length > 0 && !credentialsDownloaded && (
                                    <CustomButton
                                        variant="primary"
                                        size="sm"
                                        startIcon={<DownloadIcon />}
                                        onClick={handleDownloadCredentials}
                                        sx={{ fontSize: '0.8rem' }}
                                    >
                                        Download Credentials
                                    </CustomButton>
                                )}
                                
                                <CustomButton
                                    variant="outline"
                                    size="sm"
                                    onClick={() => navigate('/user-management')}
                                    sx={{ fontSize: '0.8rem' }}
                                >
                                    Back to User Management
                                </CustomButton>
                            </Box>
                        </Box>
                    )}

                    {/* Error Display */}
                    {importError && (
                        <Alert severity="error" sx={{ mt: 2, fontSize: '0.8rem' }}>
                            <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                {importError}
                            </Typography>
                        </Alert>
                    )}
                </Paper>
            </Box>
        </Box>
    );
};

export default ClientImportPage;
