// src/components/SettingsComponent.js
import React from 'react';
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme hook
import PrimaryButton from './common/PrimaryButton';
import { Palette } from 'lucide-react'; // Icon for theme

/**
 * SettingsComponent provides options for user settings, including theme selection.
 */
const SettingsComponent = () => {
    const { theme, toggleTheme } = useTheme(); // Use the theme context

    return (
        <div className={`p-4 flex-1 overflow-auto ${theme === 'dark' ? 'bg-gray-900 text-gray-100' : 'bg-gray-100 text-gray-900'}`}>
            <h2 className={`text-xl font-extrabold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Settings</h2>

            <div className={`p-6 rounded-lg shadow-xl w-full max-w-xl mx-auto border ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-100' : 'text-gray-800'}`}>Theme Settings</h3>
                <p className={`mb-4 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
                    Choose your preferred application theme.
                </p>
                <PrimaryButton
                    onClick={toggleTheme}
                    Icon={Palette}
                    className={`${theme === 'dark' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-300' : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-300'}`}
                >
                    Switch to {theme === 'light' ? 'Dark Theme' : 'Light Theme'}
                </PrimaryButton>
            </div>
        </div>
    );
};

export default SettingsComponent;

