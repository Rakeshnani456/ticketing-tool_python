# Site Admin Asset Management - Visual Layout

## Page Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER                                                              │
│  Asset Management                                    [Refresh] [Add] │
│  Manage assets for [Client Name]                                    │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┬──────────────────┬──────────────────┬─────────────┐
│ 📦 Total         │ ✅ Allocated     │ 📦 Available     │ ⚠️ Software │
│    Hardware      │    Hardware      │    Hardware      │    Renewals │
│    ───────       │    ───────       │    ───────       │    ──────── │
│       15         │       10         │        5         │       3     │
│ All hardware     │ Assigned to      │ Ready for        │ Due in next │
│ assets           │ users            │ allocation       │ 30 days     │
└──────────────────┴──────────────────┴──────────────────┴─────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  [Hardware] ════════════════   [Software]                           │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
HARDWARE TAB VIEW
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│  [Allocated (10)] ═══  [Available (5)]  [Repair Queue (2)]          │
│  [Retired (3)]                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  ALLOCATED HARDWARE LIST                                             │
│                                                                      │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │ Name      │ Category  │ Owner      │ Status   │ Actions       │ │
│  ├───────────────────────────────────────────────────────────────┤ │
│  │ Laptop-01 │ Laptop    │ John Doe   │ ✅ Active│ View Details  │ │
│  │ Laptop-02 │ Laptop    │ Jane Smith │ ✅ Active│ View Details  │ │
│  │ Monitor-1 │ Monitor   │ John Doe   │ ✅ Active│ View Details  │ │
│  └───────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════
SOFTWARE TAB VIEW
═══════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────┐
│  ALL SOFTWARE                                                        │
│  View all software licenses and subscriptions                       │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────────┐
│  Software    │ Distributor │ Version │ Period         │ Renewal    │ Allocated/ │ Actions │
│  Name        │             │         │                │            │ Available  │         │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Microsoft    │ Microsoft   │ 2021    │ 2024-01-15     │ 🟢 Active  │   5/10     │ View    │
│ Office       │ Corp        │         │ to 2025-01-15  │            │            │ Details │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Adobe        │ Adobe Inc.  │ 2024    │ 2024-11-01     │ 🟠 Renew   │   3/5      │ View    │
│ Creative     │             │         │ to 2024-12-01  │    Soon    │            │ Details │
├────────────────────────────────────────────────────────────────────────────────────────────┤
│ Slack        │ Slack Tech  │ Pro     │ 2024-10-01     │ 🔴 Expired │   8/10     │ View    │
│              │             │         │ to 2024-11-15  │            │            │ Details │
└────────────────────────────────────────────────────────────────────────────────────────────┘
```

## Color Coding

### Summary Cards
- 🔵 **Blue** - Total Hardware (informational)
- 🟢 **Green** - Allocated Hardware (active/in-use)
- 🟣 **Purple** - Available Hardware (ready)
- 🟠 **Orange** - Software Renewals (attention needed)

### Hardware Status Badges
- ✅ **Green** - Active
- 🟠 **Orange** - Under Repair
- ⚪ **Gray** - Retired
- 🟡 **Yellow** - Pending

### Software Renewal Tags
- 🟢 **Green** - Active (90+ days remaining)
- 🟡 **Yellow** - Upcoming (30-90 days)
- 🟠 **Orange** - Renew Soon (1-30 days)
- 🔴 **Red** - Expired (overdue)

## Tab Navigation Flow

```
Main Page
    ↓
┌───────────────────────────────────┐
│   Choose Main Tab                 │
├───────────────────────────────────┤
│   • Hardware                      │
│   • Software                      │
└───────────────────────────────────┘
         ↓                  ↓
    Hardware Tab       Software Tab
         ↓                  ↓
┌─────────────────┐    ┌──────────────────┐
│ Choose Sub-Tab  │    │ Show Software    │
├─────────────────┤    │ Table            │
│ • Allocated     │    │                  │
│ • Available     │    │ Columns:         │
│ • Repair Queue  │    │ - Name           │
│ • Retired       │    │ - Distributor    │
└─────────────────┘    │ - Version        │
         ↓              │ - Period         │
    Show Asset List    │ - Renewal Tag    │
                       │ - Allocation     │
                       │ - Actions        │
                       └──────────────────┘
```

## Data Flow

### Hardware Allocation Logic
```
Total Hardware = All hardware assets
    ├─ Allocated = Has owner_uid AND status != 'Retired'
    ├─ Available = No owner_uid AND status = 'Active'
    ├─ Repair Queue = status = 'Under Repair'
    └─ Retired = status = 'Retired'
```

### Software License Allocation
```
For each unique software:
    Total Licenses = quantity field
    Allocated = Count of same software name with owner_uid and not retired
    Available = Total - Allocated
    Display as: "Allocated/Total" (e.g., "5/10")
```

### Software Renewal Calculation
```
Get subscription_end date
Calculate days remaining
    If < 0 days: Expired (Red)
    If 1-30 days: Renew Soon (Orange)
    If 31-90 days: Upcoming (Yellow)
    If > 90 days: Active (Green)
```

## Interactive Elements

### Clickable Actions
- **Refresh Button** - Reloads all asset and summary data
- **Add Asset Button** - Opens CreateAssetModal
- **Tab Buttons** - Switches between Hardware/Software views
- **Sub-Tab Buttons** - Filters hardware by status
- **View Details** - Navigates to asset detail page
- **Asset Rows** - Click to view full asset details

### State Management
```javascript
Main States:
- mainTab: 'hardware' | 'software'
- hardwareSubTab: 'allocated' | 'available' | 'repair-queue' | 'retired'
- assets: Array of all assets
- loading: Boolean for loading state
- isCreateModalOpen: Boolean for modal visibility
```

## Responsive Behavior

### Desktop (1024px+)
- Summary cards: 4 columns
- Full table width with all columns visible
- Horizontal tab layout

### Tablet (768px - 1023px)
- Summary cards: 2 columns
- Table scrolls horizontally
- Tabs stack on smaller tablets

### Mobile (< 768px)
- Summary cards: 1 column
- Table scrolls horizontally
- Tabs become scrollable horizontally
- Condensed padding and spacing



