// src/utils/utils.js

/**
 * Extracts the file name from a given URL.
 * Handles cases where the URL might be malformed or not a typical file URL.
 * @param {string} url - The URL from which to extract the file name.
 * @returns {string} The extracted file name or the original URL if extraction fails.
 */
export function getFileNameFromUrl(url) {
    try {
        // Create a URL object to easily parse the pathname
        const pathname = new URL(url).pathname;
        // Split the pathname by '/' and return the last segment
        // This handles cases like "/path/to/file.ext" -> "file.ext"
        return pathname.split('/').pop() || url; // Fallback to original URL if pop() returns empty
    } catch {
        // If URL parsing fails (e.g., not a valid URL format),
        // fallback to a simpler string manipulation
        const lastSlash = url.lastIndexOf('/');
        if (lastSlash !== -1) {
            // Return substring after the last slash
            return url.substring(lastSlash + 1);
        }
        return url; // If no slash, return the whole string
    }
}

/**
 * Gets the access token from the user object for API authentication.
 * Works with both Firebase and Supabase authentication.
 * @param {object} user - The user object containing authentication information.
 * @returns {Promise<string>} The access token for API authentication.
 * @throws {Error} If no access token is available.
 */
export async function getAccessToken(user) {
    if (!user) {
        throw new Error('User not authenticated');
    }

    // For Supabase authentication
    if (user.session?.access_token) {
        return user.session.access_token;
    }

    // For Firebase authentication (fallback)
    if (user.firebaseUser?.getIdToken) {
        return await user.firebaseUser.getIdToken();
    }

    throw new Error('No access token available. Please log in again.');
}

// This file contains general utility functions that can be reused across the application.
// Centralizing such functions helps in maintaining a cleaner codebase and promoting reusability.
