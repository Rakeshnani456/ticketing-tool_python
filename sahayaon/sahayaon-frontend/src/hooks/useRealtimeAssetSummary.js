// hooks/useRealtimeAssetSummary.js
import { useState, useEffect, useMemo, useRef } from 'react';
import SmartCacheManager from '../utils/smartCacheManager';

/**
 * Custom hook for asset summary calculation with caching
 * Calculates summary from assets array (no additional reads)
 * Features:
 * - Calculates summary from existing assets data
 * - Caching for summary calculations
 * - No additional Firebase reads
 */
const useRealtimeAssetSummary = (assets, currentUser) => {
    const [summary, setSummary] = useState(null);
    const summaryCacheRef = useRef(null);
    const lastAssetsHashRef = useRef('');
    
    const CACHE_KEY = 'asset_summary';
    const CACHE_TYPE = 'ANALYTICS';
    const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

    // Calculate hash of assets array to detect changes
    const calculateAssetsHash = (assetsArray) => {
        if (!assetsArray || assetsArray.length === 0) return '';
        // Simple hash based on length and IDs
        const ids = assetsArray.map(a => a.id || a.asset_id).sort().join(',');
        return `${assetsArray.length}_${ids.substring(0, 100)}`;
    };

    useEffect(() => {
        if (!assets || assets.length === 0) {
            setSummary({
                total_assets: 0,
                hardware_count: 0,
                software_count: 0,
                active_assets: 0,
                retired_assets: 0,
                under_repair: 0,
                warranty_expiring_soon: 0,
                subscription_renewals_due: 0,
                high_risk_assets: 0,
            });
            return;
        }

        const assetsHash = calculateAssetsHash(assets);
        
        // Check if assets changed
        if (assetsHash === lastAssetsHashRef.current && summaryCacheRef.current) {
            // Use cached summary if assets haven't changed
            setSummary(summaryCacheRef.current);
            return;
        }

        // Check cache first
        const cached = SmartCacheManager.getCachedData(CACHE_KEY, CACHE_TYPE, currentUser?.uid);
        if (cached && cached.data && assetsHash === lastAssetsHashRef.current) {
            setSummary(cached.data);
            summaryCacheRef.current = cached.data;
            return;
        }

        // Calculate summary from assets (no additional reads)
        const now = new Date();
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const calculatedSummary = {
            total_assets: assets.length,
            hardware_count: assets.filter(a => a.asset_type === 'hardware').length,
            software_count: assets.filter(a => a.asset_type === 'software').length,
            active_assets: assets.filter(a => a.status === 'Active').length,
            retired_assets: assets.filter(a => a.status === 'Retired').length,
            under_repair: assets.filter(a => a.status === 'Under Repair').length,
            warranty_expiring_soon: assets.filter(a => {
                if (!a.warranty_end) return false;
                const endDate = new Date(a.warranty_end);
                return endDate <= thirtyDaysFromNow && endDate >= now;
            }).length,
            subscription_renewals_due: assets.filter(a => {
                if (!a.subscription_end || a.asset_type !== 'software') return false;
                const endDate = new Date(a.subscription_end);
                return endDate <= thirtyDaysFromNow && endDate >= now;
            }).length,
            high_risk_assets: assets.filter(a => a.risk_level === 'High' || a.flagged === true).length,
        };

        // Cache the summary
        SmartCacheManager.setCachedData(CACHE_KEY, calculatedSummary, CACHE_TYPE, currentUser?.uid);
        summaryCacheRef.current = calculatedSummary;
        lastAssetsHashRef.current = assetsHash;
        setSummary(calculatedSummary);
    }, [assets, currentUser?.uid]);

    return summary;
};

export default useRealtimeAssetSummary;


