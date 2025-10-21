// components/legal/PrivacyPolicyPage.js
import React from 'react';
import './PrivacyPolicyPage.css';

const PrivacyPolicyPage = () => {
    const lastUpdated = "October 21, 2025";

    return (
        <div className="privacy-policy-page">
            <div className="privacy-header">
                <div className="privacy-header-content">
                    <h1>Privacy Policy</h1>
                    <p className="privacy-last-updated">Last Updated: {lastUpdated}</p>
                    <div className="privacy-compliance">GDPR & ISO-27001 Compliant</div>
                </div>
            </div>

            <div className="privacy-container">
                <p className="privacy-intro">
                    Your privacy is important to us. This Privacy Policy explains how we collect, use, disclose, 
                    and safeguard your information when you use Sahayaon. We are committed to protecting 
                    your personal data in accordance with the General Data Protection Regulation (GDPR) and ISO-27001 
                    information security standards.
                </p>

                <div className="privacy-section">
                    <h2>1. Information We Collect</h2>
                    <p>We collect information that you provide directly to us, including:</p>
                    <ul>
                        <li><strong>Account Information:</strong> Name, email address, password, company name, role</li>
                        <li><strong>Ticket Data:</strong> Issue descriptions, comments, attachments, status updates</li>
                        <li><strong>Usage Data:</strong> IP address, browser type, device information, access times</li>
                        <li><strong>Communications:</strong> Messages, support requests, feedback</li>
                    </ul>
                    
                    <h3>Legal Basis for Processing (GDPR Article 6)</h3>
                    <ul>
                        <li>Contract performance (providing the ticketing service)</li>
                        <li>Legitimate interests (improving our service, security)</li>
                        <li>Consent (marketing communications, analytics)</li>
                    </ul>
                </div>

                <div className="privacy-section">
                    <h2>2. How We Use Your Information</h2>
                    <p>We use the information we collect to:</p>
                    <ul>
                        <li>Provide, maintain, and improve our services</li>
                        <li>Process and manage support tickets</li>
                        <li>Communicate with you about your account and tickets</li>
                        <li>Send you technical notices and security alerts</li>
                        <li>Monitor and analyze usage patterns and trends</li>
                        <li>Detect, prevent, and address security issues</li>
                        <li>Comply with legal obligations</li>
                    </ul>
                </div>

                <div className="privacy-section">
                    <h2>3. Information Sharing and Disclosure</h2>
                    <p>We do not sell your personal information. We may share your information in the following circumstances:</p>
                    <ul>
                        <li><strong>With Your Consent:</strong> We will share information when you explicitly agree</li>
                        <li><strong>Service Providers:</strong> Third-party vendors who provide services on our behalf (hosting, analytics, email delivery)</li>
                        <li><strong>Legal Requirements:</strong> When required by law or to protect rights and safety</li>
                        <li><strong>Business Transfers:</strong> In connection with mergers, acquisitions, or asset sales</li>
                    </ul>
                    
                    <div className="privacy-info-box">
                        <h3>Third-Party Services We Use</h3>
                        <ul>
                            <li>Firebase (Google Cloud) - Hosting and database</li>
                            <li>Email Service Provider - Notifications</li>
                        </ul>
                    </div>
                </div>

                <div className="privacy-section">
                    <h2>4. Data Security</h2>
                    <p>We implement appropriate technical and organizational security measures to protect your personal data:</p>
                    <ul>
                        <li><strong>Encryption:</strong> Data in transit (TLS/HTTPS) and at rest</li>
                        <li><strong>Access Control:</strong> Role-based access control (RBAC)</li>
                        <li><strong>Authentication:</strong> Secure password policies and optional MFA</li>
                        <li><strong>Audit Logging:</strong> Comprehensive activity tracking</li>
                        <li><strong>Regular Security Assessments:</strong> Penetration testing and vulnerability scanning</li>
                        <li><strong>Incident Response:</strong> Documented procedures for data breaches</li>
                    </ul>
                </div>

                <div className="privacy-section">
                    <h2>5. Your Rights (GDPR)</h2>
                    <p>You have the following rights regarding your personal data:</p>
                    
                    <ul className="privacy-rights-list">
                        <li><strong>Right to Access:</strong> Request a copy of your personal data</li>
                        <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                        <li><strong>Right to Erasure:</strong> Request deletion of your data ("Right to be Forgotten")</li>
                        <li><strong>Right to Data Portability:</strong> Receive your data in a machine-readable format</li>
                        <li><strong>Right to Restrict Processing:</strong> Limit how we use your data</li>
                        <li><strong>Right to Object:</strong> Object to processing based on legitimate interests</li>
                        <li><strong>Right to Withdraw Consent:</strong> Withdraw consent for consent-based processing</li>
                    </ul>

                    <p><strong>To exercise these rights:</strong> Visit the Settings → Data & Privacy (GDPR) section in your account.</p>
                </div>

                <div className="privacy-section">
                    <h2>6. Data Retention</h2>
                    <p>We retain your personal data only as long as necessary:</p>
                    <ul>
                        <li><strong>Active Tickets:</strong> Duration of ticket + 7 years (legal requirement)</li>
                        <li><strong>Resolved Tickets:</strong> 7 years from resolution</li>
                        <li><strong>User Accounts (Inactive):</strong> 3 years from last login</li>
                        <li><strong>Activity Logs:</strong> 7 years (audit requirement)</li>
                        <li><strong>Notifications:</strong> 1 year</li>
                        <li><strong>Deleted Accounts:</strong> Data anonymized within 30 days, retained for 7 years</li>
                    </ul>
                </div>

                <div className="privacy-section">
                    <h2>7. International Data Transfers</h2>
                    <p>
                        Your data may be transferred to and processed in countries other than your country of residence. 
                        We ensure appropriate safeguards are in place, including Standard Contractual Clauses (SCCs) 
                        approved by the European Commission.
                    </p>
                </div>

                <div className="privacy-section">
                    <h2>8. Children's Privacy</h2>
                    <p>
                        Our service is not intended for users under the age of 16. We do not knowingly collect personal 
                        data from children. If you believe we have inadvertently collected such data, please contact us immediately.
                    </p>
                </div>

                <div className="privacy-section">
                    <h2>9. Data Breach Notification</h2>
                    <p>
                        In the event of a personal data breach, we will notify affected users and the relevant supervisory 
                        authority within 72 hours of becoming aware of the breach, as required by GDPR Article 33.
                    </p>
                </div>

                <div className="privacy-section">
                    <h2>10. Changes to This Policy</h2>
                    <p>
                        We may update this Privacy Policy from time to time. We will notify you of significant changes by 
                        email or through the application. Your continued use of the service after such changes constitutes 
                        acceptance of the updated policy.
                    </p>
                </div>
            </div>

            <div className="privacy-footer">
                <p>© {new Date().getFullYear()} Sahayaon. All rights reserved.</p>
            </div>
        </div>
    );
};

export default PrivacyPolicyPage;
