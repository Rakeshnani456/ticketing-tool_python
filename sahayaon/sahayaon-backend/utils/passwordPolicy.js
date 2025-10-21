// utils/passwordPolicy.js

const PASSWORD_POLICY = {
    minLength: 12,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    preventCommon: true,
    maxAge: 90, // days - password expiry
    preventReuse: 5, // Prevent reuse of last N passwords
    minAge: 1 // Minimum days before password can be changed again
};

// Common passwords to prevent
const COMMON_PASSWORDS = [
    'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
    'monkey', '1234567', 'letmein', 'trustno1', 'dragon', 'baseball',
    'iloveyou', 'master', 'sunshine', 'ashley', 'bailey', 'passw0rd',
    'shadow', '123123', '654321', 'superman', 'qazwsx', 'michael',
    'football', 'welcome', 'jesus', 'ninja', 'mustang', 'password1'
];

/**
 * Validate password against policy requirements
 * @param {string} password - The password to validate
 * @param {string} email - User's email (to prevent using email in password)
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
function validatePassword(password, email = '') {
    const errors = [];
    
    if (!password) {
        return { valid: false, errors: ['Password is required'] };
    }
    
    // Check minimum length
    if (password.length < PASSWORD_POLICY.minLength) {
        errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters long`);
    }
    
    // Check maximum length (reasonable upper limit)
    if (password.length > 128) {
        errors.push('Password must not exceed 128 characters');
    }
    
    // Check for uppercase letters
    if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
        errors.push('Password must contain at least one uppercase letter (A-Z)');
    }
    
    // Check for lowercase letters
    if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
        errors.push('Password must contain at least one lowercase letter (a-z)');
    }
    
    // Check for numbers
    if (PASSWORD_POLICY.requireNumbers && !/[0-9]/.test(password)) {
        errors.push('Password must contain at least one number (0-9)');
    }
    
    // Check for special characters
    if (PASSWORD_POLICY.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'~`]/.test(password)) {
        errors.push('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>_-+=[]\\/)');
    }
    
    // Check for common passwords
    if (PASSWORD_POLICY.preventCommon) {
        const lowerPassword = password.toLowerCase();
        for (const commonPwd of COMMON_PASSWORDS) {
            if (lowerPassword === commonPwd || lowerPassword.includes(commonPwd)) {
                errors.push('Password is too common. Please choose a more unique password');
                break;
            }
        }
    }
    
    // Check if password contains email
    if (email) {
        const emailParts = email.toLowerCase().split('@');
        const username = emailParts[0];
        if (password.toLowerCase().includes(username)) {
            errors.push('Password should not contain your email address');
        }
    }
    
    // Check for sequential characters
    if (hasSequentialChars(password)) {
        errors.push('Password should not contain sequential characters (e.g., 123, abc)');
    }
    
    // Check for repeated characters
    if (hasRepeatedChars(password)) {
        errors.push('Password should not contain more than 3 repeated characters');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Check if password contains sequential characters
 */
function hasSequentialChars(password) {
    const sequences = [
        '0123456789', 'abcdefghijklmnopqrstuvwxyz', 'qwertyuiop', 'asdfghjkl', 'zxcvbnm'
    ];
    
    const lowerPassword = password.toLowerCase();
    
    for (const sequence of sequences) {
        for (let i = 0; i < sequence.length - 3; i++) {
            const substring = sequence.substring(i, i + 4);
            if (lowerPassword.includes(substring) || lowerPassword.includes(substring.split('').reverse().join(''))) {
                return true;
            }
        }
    }
    
    return false;
}

/**
 * Check if password has more than 3 repeated characters
 */
function hasRepeatedChars(password) {
    const regex = /(.)\1{3,}/;
    return regex.test(password);
}

/**
 * Calculate password strength
 * @param {string} password
 * @returns {Object} - { strength: 'weak'|'fair'|'good'|'strong'|'very_strong', score: number }
 */
function calculatePasswordStrength(password) {
    let score = 0;
    
    if (!password) {
        return { strength: 'weak', score: 0 };
    }
    
    // Length scoring
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    if (password.length >= 16) score += 1;
    if (password.length >= 20) score += 1;
    
    // Character variety scoring
    if (/[a-z]/.test(password)) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\/'~`]/.test(password)) score += 1;
    
    // Bonus for variety
    const uniqueChars = new Set(password.split('')).size;
    if (uniqueChars >= password.length * 0.5) score += 1;
    if (uniqueChars >= password.length * 0.75) score += 1;
    
    // Deduct for common patterns
    if (hasSequentialChars(password)) score -= 1;
    if (hasRepeatedChars(password)) score -= 1;
    
    // Determine strength level
    let strength;
    if (score <= 3) strength = 'weak';
    else if (score <= 5) strength = 'fair';
    else if (score <= 7) strength = 'good';
    else if (score <= 9) strength = 'strong';
    else strength = 'very_strong';
    
    return { strength, score };
}

/**
 * Check if password has expired
 * @param {Date} lastPasswordChange
 * @returns {boolean}
 */
function isPasswordExpired(lastPasswordChange) {
    if (!lastPasswordChange) return false;
    
    const daysSinceChange = (Date.now() - new Date(lastPasswordChange).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange > PASSWORD_POLICY.maxAge;
}

/**
 * Check if password was used recently
 * @param {string} newPasswordHash - Hash of the new password
 * @param {Array} passwordHistory - Array of previous password hashes
 * @returns {boolean}
 */
function isPasswordReused(newPasswordHash, passwordHistory = []) {
    if (!PASSWORD_POLICY.preventReuse || !passwordHistory.length) {
        return false;
    }
    
    const recentPasswords = passwordHistory.slice(-PASSWORD_POLICY.preventReuse);
    return recentPasswords.includes(newPasswordHash);
}

/**
 * Generate password policy description for UI
 * @returns {Object}
 */
function getPasswordPolicyDescription() {
    return {
        requirements: [
            `At least ${PASSWORD_POLICY.minLength} characters long`,
            PASSWORD_POLICY.requireUppercase ? 'Contains uppercase letters (A-Z)' : null,
            PASSWORD_POLICY.requireLowercase ? 'Contains lowercase letters (a-z)' : null,
            PASSWORD_POLICY.requireNumbers ? 'Contains numbers (0-9)' : null,
            PASSWORD_POLICY.requireSpecialChars ? 'Contains special characters (!@#$%^&*...)' : null,
            'Not a common password',
            'Does not contain your email address',
            'No sequential or repeated characters'
        ].filter(Boolean),
        maxAge: PASSWORD_POLICY.maxAge,
        preventReuse: PASSWORD_POLICY.preventReuse
    };
}

module.exports = {
    PASSWORD_POLICY,
    validatePassword,
    calculatePasswordStrength,
    isPasswordExpired,
    isPasswordReused,
    getPasswordPolicyDescription
};

