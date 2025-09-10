# Cookies Implementation Guide for IT Ticketing Tool

## Overview

This guide explains how cookies are implemented in your IT Ticketing Tool application and how to use them effectively.

## What are Cookies?

Cookies are small text files stored on a user's device by web browsers. They contain data that websites use to remember information about users between sessions.

### Key Uses in Your Application:

1. **Session Management** - Keep users logged in across browser sessions
2. **User Preferences** - Remember theme settings, language, layout preferences
3. **Analytics** - Track user behavior and website usage (with consent)
4. **Personalization** - Customize content based on user preferences
5. **Security** - Store authentication tokens and CSRF tokens
6. **Performance** - Cache frequently used data

## Implementation Details

### 1. Cookie Manager (`src/utils/cookieManager.js`)

The `CookieManager` class provides comprehensive cookie management functionality:

```javascript
import cookieManager from './utils/cookieManager';

// Set a cookie
cookieManager.setCookie('user_preference', 'dark_theme', {
    expires: 30, // 30 days
    secure: true,
    sameSite: 'Lax'
});

// Get a cookie
const theme = cookieManager.getCookie('user_preference');

// Delete a cookie
cookieManager.deleteCookie('user_preference');
```

### 2. React Hooks (`src/hooks/useCookies.js`)

Custom hooks for easy cookie management in React components:

```javascript
import { useCookies, useUserSession, useUserPreferences, useTheme } from './hooks/useCookies';

function MyComponent() {
    const { cookies, setCookie, getCookie } = useCookies();
    const { session, setUserSession, clearUserSession } = useUserSession();
    const { preferences, updatePreferences } = useUserPreferences();
    const { theme, toggleTheme } = useTheme();
    
    // Use the hooks...
}
```

### 3. Cookie Consent Banner (`src/components/common/CookieConsentBanner.js`)

A GDPR-compliant cookie consent banner that appears when users first visit the site.

### 4. Cookie Settings (`src/components/common/CookieSettings.js`)

A comprehensive settings modal that allows users to manage their cookie preferences.

## Cookie Types Used

### 1. Session Cookies
- **`user_session`** - Stores user authentication data
- **`csrf_token`** - CSRF protection token
- **`last_visited_page`** - Remembers last visited page

### 2. Preference Cookies
- **`user_preferences`** - Stores all user preferences
- **`remember_me`** - Remember me functionality
- **`analytics_consent`** - User consent for analytics

### 3. Functional Cookies
- **`cookie_consent`** - User's cookie consent status
- **`cookie_test_*`** - Temporary cookies for testing

## Usage Examples

### Setting User Session

```javascript
// When user logs in
const userData = {
    userId: 'user123',
    email: 'user@example.com',
    role: 'admin',
    loginTime: new Date().toISOString()
};

cookieManager.setUserSession(userData, 7); // 7 days expiration
```

### Managing User Preferences

```javascript
// Set theme preference
cookieManager.setTheme('dark');

// Set notification preferences
cookieManager.setNotificationPreferences({
    email: true,
    push: false,
    desktop: true
});

// Set dashboard preferences
cookieManager.setDashboardPreferences({
    layout: 'grid',
    itemsPerPage: 20,
    showFilters: true
});
```

### Using React Hooks

```javascript
import { useTheme, useUserPreferences } from './hooks/useCookies';

function ThemeToggle() {
    const { theme, toggleTheme } = useTheme();
    const { preferences, updatePreferences } = useUserPreferences();
    
    return (
        <button onClick={toggleTheme}>
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Theme
        </button>
    );
}
```

## Security Considerations

### 1. Secure Cookies
- All cookies use `secure: true` in production (HTTPS)
- Sensitive data is stored with `httpOnly: true` when possible

### 2. CSRF Protection
- CSRF tokens are stored in secure, httpOnly cookies
- Tokens are validated on server-side requests

### 3. Data Validation
- All cookie values are validated before use
- Error handling prevents cookie-related crashes

## Privacy Compliance

### 1. GDPR Compliance
- Cookie consent banner on first visit
- Granular cookie control (necessary, functional, analytics, marketing)
- Easy opt-out mechanism
- Clear privacy policy integration

### 2. Cookie Categories
- **Necessary**: Always active, essential for functionality
- **Functional**: User preferences and settings
- **Analytics**: Usage tracking (with consent)
- **Marketing**: Personalized content (with consent)

## Best Practices

### 1. Cookie Naming
- Use descriptive names: `user_session`, `theme_preference`
- Avoid sensitive data in cookie names
- Use consistent naming conventions

### 2. Expiration Times
- Session cookies: Browser session only
- User preferences: 1 year
- Authentication: 7 days (configurable)
- Analytics: 2 years (with consent)

### 3. Data Storage
- Store minimal data in cookies
- Use JSON for complex data structures
- Implement data validation and sanitization

## Troubleshooting

### Common Issues

1. **Cookies not persisting**
   - Check if cookies are enabled in browser
   - Verify secure flag for HTTPS sites
   - Check domain and path settings

2. **Cookie consent not working**
   - Ensure consent banner is properly imported
   - Check if consent status is being saved
   - Verify cookie consent logic

3. **Theme not applying**
   - Check if theme cookie is being set
   - Verify CSS classes are being applied
   - Ensure theme context is properly configured

### Debug Tools

```javascript
// Check if cookies are enabled
const cookiesEnabled = cookieManager.areCookiesEnabled();
console.log('Cookies enabled:', cookiesEnabled);

// Get all cookies
const allCookies = cookieManager.getAllCookies();
console.log('All cookies:', allCookies);

// Check specific cookie
const userSession = cookieManager.getUserSession();
console.log('User session:', userSession);
```

## Integration with Existing Features

### 1. Authentication
- User sessions are automatically stored in cookies
- Logout clears all user-related cookies
- Remember me functionality uses persistent cookies

### 2. Theme Management
- Theme preferences are stored in cookies
- Theme context automatically applies saved preferences
- Theme changes are persisted across sessions

### 3. User Preferences
- All user settings are stored in cookies
- Preferences are loaded on app initialization
- Settings can be modified through the settings page

## Future Enhancements

### 1. Advanced Analytics
- Implement detailed usage tracking
- Add performance metrics
- Create user behavior insights

### 2. Personalization
- Machine learning-based recommendations
- Dynamic content based on usage patterns
- Advanced user profiling

### 3. Security Enhancements
- Implement cookie encryption
- Add additional CSRF protection
- Enhanced session management

## Conclusion

The cookie implementation in your IT Ticketing Tool provides a robust foundation for user experience, security, and privacy compliance. The modular design allows for easy extension and customization while maintaining best practices for web development and user privacy.

For any questions or issues, refer to the individual component documentation or contact the development team.
