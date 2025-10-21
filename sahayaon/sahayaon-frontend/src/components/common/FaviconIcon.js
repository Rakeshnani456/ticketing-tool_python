import React, { useState, useEffect } from 'react';
import { getFaviconUrl, checkFaviconExists, getFallbackFaviconUrl } from '../../utils/faviconUtils';

/**
 * FaviconIcon component that displays a website's favicon with fallback handling
 * @param {Object} props
 * @param {string} props.websiteUrl - The website URL to get favicon for
 * @param {string} props.size - Size of the favicon (default: '16px')
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.alt - Alt text for the image
 * @param {Function} props.onError - Callback when favicon fails to load
 * @param {Function} props.onLoad - Callback when favicon loads successfully
 */
const FaviconIcon = ({ 
  websiteUrl, 
  size = '16px', 
  className = '', 
  alt = 'Website favicon',
  onError,
  onLoad 
}) => {
  const [faviconUrl, setFaviconUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(null);

  useEffect(() => {
    const loadFavicon = async () => {
      if (!websiteUrl) {
        setIsLoading(false);
        setHasError(true);
        return;
      }

      setIsLoading(true);
      setHasError(false);

      try {
        // Get the primary favicon URL
        const primaryUrl = getFaviconUrl(websiteUrl);
        setCurrentUrl(primaryUrl);
        setFaviconUrl(primaryUrl);

        if (primaryUrl) {
          // Check if the favicon exists
          const exists = await checkFaviconExists(primaryUrl);
          if (exists) {
            setHasError(false);
            setIsLoading(false);
            onLoad && onLoad(primaryUrl);
          } else {
            // Try fallback URL
            const fallbackUrl = getFallbackFaviconUrl(websiteUrl);
            if (fallbackUrl && fallbackUrl !== primaryUrl) {
              setFaviconUrl(fallbackUrl);
              setCurrentUrl(fallbackUrl);
              const fallbackExists = await checkFaviconExists(fallbackUrl);
              if (fallbackExists) {
                setHasError(false);
                setIsLoading(false);
                onLoad && onLoad(fallbackUrl);
              } else {
                setHasError(true);
                setIsLoading(false);
                onError && onError();
              }
            } else {
              setHasError(true);
              setIsLoading(false);
              onError && onError();
            }
          }
        } else {
          setHasError(true);
          setIsLoading(false);
          onError && onError();
        }
      } catch (error) {
        console.warn('Error loading favicon:', error);
        setHasError(true);
        setIsLoading(false);
        onError && onError();
      }
    };

    loadFavicon();
  }, [websiteUrl, onError, onLoad]);

  const handleImageError = () => {
    if (currentUrl === faviconUrl) {
      // Try fallback if we haven't already
      const fallbackUrl = getFallbackFaviconUrl(websiteUrl);
      if (fallbackUrl && fallbackUrl !== faviconUrl) {
        setFaviconUrl(fallbackUrl);
        setCurrentUrl(fallbackUrl);
      } else {
        setHasError(true);
        setIsLoading(false);
        onError && onError();
      }
    } else {
      setHasError(true);
      setIsLoading(false);
      onError && onError();
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
    onLoad && onLoad(faviconUrl);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div 
        className={`favicon-loading ${className}`}
        style={{ 
          width: size, 
          height: size, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center'
        }}
      >
        <div 
          style={{
            width: '8px',
            height: '8px',
            border: '1px solid #d1d5db',
            borderTop: '1px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      </div>
    );
  }

  // Show error state (fallback icon)
  if (hasError || !faviconUrl) {
    return (
      <div 
        className={`favicon-fallback ${className}`}
        style={{ 
          width: size, 
          height: size, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#6b7280'
        }}
        title={websiteUrl ? `Website: ${websiteUrl}` : 'No website'}
      >
        <svg 
          width={parseInt(size) * 0.6} 
          height={parseInt(size) * 0.6} 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2"
        >
          <path d="M3 21h18"/>
          <path d="M5 21V7l8-4v18"/>
          <path d="M19 21V11l-6-4"/>
        </svg>
      </div>
    );
  }

  // Show favicon
  return (
    <img
      src={faviconUrl}
      alt={alt}
      className={`favicon-icon ${className}`}
      style={{
        width: size,
        height: size,
        objectFit: 'contain'
      }}
      onError={handleImageError}
      onLoad={handleImageLoad}
      title={websiteUrl ? `Website: ${websiteUrl}` : 'Website favicon'}
    />
  );
};

export default FaviconIcon;
