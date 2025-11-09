// components/legal/TermsOfServicePage.js
import React from 'react';
import './TermsOfServicePage.css';

const TermsOfServicePage = () => {
    const lastUpdated = "October 21, 2025";

    return (
        <div className="terms-page">
            <div className="terms-header">
                <div className="terms-header-content">
                    <h1>Terms of Service</h1>
                    <p className="terms-last-updated">Last Updated: {lastUpdated}</p>
                    <div className="terms-compliance">Legally Binding Agreement</div>
                </div>
            </div>

            <div className="terms-container">
                <p className="terms-intro">
                    Welcome to Sahayaon. By accessing or using our service, you agree to be bound by these 
                    Terms of Service. Please read them carefully before using our platform.
                </p>

                <div className="terms-section">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By creating an account or using Sahayaon, you acknowledge that you have read, understood, 
                        and agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these 
                        terms, you must not use our service.
                    </p>
                </div>

                <div className="terms-section">
                    <h2>2. Description of Service</h2>
                    <p>Sahayaon provides:</p>
                    <ul>
                        <li>Issue tracking and ticket management</li>
                        <li>Multi-user collaboration and assignment</li>
                        <li>Real-time notifications and updates</li>
                        <li>Knowledge base and documentation</li>
                        <li>Analytics and reporting features</li>
                        <li>Role-based access control</li>
                    </ul>
                </div>

                <div className="terms-section">
                    <h2>3. User Accounts and Registration</h2>
                    <h3>Account Creation</h3>
                    <p>To use our service, you must:</p>
                    <ul>
                        <li>Provide accurate and complete registration information</li>
                        <li>Be at least 16 years of age</li>
                        <li>Maintain the security of your account credentials</li>
                        <li>Accept responsibility for all activities under your account</li>
                    </ul>

                    <h3>Account Security</h3>
                    <p>You are responsible for:</p>
                    <ul>
                        <li>Maintaining the confidentiality of your password</li>
                        <li>Notifying us immediately of any unauthorized access</li>
                        <li>Ensuring your account information remains current and accurate</li>
                    </ul>
                </div>

                <div className="terms-section">
                    <h2>4. Acceptable Use Policy</h2>
                    <p>You agree NOT to:</p>
                    <ul>
                        <li>Use the service for any unlawful purpose</li>
                        <li>Upload malicious code, viruses, or harmful content</li>
                        <li>Attempt to gain unauthorized access to our systems</li>
                        <li>Interfere with or disrupt the service or servers</li>
                        <li>Harass, abuse, or harm other users</li>
                        <li>Impersonate any person or entity</li>
                        <li>Collect or harvest user data without consent</li>
                        <li>Use automated systems (bots) without authorization</li>
                    </ul>

                    <div className="terms-info-box">
                        <h3>Violation Consequences</h3>
                        <p>
                            Violations may result in immediate account suspension or termination, removal of content, 
                            and potential legal action.
                        </p>
                    </div>
                </div>

                <div className="terms-section">
                    <h2>5. Intellectual Property Rights</h2>
                    <h3>Our Rights</h3>
                    <p>
                        All content, features, and functionality of Sahayaon, including but not limited to 
                        software, text, graphics, logos, and design, are owned by us and protected by copyright, trademark, 
                        and other intellectual property laws.
                    </p>

                    <h3>Your Content</h3>
                    <p>
                        You retain ownership of content you submit (tickets, comments, attachments). By submitting content, 
                        you grant us a license to use, store, and display that content as necessary to provide the service.
                    </p>
                </div>

                <div className="terms-section">
                    <h2>6. Data Privacy and Protection</h2>
                    <p>
                        We are committed to protecting your privacy in compliance with GDPR and ISO-27001 standards. 
                        Please review our <strong>Privacy Policy</strong> for detailed information about how we collect, 
                        use, and protect your data.
                    </p>
                    <ul>
                        <li>We encrypt data in transit and at rest</li>
                        <li>We implement role-based access control</li>
                        <li>We conduct regular security audits</li>
                        <li>We notify users of data breaches within 72 hours</li>
                    </ul>
                </div>

                <div className="terms-section">
                    <h2>7. Service Availability and Modifications</h2>
                    <h3>Uptime and Availability</h3>
                    <p>
                        We strive to maintain high service availability but do not guarantee uninterrupted access. 
                        Scheduled maintenance will be communicated in advance when possible.
                    </p>

                    <h3>Modifications to Service</h3>
                    <p>
                        We reserve the right to modify, suspend, or discontinue any aspect of the service at any time. 
                        We will provide reasonable notice for significant changes.
                    </p>
                </div>

                <div className="terms-section">
                    <h2>8. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
                        special, consequential, or punitive damages, including but not limited to loss of profits, 
                        data, or goodwill, arising from:
                    </p>
                    <ul>
                        <li>Your use or inability to use the service</li>
                        <li>Unauthorized access to your account or data</li>
                        <li>Service interruptions or errors</li>
                        <li>Third-party conduct or content</li>
                    </ul>
                </div>

                <div className="terms-section">
                    <h2>9. Indemnification</h2>
                    <p>
                        You agree to indemnify and hold harmless Sahayaon, its affiliates, and their 
                        respective officers, directors, employees, and agents from any claims, damages, losses, 
                        liabilities, and expenses arising from:
                    </p>
                    <ul>
                        <li>Your violation of these Terms of Service</li>
                        <li>Your violation of any rights of another party</li>
                        <li>Your use of the service</li>
                    </ul>
                </div>

                <div className="terms-section">
                    <h2>10. Termination</h2>
                    <h3>Your Rights</h3>
                    <p>
                        You may terminate your account at any time through the Settings → Data & Privacy section 
                        or by contacting support.
                    </p>

                    <h3>Our Rights</h3>
                    <p>We may suspend or terminate your access if:</p>
                    <ul>
                        <li>You violate these Terms of Service</li>
                        <li>You engage in fraudulent or illegal activity</li>
                        <li>Your account has been inactive for an extended period</li>
                        <li>Required by law or regulatory authority</li>
                    </ul>

                    <h3>Effect of Termination</h3>
                    <p>
                        Upon termination, your right to use the service ceases immediately. We will handle your data 
                        according to our Privacy Policy and data retention policies.
                    </p>
                </div>

                <div className="terms-section">
                    <h2>11. Dispute Resolution</h2>
                    <p>
                        Any disputes arising from these Terms or your use of the service will be resolved through 
                        binding arbitration, except where prohibited by law. You retain the right to bring claims 
                        in small claims court.
                    </p>
                </div>

                <div className="terms-section">
                    <h2>12. Governing Law</h2>
                    <p>
                        These Terms shall be governed by and construed in accordance with the laws of the jurisdiction 
                        in which our company is registered, without regard to conflict of law principles.
                    </p>
                </div>

                <div className="terms-section">
                    <h2>13. Changes to Terms</h2>
                    <p>
                        We may update these Terms of Service from time to time. We will notify you of material changes 
                        by email or through a prominent notice in the application. Your continued use of the service 
                        after such changes constitutes acceptance of the updated terms.
                    </p>
                </div>

                <div className="terms-section">
                    <h2>14. Severability</h2>
                    <p>
                        If any provision of these Terms is found to be unenforceable or invalid, that provision will be 
                        limited or eliminated to the minimum extent necessary, and the remaining provisions will remain 
                        in full force and effect.
                    </p>
                </div>

                <div className="terms-section">
                    <h2>15. Entire Agreement</h2>
                    <p>
                        These Terms of Service, together with our Privacy Policy, constitute the entire agreement between 
                        you and us regarding the use of our service and supersede all prior agreements and understandings.
                    </p>
                </div>
            </div>

            <div className="terms-footer">
                <p>© 2025 Kriasol Technologies LLP. All rights reserved.</p>
            </div>
        </div>
    );
};

export default TermsOfServicePage;
