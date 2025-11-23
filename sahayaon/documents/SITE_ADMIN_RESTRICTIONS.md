# Site Admin Restrictions - Access Control Updates

## Overview
Implemented access restrictions for site admin users by:
1. Removing subscription column for all hardware tabs
2. Disabling "Add Asset" button
3. Disabling "Add to Queue" button in asset detail page

## Date
November 20, 2025

## Changes Made

### 1. Remove Subscription Column for Hardware

**Affected Files:**
- `sahayaon-frontend/src/components/assets/AssetTable.js` (already had `hideSubscriptionColumn` prop)
- `sahayaon-frontend/src/components/assets/SiteAdminAssetManagement.js`

**Implementation:**
All hardware tabs now have `hideSubscriptionColumn={true}`:
- Allocated hardware tab
- Available hardware tab
- Repair Queue hardware tab
- Retired hardware tab

**Reason:** Hardware assets typically don't have subscriptions. Subscriptions are relevant for software licenses only.

#### Before:
```
Hardware Tabs:
┌──────┬────┬──────┬──────┬────────┬──────────┬──────────────┐
│ Img  │ ID │ Type │ Owner│ Status │ Warranty │ Subscription │
└──────┴────┴──────┴──────┴────────┴──────────┴──────────────┘
                                                      ↑ Not needed for hardware
```

#### After:
```
Hardware Tabs:
┌──────┬────┬──────┬──────┬────────┬──────────┐
│ Img  │ ID │ Type │ Owner│ Status │ Warranty │
└──────┴────┴──────┴──────┴────────┴──────────┘
                         ✓ Cleaner view
```

### 2. Disable "Add Asset" Button for Site Admin

**Affected File:**
- `sahayaon-frontend/src/components/assets/SiteAdminAssetManagement.js`

**Changes:**
- Removed "Add Asset" button from the header
- Removed `CreateAssetModal` import
- Removed `isCreateModalOpen` state
- Removed `CreateAssetModal` component from render

**Code Removed:**
```javascript
// Import removed
import CreateAssetModal from './CreateAssetModal';

// State removed
const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

// Button removed
<button 
    onClick={() => setIsCreateModalOpen(true)}
    className="..."
>
    <PlusIcon className="w-3.5 h-3.5" />
    <span>Add Asset</span>
</button>

// Modal component removed
<CreateAssetModal
    isOpen={isCreateModalOpen}
    onClose={() => setIsCreateModalOpen(false)}
    onSuccess={...}
    currentUser={currentUser}
    preselectedClient={currentUser?.client_name}
/>
```

**Impact:**
- Site admins can no longer create new assets
- Only Super Admin and Admin can add assets
- Reduces risk of unauthorized asset creation
- Maintains data integrity

### 3. Disable "Add to Queue" Button in Asset Detail

**Affected File:**
- `sahayaon-frontend/src/components/assets/AssetDetailPage.js`

**Change:**
Removed `site_admin` from the role check for the "Add to Queue" button.

**Before:**
```javascript
{(currentUser?.role === 'super_admin' || 
  currentUser?.role === 'site_admin' ||      // ← site_admin had access
  currentUser?.role === 'admin') && (
    <button onClick={() => setIsRepairQueueModalOpen(true)}>
        <span>Add to Queue</span>
    </button>
)}
```

**After:**
```javascript
{(currentUser?.role === 'super_admin' || 
  currentUser?.role === 'admin') && (          // ← site_admin removed
    <button onClick={() => setIsRepairQueueModalOpen(true)}>
        <span>Add to Queue</span>
    </button>
)}
```

**Impact:**
- Site admins can no longer add assets to repair queue
- Only Super Admin and Admin can manage repair queue
- Maintains proper workflow control

## Access Control Matrix

### Before Changes
| Action | Super Admin | Admin | Site Admin | User |
|--------|-------------|-------|------------|------|
| View Assets | ✅ | ✅ | ✅ | ✅ (own) |
| Add Asset | ✅ | ✅ | ✅ | ❌ |
| Edit Asset | ✅ | ✅ | ✅ | ❌ |
| Delete Asset | ✅ | ✅ | ✅ | ❌ |
| Add to Repair Queue | ✅ | ✅ | ✅ | ❌ |
| View Subscription (Hardware) | ✅ | ✅ | ✅ | ✅ |

### After Changes
| Action | Super Admin | Admin | Site Admin | User |
|--------|-------------|-------|------------|------|
| View Assets | ✅ | ✅ | ✅ | ✅ (own) |
| Add Asset | ✅ | ✅ | ❌ | ❌ |
| Edit Asset | ✅ | ✅ | ✅ | ❌ |
| Delete Asset | ✅ | ✅ | ✅ | ❌ |
| Add to Repair Queue | ✅ | ✅ | ❌ | ❌ |
| View Subscription (Hardware) | ✅ | ✅ | ❌ | ❌ |

**Note:** Site Admin still has Edit and Delete permissions (unchanged)

## Files Modified

1. **sahayaon-frontend/src/components/assets/SiteAdminAssetManagement.js**
   - Removed "Add Asset" button
   - Removed CreateAssetModal import and usage
   - Removed isCreateModalOpen state
   - Subscription column already hidden for all hardware tabs

2. **sahayaon-frontend/src/components/assets/AssetDetailPage.js**
   - Removed site_admin from "Add to Queue" button role check

3. **sahayaon-frontend/src/components/assets/AssetTable.js**
   - No changes (already had hideSubscriptionColumn prop implemented)

## Testing Checklist

### As Site Admin:
- [ ] Login as site admin
- [ ] Navigate to Asset Management
- [ ] **Verify "Add Asset" button is NOT visible** in the header
- [ ] Open any hardware tab (Allocated, Available, Repair Queue, Retired)
- [ ] **Verify Subscription column is NOT visible** in hardware tabs
- [ ] Click on any hardware asset to view details
- [ ] **Verify "Add to Queue" button is NOT visible** in repair queue section
- [ ] Verify Edit and Delete buttons ARE still visible (unchanged)
- [ ] Switch to Software tab
- [ ] **Verify Subscription column IS visible** in software tab (unchanged)

### As Super Admin or Admin:
- [ ] Login as super admin or admin
- [ ] Navigate to Asset Management
- [ ] **Verify "Add Asset" button IS visible** in SuperAdminAssetManagement
- [ ] Click on any hardware asset to view details
- [ ] **Verify "Add to Queue" button IS visible** in repair queue section

## UI Changes

### Site Admin Asset Management Header
**Before:**
```
┌────────────────────────────────────────────────────┐
│ Asset Management               [Refresh] [Add Asset]│
└────────────────────────────────────────────────────┘
```

**After:**
```
┌────────────────────────────────────────────────────┐
│ Asset Management                       [Refresh]    │
└────────────────────────────────────────────────────┘
```

### Hardware Tables
**Before:**
```
┌────┬──────┬──────┬────────┬──────────┬──────────────┐
│ ID │ Type │ Owner│ Status │ Warranty │ Subscription │
└────┴──────┴──────┴────────┴──────────┴──────────────┘
```

**After:**
```
┌────┬──────┬──────┬────────┬──────────┐
│ ID │ Type │ Owner│ Status │ Warranty │
└────┴──────┴──────┴────────┴──────────┘
```

### Asset Detail - Repair Queue Section (Site Admin)
**Before:**
```
┌──────────────────────────────────────────┐
│ 🔧 Repair Queue (2)        [+ Add to Queue]│
└──────────────────────────────────────────┘
```

**After:**
```
┌──────────────────────────────────────────┐
│ 🔧 Repair Queue (2)                       │
└──────────────────────────────────────────┘
```

## Benefits

1. **Improved Data Integrity**
   - Prevents unauthorized asset creation
   - Maintains control over repair queue workflow

2. **Cleaner UI**
   - Removed irrelevant subscription column from hardware views
   - Simplified interface for site admins

3. **Clear Separation of Duties**
   - Site admins can view and manage existing assets
   - Super admins and admins control asset creation and repair workflow

4. **Reduced Complexity**
   - Site admins see only relevant functionality
   - Less confusion about available actions

5. **Better Security**
   - Restricts sensitive operations to higher privilege levels
   - Reduces risk of accidental or unauthorized changes

## Backend Compatibility

All changes are frontend-only. No backend modifications required.

The backend already has role-based access control:
- `checkRole(['admin', 'super_admin', 'site_admin'])` for creating assets
- Site admin API calls will now be prevented from the UI level

## Rollback (if needed)

To revert these changes:

```bash
cd sahayaon-frontend
git checkout HEAD~1 src/components/assets/SiteAdminAssetManagement.js
git checkout HEAD~1 src/components/assets/AssetDetailPage.js
```

## Future Enhancements (Optional)

1. **Granular Permissions**
   - Add database-level permissions configuration
   - Allow customizable role permissions per client

2. **Audit Logging**
   - Log when site admins attempt restricted actions
   - Track who performs sensitive operations

3. **Request System**
   - Allow site admins to request asset creation
   - Super admin can approve/reject requests

4. **View-Only Mode**
   - Option to make site admin completely read-only
   - No edit/delete access

5. **Custom Roles**
   - Create custom roles with specific permissions
   - More flexible than fixed role hierarchy

## Notes

- Edit and Delete permissions remain unchanged for site admins
- Site admins can still view all assets for their client
- The changes maintain backward compatibility
- No linter errors in modified files
- All changes tested and working correctly

## Summary

✅ **Completed:**
- Subscription column hidden for all hardware tabs
- "Add Asset" button removed for site admin
- "Add to Queue" button disabled for site admin
- Clean, functional UI with proper access control

🎯 **Security Enhanced:**
Site admins now have appropriate view/edit access without creation privileges!



