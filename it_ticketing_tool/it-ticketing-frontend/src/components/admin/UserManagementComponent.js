// src/components/admin/UserManagementComponent.js

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PrimaryButton from '../common/PrimaryButton';
import FormInput from '../common/FormInput';
import { Edit, Trash2, XCircle, CheckCircle, Save, UserPlus, Search } from 'lucide-react';
import { API_BASE_URL } from '../../config/constants';

const UserManagementComponent = ({ user, showFlashMessage }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editingUser, setEditingUser] = useState(null);
    const [newRole, setNewRole] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showCreateUserForm, setShowCreateUserForm] = useState(false);
    const [newUserData, setNewUserData] = useState({
        email: '',
        password: '',
        role: 'user' // Default role for new users
    });

    const validUserRoles = ['user', 'support', 'admin'];

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/admin/users`, {
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to fetch users.');
            }

            const data = await response.json();
            setUsers(data);
            console.log("FETCHED USERS (from backend - unfiltered):", data);
        } catch (err) {
            console.error('Error fetching users:', err);
            setError(err.message || 'An unexpected error occurred.');
            showFlashMessage('error', err.message || 'Failed to load users.');
        } finally {
            setLoading(false);
        }
    }, [user.firebaseUser, showFlashMessage]);

    useEffect(() => {
        if (user && user.firebaseUser) {
            fetchUsers();
        }
    }, [user, fetchUsers]);

    const filteredUsers = useMemo(() => {
        return users.filter(u =>
            u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.role && u.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
            u.uid.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);


    const handleEditClick = (userToEdit) => {
        setEditingUser(userToEdit);
        setNewRole(userToEdit.role);
    };

    const handleCancelEdit = () => {
        setEditingUser(null);
        setNewRole('');
    };

    const handleSaveRole = async () => {
        if (!editingUser) return;

        if (!validUserRoles.includes(newRole)) {
            showFlashMessage('error', 'Invalid role selected.');
            return;
        }

        if (editingUser.uid === user.uid) {
            showFlashMessage('error', 'You cannot change your own role.');
            return;
        }

        setLoading(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/admin/users/${editingUser.uid}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${idToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ role: newRole })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update user role.');
            }

            showFlashMessage('success', `Role for ${editingUser.email} updated to ${newRole}.`);
            setEditingUser(null);
            setNewRole('');
            fetchUsers();
        } catch (err) {
            console.error('Error updating user role:', err);
            setError(err.message || 'Failed to update user role.');
            showFlashMessage('error', err.message || 'Failed to update user role.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async (userToDelete) => {
        if (!window.confirm(`Are you sure you want to delete user ${userToDelete.email}? This action cannot be undone.`)) {
            return;
        }

        if (userToDelete.uid === user.uid) {
            showFlashMessage('error', 'You cannot delete your own account.');
            return;
        }

        setLoading(true);
        try {
            const idToken = await user.firebaseUser.getIdToken();
            const response = await fetch(`${API_BASE_URL}/admin/users/${userToDelete.uid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${idToken}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to delete user.');
            }

            showFlashMessage('success', `User ${userToDelete.email} deleted successfully.`);
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
            setError(err.message || 'Failed to delete user.');
            showFlashMessage('error', err.message || 'Failed to delete user.');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUserChange = (e) => {
        const { name, value } = e.target;
        setNewUserData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateUserSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        if (!newUserData.email || !newUserData.password || !newUserData.role) {
            showFlashMessage('error', 'All fields are required.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newUserData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create user.');
            }

            showFlashMessage('success', `User ${newUserData.email} created successfully!`);
            setShowCreateUserForm(false);
            setNewUserData({ email: '', password: '', role: 'user' });
            fetchUsers();
        } catch (err) {
            console.error('Error creating user:', err);
            setError(err.message || 'An unexpected error occurred.');
            showFlashMessage('error', err.message || 'Failed to create user.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 sm:p-6 lg:p-8 bg-white shadow-sm rounded-lg animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-5 border-b border-gray-200 pb-3">User Management</h2>

            {/* User Search and Create */}
            <div className="mb-5 flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0 sm:space-x-3">
                <div className="relative w-full sm:w-1/2">
                    <FormInput
                        type="text"
                        placeholder="Search by email, role, or UID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-3 py-1.5 rounded-md w-full text-sm border border-gray-300 focus:ring-blue-400 focus:border-blue-400"
                    />
                    <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                </div>
                <PrimaryButton
                    onClick={() => setShowCreateUserForm(!showCreateUserForm)}
                    className="w-full sm:w-auto flex items-center justify-center space-x-1 px-3 py-1.5 text-sm
                               bg-blue-500 hover:bg-blue-600 focus:ring-blue-500 focus:ring-offset-2 transition ease-in-out duration-150"
                >
                    <UserPlus size={16} />
                    <span>{showCreateUserForm ? 'Hide Form' : 'Add User'}</span>
                </PrimaryButton>
            </div>

            {/* Create New User Form */}
            {showCreateUserForm && (
                <div className="mb-5 p-4 border border-gray-200 rounded-md bg-gray-50 animate-slide-down">
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Add New User</h3>
                    <form onSubmit={handleCreateUserSubmit} className="space-y-3">
                        <div>
                            <label htmlFor="newUserEmail" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                id="newUserEmail"
                                type="email"
                                name="email"
                                value={newUserData.email}
                                onChange={handleCreateUserChange}
                                placeholder="user@example.com"
                                required
                                className="mt-0.5 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="newUserPassword" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                            <input
                                id="newUserPassword"
                                type="password"
                                name="password"
                                value={newUserData.password}
                                onChange={handleCreateUserChange}
                                placeholder="Choose a strong password"
                                required
                                className="mt-0.5 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                            />
                        </div>
                        <div>
                            <label htmlFor="newUserRole" className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                            <select
                                id="newUserRole"
                                name="role"
                                value={newUserData.role}
                                onChange={handleCreateUserChange}
                                className="mt-0.5 block w-full p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                            >
                                {validUserRoles
                                    .filter(role => !(user.role === 'admin' && role === 'admin'))
                                    .map(role => (
                                        <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                    ))}
                            </select>
                        </div>
                        <div className="flex justify-end space-x-2">
                            <PrimaryButton type="button" onClick={() => setShowCreateUserForm(false)}
                                className="px-3 py-1.5 text-sm bg-gray-400 hover:bg-gray-500 focus:ring-gray-400 focus:ring-offset-2 transition ease-in-out duration-150">
                                <XCircle size={16} className="inline mr-1" /> Cancel
                            </PrimaryButton>
                            <PrimaryButton type="submit" disabled={loading}
                                className="px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 focus:ring-green-500 focus:ring-offset-2 transition ease-in-out duration-150">
                                <CheckCircle size={16} className="inline mr-1" /> {loading ? 'Creating...' : 'Create User'}
                            </PrimaryButton>
                        </div>
                    </form>
                </div>
            )}

            {loading && (
                <div className="flex items-center justify-center h-32">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    <p className="ml-3 text-gray-600">Loading users...</p>
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded relative mb-5 text-sm" role="alert">
                    <strong className="font-bold">Error!</strong>
                    <span className="block sm:inline"> {error}</span>
                </div>
            )}

            {!loading && !error && filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                    <p className="text-lg">No users found.</p>
                    <p className="text-sm mt-1">Try adjusting your search or add a new user.</p>
                </div>
            )}

            {!loading && !error && filteredUsers.length > 0 && (
                <div className="overflow-x-auto bg-white rounded-md shadow-sm border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Email
                                </th>
                                <th scope="col" className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Role
                                </th>
                                <th scope="col" className="px-5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-100">
                            {filteredUsers.map((u) => (
                                <tr key={u.uid} className="hover:bg-gray-50">
                                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-800">
                                        {u.email}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-sm text-gray-800">
                                        {editingUser && editingUser.uid === u.uid ? (
                                            <select
                                                value={newRole}
                                                onChange={(e) => setNewRole(e.target.value)}
                                                className="block w-full p-1.5 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                                            >
                                                {validUserRoles.map(role => (
                                                    <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-0.5 inline-flex text-xs leading-4 font-medium rounded-full
                                                ${u.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                                  u.role === 'support' ? 'bg-blue-100 text-blue-800' :
                                                  'bg-gray-100 text-gray-800'}`}>
                                                {u.role}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-5 py-3 whitespace-nowrap text-sm font-medium">
                                        {editingUser && editingUser.uid === u.uid ? (
                                            <div className="flex space-x-1">
                                                <button onClick={handleSaveRole} className="p-1.5 text-green-600 hover:text-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-1 rounded">
                                                    <Save size={16} />
                                                </button>
                                                <button onClick={handleCancelEdit} className="p-1.5 text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1 rounded">
                                                    <XCircle size={16} />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex space-x-1">
                                                <button onClick={() => handleEditClick(u)} className="p-1.5 text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded">
                                                    <Edit size={16} />
                                                </button>
                                                {u.uid !== user.uid && (
                                                    <button onClick={() => handleDeleteUser(u)} className="p-1.5 text-red-600 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 rounded">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default UserManagementComponent;