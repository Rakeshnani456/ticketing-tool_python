/**
 * Utility functions for fetching and managing website favicons
 */

/**
 * Get favicon URL for a given website URL
 * @param {string} websiteUrl - The website URL
 * @returns {string} - The favicon URL
 */
export const getFaviconUrl = (websiteUrl) => {
  if (!websiteUrl) return null;
  
  try {
    // Ensure the URL has a protocol
    let url = websiteUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    const domain = new URL(url).hostname;
    
    // Try multiple favicon sources in order of preference
    const faviconSources = [
      `https://www.google.com/s2/favicons?domain=${domain}&sz=32`,
      `https://favicons.githubusercontent.com/${domain}`,
      `https://${domain}/favicon.ico`,
      `https://${domain}/favicon.png`,
      `https://${domain}/apple-touch-icon.png`
    ];
    
    return faviconSources[0]; // Return the most reliable source (Google's favicon service)
  } catch (error) {
    console.warn('Error parsing website URL for favicon:', error);
    return null;
  }
};

/**
 * Preload favicon image to check if it exists
 * @param {string} faviconUrl - The favicon URL to check
 * @returns {Promise<boolean>} - Whether the favicon exists and loads successfully
 */
export const checkFaviconExists = (faviconUrl) => {
  return new Promise((resolve) => {
    if (!faviconUrl) {
      resolve(false);
      return;
    }
    
    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = faviconUrl;
    
    // Timeout after 5 seconds
    setTimeout(() => resolve(false), 5000);
  });
};

/**
 * Get fallback favicon URL for a domain
 * @param {string} websiteUrl - The website URL
 * @returns {string} - Fallback favicon URL
 */
export const getFallbackFaviconUrl = (websiteUrl) => {
  if (!websiteUrl) return null;
  
  try {
    let url = websiteUrl;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    
    const domain = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch (error) {
    return null;
  }
};
