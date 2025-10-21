# Smart Filter System - Jira-like Filtering

## Overview

The Smart Filter System provides advanced filtering capabilities for tickets, similar to Jira's filtering interface. It offers a comprehensive, user-friendly way to filter tickets by multiple criteria with URL persistence and real-time updates.

## Features

### 🎯 **Multi-Criteria Filtering**
- **Status**: Open, In Progress, Hold, Resolved, Cancelled
- **Priority**: Low, Medium, High, Critical
- **Assigned To**: Unassigned, Assigned to Me, Specific Engineers
- **Client**: Filter by company/client
- **Created Date**: Today, Yesterday, Last 7/30/90 days, This year

### 🔍 **Advanced Search**
- Search within filter categories
- Multi-select options for complex filtering
- Real-time filter application
- Visual filter badges showing active filters

### 💾 **URL Persistence**
- Filter state automatically saved in URL parameters
- Shareable filter links
- Browser back/forward support
- Deep linking to specific filter combinations

### 🎨 **Modern UI/UX**
- Jira-inspired interface design
- Responsive dropdown positioning
- Smooth animations and transitions
- Clear visual feedback for active filters

## Components

### 1. SmartFilterDropdown
**Location**: `src/components/common/SmartFilterDropdown.js`

Main filter component that provides the dropdown interface.

**Props**:
- `filters`: Current filter state object
- `onFiltersChange`: Callback for filter changes
- `availableEngineers`: Array of engineer objects
- `availableClients`: Array of client objects
- `className`: Additional CSS classes
- `disabled`: Disable the component
- `showClearAll`: Show clear all button

**Features**:
- Hierarchical filter navigation
- Search within filter categories
- Multi-select support
- Active filter badges
- Responsive positioning

### 2. useSmartFilters Hook
**Location**: `src/hooks/useSmartFilters.js`

Custom hook that manages filter state and logic.

**Returns**:
- `filters`: Current filter state
- `handleFiltersChange`: Function to update filters
- `clearAllFilters`: Function to clear all filters
- `clearFilter`: Function to clear specific filter
- `applyFilters`: Function to apply filters to ticket array
- `getFilterSummary`: Function to get human-readable filter summary
- `hasActiveFilters`: Boolean indicating if any filters are active
- `isInitialized`: Boolean indicating if filters are ready

**Features**:
- URL parameter synchronization
- Filter application logic
- Date range calculations
- Multi-value filter support

## Integration

### Basic Usage

```jsx
import SmartFilterDropdown from '../common/SmartFilterDropdown';
import { useSmartFilters } from '../../hooks/useSmartFilters';

const MyComponent = () => {
    const {
        filters,
        handleFiltersChange,
        applyFilters,
        hasActiveFilters
    } = useSmartFilters();

    const filteredTickets = applyFilters(allTickets, currentUser);

    return (
        <div>
            <SmartFilterDropdown
                filters={filters}
                onFiltersChange={handleFiltersChange}
                availableEngineers={engineers}
                availableClients={clients}
            />
            {/* Render filtered tickets */}
        </div>
    );
};
```

### Advanced Integration

```jsx
// With custom filter logic
const MyAdvancedComponent = () => {
    const {
        filters,
        handleFiltersChange,
        clearAllFilters,
        getFilterSummary,
        hasActiveFilters
    } = useSmartFilters();

    // Custom filter application
    const applyCustomFilters = useCallback((tickets) => {
        let filtered = tickets;
        
        // Apply smart filters
        filtered = applyFilters(filtered, currentUser);
        
        // Apply additional custom logic
        if (customFilter) {
            filtered = filtered.filter(ticket => 
                ticket.customField === customFilter
            );
        }
        
        return filtered;
    }, [filters, customFilter, currentUser]);

    return (
        <div>
            <SmartFilterDropdown
                filters={filters}
                onFiltersChange={handleFiltersChange}
                availableEngineers={engineers}
                availableClients={clients}
            />
            
            {hasActiveFilters && (
                <div className="filter-summary">
                    Active: {getFilterSummary().join(', ')}
                    <button onClick={clearAllFilters}>Clear All</button>
                </div>
            )}
        </div>
    );
};
```

## Filter Types

### Status Filter
```javascript
// Single status
filters.status = 'Open';

// Multiple statuses
filters.status = ['Open', 'In Progress'];
```

### Priority Filter
```javascript
// Single priority
filters.priority = 'High';

// Multiple priorities
filters.priority = ['High', 'Critical'];
```

### Assigned Filter
```javascript
// Unassigned tickets
filters.assigned = 'unassigned';

// Assigned to current user
filters.assigned = 'assigned_to_me';

// Assigned to specific engineer
filters.assigned = 'engineer@company.com';

// Multiple assignments
filters.assigned = ['unassigned', 'assigned_to_me'];
```

### Client Filter
```javascript
// Single client
filters.client = 'Acme Corporation';
```

### Created Date Filter
```javascript
// Predefined ranges
filters.created = 'today';
filters.created = 'yesterday';
filters.created = 'last_7_days';
filters.created = 'last_30_days';
filters.created = 'last_90_days';
filters.created = 'this_year';
```

## URL Parameters

The system automatically manages URL parameters for filter persistence:

```
/tickets?filter_status=Open,In%20Progress&filter_priority=High&filter_assigned=assigned_to_me
```

**Parameter Format**:
- `filter_[type]`: Filter parameter
- Multiple values separated by commas
- URL encoded for special characters

## Styling

The component uses Tailwind CSS classes and includes custom styles for:
- Dropdown positioning and animations
- Filter badges and indicators
- Hover states and transitions
- Responsive behavior

### Custom Styling

```css
/* Custom filter badge styles */
.filter-badge {
    animation: fadeIn 0.2s ease-out;
}

/* Custom dropdown styles */
.smart-filter-dropdown {
    max-height: 400px;
    overflow-y: auto;
}

/* Custom option styles */
.filter-option {
    transition: all 0.2s ease;
}

.filter-option:hover {
    background-color: #f3f4f6;
}

.filter-option.selected {
    background-color: #dbeafe;
}
```

## Performance Considerations

### Optimization Features
- **Memoized Options**: Filter options are memoized to prevent unnecessary re-renders
- **Efficient Filtering**: Client-side filtering with optimized algorithms
- **URL Debouncing**: URL updates are debounced to prevent excessive history entries
- **Conditional Rendering**: Components only render when necessary

### Best Practices
1. **Memoize Data**: Use `useMemo` for expensive data transformations
2. **Debounce Updates**: Debounce filter changes for better performance
3. **Limit Options**: Keep filter option lists reasonable in size
4. **Cache Results**: Cache filtered results when possible

## Browser Support

- **Modern Browsers**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **Features Used**: ES6+, CSS Grid, CSS Custom Properties
- **Fallbacks**: Graceful degradation for older browsers

## Testing

### Demo Component
Use `SmartFilterDemo` component for testing and demonstration:

```jsx
import SmartFilterDemo from '../common/SmartFilterDemo';

// Render demo with sample data
<SmartFilterDemo />
```

### Test Scenarios
1. **Filter Application**: Test all filter types and combinations
2. **URL Persistence**: Verify URL parameters are correctly managed
3. **Multi-select**: Test multiple selections within categories
4. **Search**: Test search functionality within filter categories
5. **Responsive**: Test on different screen sizes
6. **Performance**: Test with large datasets

## Troubleshooting

### Common Issues

1. **Filters Not Applying**
   - Check if `applyFilters` is called with correct parameters
   - Verify filter state is properly initialized
   - Ensure ticket data structure matches expected format

2. **URL Parameters Not Working**
   - Check if `useLocation` and `useNavigate` are available
   - Verify URL parameter parsing logic
   - Check for conflicts with other URL parameters

3. **Performance Issues**
   - Implement memoization for expensive operations
   - Consider server-side filtering for large datasets
   - Use virtualization for very large lists

4. **Styling Issues**
   - Check Tailwind CSS classes are available
   - Verify custom CSS is loaded
   - Test responsive behavior on different devices

## Future Enhancements

### Planned Features
- **Saved Filters**: Save and load common filter combinations
- **Filter Presets**: Quick access to predefined filter sets
- **Advanced Date Ranges**: Custom date range picker
- **Filter Analytics**: Track most used filter combinations
- **Export Filters**: Export filtered data with applied filters

### Extension Points
- **Custom Filter Types**: Add new filter categories
- **Custom Filter Logic**: Implement custom filtering algorithms
- **Custom UI Components**: Replace default UI elements
- **Integration Hooks**: Add custom integration points

## Contributing

When contributing to the Smart Filter System:

1. **Follow Patterns**: Use existing patterns for consistency
2. **Add Tests**: Include tests for new functionality
3. **Update Documentation**: Keep this README current
4. **Performance**: Consider performance implications
5. **Accessibility**: Ensure accessibility compliance

## License

This Smart Filter System is part of Sahayaon and follows the same licensing terms.
