import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import CustomButton from '../common/CustomButton';
import { API_BASE_URL } from '../../config/constants';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
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
    
    // Friendly display names for Excel template headers
    const USER_TEMPLATE_DISPLAY_NAMES = [
        'First Name',
        'Last Name',
        'Employee ID',
        'Email',
        'Designation',
        'Contact Number',
        'Manager Email',
        'Employment Type'
    ];
    
    // Map display names back to field names for processing
    const HEADER_NAME_MAP = {
        'First Name': 'firstName',
        'Last Name': 'lastName',
        'Employee ID': 'employeeId',
        'Email': 'email',
        'Designation': 'designation',
        'Contact Number': 'contactNumber',
        'Manager Email': 'managerEmail',
        'Employment Type': 'employmentType'
    };

    useEffect(() => {
        if (!clientName) {
            navigate('/user-management');
        }
    }, [clientName, navigate]);

    const handleDownloadTemplate = async () => {
        // Employment type options for dropdown
        const employmentTypeOptions = ['Full-time', 'Part-time', 'Contract', 'Intern', 'Other'];
        
        // Create ExcelJS workbook
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Users');
        
        // Add header row with friendly display names
        worksheet.addRow(USER_TEMPLATE_DISPLAY_NAMES);
        
        // Add empty sample row
        worksheet.addRow(USER_TEMPLATE_HEADERS.map(() => ''));
        
        // Set column widths
        USER_TEMPLATE_DISPLAY_NAMES.forEach((header, index) => {
            worksheet.getColumn(index + 1).width = 20;
        });
        
        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };
        
        // Find employmentType column index (1-based for ExcelJS)
        // Use display names since that's what we're showing in the template
        const employmentTypeIndex = USER_TEMPLATE_DISPLAY_NAMES.indexOf('Employment Type') + 1;
        
        // Add data validation dropdown to employmentType column
        if (employmentTypeIndex > 0) {
            // Create the list formula string - must be in format: "Option1,Option2,Option3"
            // The double quotes are important for Excel to recognize it as a list
            const listFormula = `"${employmentTypeOptions.join(',')}"`;
            
            // Apply data validation to cells in the employmentType column (rows 2 to 500)
            // ExcelJS applies validation to individual cells
            for (let row = 2; row <= 500; row++) {
                const cell = worksheet.getCell(row, employmentTypeIndex);
                
                // Set data validation with dropdown list
                cell.dataValidation = {
                    type: 'list',
                    allowBlank: true, // Allow blank for flexibility
                    formulae: [listFormula],
                    showInputMessage: true,
                    promptTitle: 'Employment Type',
                    prompt: 'Please select an employment type from the dropdown',
                    showErrorMessage: true,
                    errorStyle: 'error',
                    errorTitle: 'Invalid Value',
                    error: 'Please select a value from the dropdown list: ' + employmentTypeOptions.join(', ')
                };
            }
        }
        
        // Generate buffer and download
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = clientName ? `${clientName}_user_template.xlsx` : 'user_import_template.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    };

    const handleFileUpload = (e) => {
        setImportError('');
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                let users = [];
                
                // Check if file is XLSX or CSV
                if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
                    // Process XLSX file
                    const data = new Uint8Array(evt.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Convert to JSON - Excel will have friendly header names
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        defval: '',
                        raw: false
                    });
                    
                    // Map friendly header names back to field names and filter out empty rows
                    users = jsonData
                        .filter(row => {
                            // Check if email exists (using either friendly name or field name)
                            const email = row['Email'] || row['email'] || row.email;
                            return email && email.trim() !== '' && email.toLowerCase() !== 'email';
                        })
                        .map(row => {
                            // Map friendly names to field names
                            const mappedRow = {};
                            Object.keys(HEADER_NAME_MAP).forEach(displayName => {
                                const fieldName = HEADER_NAME_MAP[displayName];
                                const value = row[displayName] || row[fieldName] || '';
                                mappedRow[fieldName] = typeof value === 'string' ? value.trim() : value;
                            });
                            return {
                                ...mappedRow,
                                companyName: clientName, // Set the client name from URL parameter
                                password: generatePassword()
                            };
                        });
                } else if (file.name.toLowerCase().endsWith('.csv')) {
                    // Process CSV file (backward compatibility)
                    const text = evt.target.result;
                    const lines = text.split('\n').filter(line => line.trim());
                    
                    if (lines.length < 2) {
                        setImportError('File must contain at least a header row and one data row.');
                        return;
                    }
                    
                    const headers = lines[0].split(',').map(h => h.trim());
                    const expectedHeaders = [...USER_TEMPLATE_HEADERS];
                    const expectedDisplayNames = [...USER_TEMPLATE_DISPLAY_NAMES];
                    
                    // Check if headers match either field names or display names
                    const allExpectedHeaders = [...expectedHeaders, ...expectedDisplayNames];
                    const missingCols = expectedDisplayNames.filter(h => !headers.includes(h) && !headers.includes(HEADER_NAME_MAP[h]));
                    if (missingCols.length > 0) {
                        setImportError('Missing required columns: ' + missingCols.join(', ') + '. Please use the provided template.');
                        return;
                    }
                    
                    for (let i = 1; i < lines.length; i++) {
                        if (lines[i].trim()) {
                            const values = lines[i].split(',').map(v => v.trim());
                            const user = {};
                            headers.forEach((header, index) => {
                                user[header] = values[index] || '';
                            });
                            
                            // Map friendly names to field names
                            const mappedUser = {};
                            Object.keys(HEADER_NAME_MAP).forEach(displayName => {
                                const fieldName = HEADER_NAME_MAP[displayName];
                                mappedUser[fieldName] = user[displayName] || user[fieldName] || '';
                            });
                            
                            const email = mappedUser.email || user.email || user['Email'];
                            if (email && email.trim() !== '') {
                                users.push({
                                    ...mappedUser,
                                    email: email.trim(),
                                    companyName: clientName, // Set the client name from URL parameter
                                    password: generatePassword()
                                });
                            }
                        }
                    }
                } else {
                    setImportError('Please upload an XLSX or CSV file.');
                    return;
                }
                
                if (users.length === 0) {
                    setImportError('No valid user data found in the file. Please ensure the file contains at least one row with an email address.');
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
                console.error('Error parsing file:', err);
                setImportError('Failed to parse file. Please ensure you are using the provided template format.');
            }
        };
        
        if (file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls')) {
            reader.readAsArrayBuffer(file);
        } else if (file.name.toLowerCase().endsWith('.csv')) {
            reader.readAsText(file);
        } else {
            setImportError('Please upload an XLSX or CSV file.');
        }
    };

    const generatePassword = () => {
        // 8 characters: 4 from "Sahayaon" letters + 4 random characters (numbers or alphabets)
        const sahayaonLetters = ['S', 'a', 'h', 'y', 'o', 'n'];
        const randomChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        
        // Pick 4 random letters from "Sahayaon"
        const selectedLetters = [];
        for (let i = 0; i < 4; i++) {
            const randomIndex = Math.floor(Math.random() * sahayaonLetters.length);
            selectedLetters.push(sahayaonLetters[randomIndex]);
        }
        
        // Add 4 random characters (numbers or alphabets)
        for (let i = 0; i < 4; i++) {
            selectedLetters.push(randomChars.charAt(Math.floor(Math.random() * randomChars.length)));
        }
        
        // Shuffle the array to mix letters and random chars
        for (let i = selectedLetters.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [selectedLetters[i], selectedLetters[j]] = [selectedLetters[j], selectedLetters[i]];
        }
        
        return selectedLetters.join('');
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
                                            Download XLSX template (company name will be added automatically)
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
                                            Upload XLSX File
                                        </Typography>
                                        <Typography variant="body2" sx={{ color: '#666', mb: 2, fontSize: '0.8rem' }}>
                                            Upload your filled XLSX or CSV file
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
                                            Click to upload XLSX/CSV
                                        </Typography>
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".xlsx,.xls,.csv"
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
