// Cache Management Component - For debugging and manual cache control
import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Box,
  Chip,
  Alert,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
  Info as InfoIcon,
  Storage as StorageIcon
} from '@mui/icons-material';
import SmartCacheManager from '../../utils/smartCacheManager';

const CacheManagementComponent = ({ user, showFlashMessage }) => {
  const [cacheStats, setCacheStats] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadCacheStats = () => {
    const stats = SmartCacheManager.getCacheStats();
    setCacheStats(stats);
  };

  useEffect(() => {
    loadCacheStats();
  }, []);

  const handleClearAllCaches = () => {
    SmartCacheManager.clearAllCaches();
    loadCacheStats();
    showFlashMessage('All caches cleared successfully', 'success');
  };

  const handleClearUserCaches = () => {
    if (user?.uid) {
      SmartCacheManager.invalidateUserCaches(user.uid);
      loadCacheStats();
      showFlashMessage('User caches cleared successfully', 'success');
    }
  };

  const handleRefreshStats = () => {
    setIsRefreshing(true);
    loadCacheStats();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const formatAge = (ageInSeconds) => {
    if (ageInSeconds < 60) return `${ageInSeconds}s`;
    if (ageInSeconds < 3600) return `${Math.round(ageInSeconds / 60)}m`;
    return `${Math.round(ageInSeconds / 3600)}h`;
  };

  const getAgeColor = (ageInSeconds) => {
    if (ageInSeconds < 300) return 'success'; // < 5 minutes
    if (ageInSeconds < 900) return 'warning'; // < 15 minutes
    return 'error'; // > 15 minutes
  };

  return (
    <Card sx={{ maxWidth: 600, margin: 'auto' }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <StorageIcon />
            <Typography variant="h6">Cache Management</Typography>
          </Box>
        }
        action={
          <Tooltip title="Refresh Stats">
            <IconButton onClick={handleRefreshStats} disabled={isRefreshing}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        }
      />
      <CardContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            Smart caching reduces API calls and improves performance. 
            Caches are automatically managed but can be manually cleared if needed.
          </Typography>
        </Alert>

        {cacheStats && (
          <Box>
            <Typography variant="h6" gutterBottom>
              Cache Statistics
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Total cached items: {cacheStats.totalCaches}
            </Typography>

            {cacheStats.caches.length > 0 && (
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Active Caches:
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1} sx={{ mb: 2 }}>
                  {cacheStats.caches.map((cache, index) => (
                    <Chip
                      key={index}
                      label={`${cache.key.split('_')[0]} (${formatAge(cache.age)})`}
                      color={getAgeColor(cache.age)}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            <Box display="flex" gap={2} flexWrap="wrap">
              <Button
                variant="outlined"
                color="primary"
                startIcon={<RefreshIcon />}
                onClick={handleRefreshStats}
                disabled={isRefreshing}
              >
                Refresh Stats
              </Button>
              
              {user?.uid && (
                <Button
                  variant="outlined"
                  color="warning"
                  startIcon={<DeleteIcon />}
                  onClick={handleClearUserCaches}
                >
                  Clear My Caches
                </Button>
              )}
              
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleClearAllCaches}
              >
                Clear All Caches
              </Button>
            </Box>

            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> Clearing caches will force fresh data fetching on next page load, 
                which may temporarily increase API calls.
              </Typography>
            </Alert>
          </Box>
        )}

        {!cacheStats && (
          <Typography color="text.secondary">
            No cache data available. Caches will be created as you use the application.
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default CacheManagementComponent;







