# Hide Owner Column in Retired Hardware Tab

## Overview
Updated the retired hardware tab to hide the owner column, as retired hardware is typically unassigned and historical owner information is not relevant for this view.

## Date
November 20, 2025

## Changes Made

### 1. AssetTable Component Enhancement
**File:** `sahayaon-frontend/src/components/assets/AssetTable.js`

Added a new prop `hideOwnerColumn` to control the visibility of the owner column:

#### Changes:
- **Added prop:** `hideOwnerColumn = false` (defaults to false for backward compatibility)
- **Updated search placeholder:** Conditionally excludes "owner" from search description when owner column is hidden
- **Updated search filter logic:** Excludes `owner_name` from search fields when `hideOwnerColumn` is true
- **Updated table header:** Conditionally renders owner column header only when `hideOwnerColumn` is false
- **Updated table body:** Conditionally renders owner data cells only when `hideOwnerColumn` is false
- **Updated useMemo dependencies:** Added `hideOwnerColumn` and `hideClientColumn` to dependency array

### 2. SiteAdminAssetManagement Component Update
**File:** `sahayaon-frontend/src/components/assets/SiteAdminAssetManagement.js`

Updated the retired hardware tab to pass `hideOwnerColumn={true}`:

```javascript
{hardwareSubTab === 'retired' && (
    <AssetTable
        assets={getRetiredHardware()}
        onAssetClick={handleAssetClick}
        loading={loading}
        hideClientColumn={true}
        hideOwnerColumn={true}  // ← NEW: Hides owner column for retired assets
    />
)}
```

## Implementation Details

### AssetTable Props
```javascript
const AssetTable = ({ 
    assets, 
    onAssetClick, 
    onEdit, 
    onDelete, 
    onBulkSelect,
    selectedAssets = [],
    loading = false,
    hideClientColumn = false,
    hideOwnerColumn = false     // ← NEW PROP
}) => {
```

### Conditional Rendering Logic

#### Table Header
```javascript
{!hideOwnerColumn && <SortableHeader sortKey="owner_name">Owner</SortableHeader>}
```

#### Table Body
```javascript
{!hideOwnerColumn && (
    <td className="px-3 py-2 whitespace-nowrap">
        <span className="text-sm font-medium text-gray-700">
            {asset.owner_name || '-'}
        </span>
    </td>
)}
```

#### Search Filter
```javascript
const searchFields = [
    asset.asset_name?.toLowerCase().includes(searchLower),
    asset.asset_id?.toLowerCase().includes(searchLower),
    asset.category?.toLowerCase().includes(searchLower)
];
if (!hideOwnerColumn) {
    searchFields.push(asset.owner_name?.toLowerCase().includes(searchLower));
}
if (!hideClientColumn) {
    searchFields.push(asset.client_name?.toLowerCase().includes(searchLower));
}
```

## Benefits

1. **Cleaner UI** - Retired hardware tab now shows only relevant information
2. **Improved UX** - Users don't see irrelevant owner information for retired assets
3. **Reusable Feature** - The `hideOwnerColumn` prop can be used in other contexts where owner information is not needed
4. **Backward Compatible** - Existing AssetTable usages are not affected (defaults to showing owner column)
5. **Consistent Pattern** - Follows the same pattern as `hideClientColumn`

## Testing

### Verify the Change
1. Navigate to Asset Management as a site admin
2. Click on the "Hardware" tab
3. Click on the "Retired" sub-tab
4. Verify that the "Owner" column is NOT visible
5. Verify that other columns (Asset, ID, Type, Status, etc.) are still visible

### Verify Other Tabs Still Show Owner
1. Click on "Allocated" sub-tab - Owner column should be visible
2. Click on "Available" sub-tab - Owner column should be visible
3. Click on "Repair Queue" sub-tab - Owner column should be visible

### Verify Search Functionality
1. In the Retired tab, try searching by asset name - should work
2. Try searching by asset ID - should work
3. Try searching by category - should work
4. The search placeholder should NOT mention "owner" in the retired tab

## Before vs After

### Before
```
Retired Hardware Tab:
┌────────────┬─────┬────────────┬──────┬────────┬──────────┐
│ Asset      │ ID  │ Owner      │ Type │ Status │ Warranty │
├────────────┼─────┼────────────┼──────┼────────┼──────────┤
│ Laptop-99  │ L99 │ John Doe   │ HW   │ Retired│ Expired  │
│ Monitor-88 │ M88 │ Jane Smith │ HW   │ Retired│ N/A      │
└────────────┴─────┴────────────┴──────┴────────┴──────────┘
         ↑ Owner column showing (not relevant for retired assets)
```

### After
```
Retired Hardware Tab:
┌────────────┬─────┬──────┬────────┬──────────┐
│ Asset      │ ID  │ Type │ Status │ Warranty │
├────────────┼─────┼──────┼────────┼──────────┤
│ Laptop-99  │ L99 │ HW   │ Retired│ Expired  │
│ Monitor-88 │ M88 │ HW   │ Retired│ N/A      │
└────────────┴─────┴──────┴────────┴──────────┘
       ✓ Owner column hidden (cleaner view)
```

## Files Modified
1. `sahayaon-frontend/src/components/assets/AssetTable.js`
2. `sahayaon-frontend/src/components/assets/SiteAdminAssetManagement.js`

## No Backend Changes Required
This is a frontend-only change that affects the UI presentation layer only.

## Linter Status
✅ No linter errors in both modified files

## Future Enhancements (Optional)
1. Add `hideOwnerColumn` to other asset views where owner is not relevant
2. Add a user preference to toggle owner column visibility
3. Add tooltips explaining why owner is hidden in certain contexts
4. Add ability to export retired assets without owner information

## Notes
- The change only affects the "Retired" hardware sub-tab
- All other tabs (Allocated, Available, Repair Queue) still show the owner column
- The software tab is not affected by this change
- The feature is fully backward compatible



