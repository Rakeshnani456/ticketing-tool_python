# GDPR/ISO-27001 Implementation Checklist

## ✅ Immediate Actions (Before Going Live)

### 1. Backend Setup
- [ ] Restart your backend server to load new GDPR routes
- [ ] Verify `/api/gdpr` endpoints are accessible
- [ ] Test data export functionality with a test user
- [ ] Test account deletion with a test user

### 2. Frontend Setup
- [ ] Add routes for legal pages in `App.js`:
  ```javascript
  import PrivacyPolicyPage from './components/legal/PrivacyPolicyPage';
  import TermsOfServicePage from './components/legal/TermsOfServicePage';
  
  // Add to your routes:
  <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
  <Route path="/terms-of-service" element={<TermsOfServicePage />} />
  ```
- [ ] Rebuild frontend: `npm run build`
- [ ] Test GDPR features in Settings page

### 3. Legal Documents
- [ ] **CRITICAL:** Update Privacy Policy with your company information
  - Replace `[Your Company Address]`
  - Replace `dpo@yourcompany.com` with actual DPO email
  - Replace `[Your Jurisdiction]` with your legal jurisdiction
  
- [ ] **CRITICAL:** Update Terms of Service with your company information
  - Replace `[Your Company Address]`
  - Replace `legal@yourcompany.com` with actual email
  - Replace `[Your Jurisdiction]`
  - Replace `[Arbitration Rules]` if applicable

### 4. Email Configuration
- [ ] Configure email templates for:
  - Data export confirmation
  - Account deletion confirmation
  - Data breach notifications (GDPR requires 72-hour notification)
  - Security incident alerts
  
- [ ] Test email delivery

### 5. Data Protection Officer (DPO)
- [ ] Appoint a Data Protection Officer (required if processing large amounts of personal data)
- [ ] Update contact information in Privacy Policy
- [ ] Set up DPO email: `dpo@yourcompany.com`

---

## 🔧 Configuration Steps

### Enable Data Retention Scheduler

Add this to `ticketing_tool_backend/server.js` after database connection:

```javascript
// Import data retention manager
const { scheduleRetentionPolicy } = require('./utils/dataRetentionManager');

// After successful database connection (around line 53)
if (dbConnected) {
    // Schedule data retention policy (runs daily at 2 AM)
    scheduleRetentionPolicy(db, 2);
    console.log('✓ Data retention policy scheduler initialized');
}
```

### Optional: Enable Password Policy Enforcement

Update `authRoutes.js` registration endpoint:

```javascript
const { validatePassword } = require('../utils/passwordPolicy');

router.post('/register', async (req, res) => {
    const { email, password, role = 'user' } = req.body;
    
    // Validate password
    const passwordValidation = validatePassword(password, email);
    if (!passwordValidation.valid) {
        return res.status(400).json({ 
            error: 'Password does not meet security requirements', 
            details: passwordValidation.errors 
        });
    }
    
    // ... rest of registration logic
});
```

---

## 🧪 Testing Checklist

### Frontend Tests
- [ ] Login as a user
- [ ] Navigate to Settings → Data & Privacy (GDPR)
- [ ] Click "Manage Privacy & Data Settings"
- [ ] Test **Export Data** button
  - Verify download happens
  - Open JSON file and verify data completeness
- [ ] Test **Request Deletion** button
  - Verify confirmation modal appears
  - Test with wrong email (should fail)
  - Test with correct email
  - Verify request appears in history
- [ ] Toggle consent preferences
  - Analytics consent
  - Marketing consent
- [ ] Click Privacy Policy link → verify page loads
- [ ] Click Terms of Service link → verify page loads
- [ ] Test in both Light and Dark themes

### Backend API Tests

```bash
# Get auth token first
TOKEN="your_firebase_token_here"

# Test 1: Export Data
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/gdpr/export-data \
  -o my_data.json

# Test 2: Get GDPR Requests
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/gdpr/my-requests

# Test 3: Record Consent
curl -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"consentType":"analytics","granted":true,"version":"1.0"}' \
  http://localhost:5000/api/gdpr/consent

# Test 4: Get Consent History
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:5000/api/gdpr/consent-history
```

### Database Verification
- [ ] Check Firestore for new collections:
  - `gdpr_requests`
  - `user_consents`
  - `security_incidents`
- [ ] Verify data is being written correctly
- [ ] Check audit logs in `activities` collection

---

## 📋 Pre-Production Checklist

### Legal Compliance
- [ ] Privacy Policy reviewed by legal counsel
- [ ] Terms of Service reviewed by legal counsel
- [ ] Data Processing Agreements (DPAs) signed with third-party services
- [ ] Data Protection Impact Assessment (DPIA) completed
- [ ] Records of Processing Activities (ROPA) documented

### Security
- [ ] SSL/TLS certificates installed and valid
- [ ] Firestore security rules deployed
- [ ] Firebase authentication configured
- [ ] MFA option available (optional but recommended)
- [ ] Password policy enforced
- [ ] Failed login tracking enabled
- [ ] Session timeout configured

### Monitoring
- [ ] Security incident monitoring set up
- [ ] GDPR request monitoring dashboard (optional)
- [ ] Email alerts configured for critical incidents
- [ ] Backup verification process in place
- [ ] Data retention scheduler running

### Documentation
- [ ] Staff trained on GDPR requirements
- [ ] Incident response procedures documented
- [ ] Escalation paths defined
- [ ] DPO responsibilities documented
- [ ] User guides updated with privacy features

---

## 🚀 Deployment Steps

1. **Backend Deployment:**
   ```bash
   cd ticketing_tool_backend
   npm install  # Install any new dependencies
   # Deploy to your hosting platform
   ```

2. **Frontend Deployment:**
   ```bash
   cd it_ticketing_frontend
   npm install  # Install any new dependencies
   npm run build
   # Deploy build folder to hosting
   ```

3. **Post-Deployment:**
   - [ ] Verify all routes are accessible
   - [ ] Test GDPR features in production
   - [ ] Monitor logs for errors
   - [ ] Send test email notifications

---

## 📞 Emergency Procedures

### Data Breach Response (GDPR Article 33)

**Timeline: You have 72 hours to notify authorities**

1. **Immediate (0-2 hours):**
   - Contain the breach
   - Document what happened
   - Assess scope and severity

2. **Within 24 hours:**
   - Notify Data Protection Officer
   - Begin investigation
   - Log incident in system

3. **Within 72 hours:**
   - Notify supervisory authority if high risk
   - Notify affected users
   - Document all actions taken

**Use the security incident manager:**
```javascript
const { handleDataBreach } = require('./utils/securityIncidentManager');

await handleDataBreach(db, {
    description: 'Description of what happened',
    affectedUsers: ['userId1', 'userId2'],
    dataTypes: ['email', 'name', 'tickets'],
    breachDate: new Date('2025-01-15'),
    discoveryDate: new Date(),
    containmentMeasures: 'What was done to contain',
    mitigationSteps: 'What users should do'
});
```

---

## 🔄 Regular Maintenance

### Daily
- [ ] Check `system_logs` for retention policy execution
- [ ] Review `security_incidents` for new alerts
- [ ] Monitor failed login attempts

### Weekly
- [ ] Review GDPR requests in `gdpr_requests` collection
- [ ] Check for pending account deletions
- [ ] Review consent changes

### Monthly
- [ ] Run compliance checklist
- [ ] Review data retention effectiveness
- [ ] Update policies if needed
- [ ] Security incident review

### Quarterly
- [ ] User access audit
- [ ] Third-party vendor review
- [ ] Privacy Impact Assessment update
- [ ] Security awareness training

### Annually
- [ ] Full security audit
- [ ] Penetration testing
- [ ] Policy review and updates
- [ ] Legal compliance review
- [ ] DPO performance review

---

## 📊 Success Metrics

Track these KPIs for compliance:

### GDPR Metrics
- Number of data export requests per month
- Average time to fulfill export requests (target: < 30 days)
- Number of deletion requests per month
- Average time to complete deletion (target: < 30 days)
- Consent rates (analytics, marketing)

### Security Metrics
- Security incidents by severity
- Average incident resolution time
- Failed login attempts per user
- Account lockouts per month
- Data retention policy execution success rate

### Audit Metrics
- Activities logged per day
- Data retention cleanup records
- Third-party access logs
- Admin action logs

---

## ✅ Go-Live Approval

Before enabling GDPR features for all users, ensure:

- [ ] All critical checklist items completed
- [ ] Legal approval obtained
- [ ] Testing completed successfully
- [ ] Staff trained
- [ ] Monitoring in place
- [ ] Emergency procedures documented
- [ ] Backup and recovery tested

---

## 🆘 Troubleshooting

### Common Issues

**Issue:** GDPR routes return 404
- **Solution:** Restart backend server, verify routes are registered in `server.js`

**Issue:** Data export returns empty data
- **Solution:** Check Firestore permissions, verify user has created tickets/activities

**Issue:** Account deletion doesn't work
- **Solution:** Verify email confirmation matches exactly, check Firebase auth permissions

**Issue:** Consent changes not saving
- **Solution:** Check `user_consents` collection permissions, verify Firestore rules

**Issue:** Data retention policy not running
- **Solution:** Verify scheduler is initialized in `server.js`, check server logs

---

## 📚 Reference Documents

- `GDPR_ISO27001_COMPLIANCE_GUIDE.md` - Complete implementation guide
- `GDPR_ISO27001_IMPLEMENTATION_SUMMARY.md` - What was implemented
- Privacy Policy - `/privacy-policy` page
- Terms of Service - `/terms-of-service` page

---

**Need Help?** Review the comprehensive guide: `GDPR_ISO27001_COMPLIANCE_GUIDE.md`

---

*Checklist Version: 1.0*
*Last Updated: October 21, 2025*

