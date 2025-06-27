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

// This file contains general utility functions that can be reused across the application.
// Centralizing such functions helps in maintaining a cleaner codebase and promoting reusability.
