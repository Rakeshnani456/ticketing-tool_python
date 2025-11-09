// utils/emailToTicketService.js

const Imap = require('imap');
const { simpleParser } = require('mailparser');
const { v4: uuidv4 } = require('uuid');

/**
 * Email to Ticket Service
 * Monitors a specific email address and automatically creates tickets from incoming emails
 */
class EmailToTicketService {
    constructor(db, admin, ticketsCollection, usersCollection, clientsCollection, emailService) {
        this.db = db;
        this.admin = admin;
        this.ticketsCollection = ticketsCollection;
        this.usersCollection = usersCollection;
        this.clientsCollection = clientsCollection;
        this.emailService = emailService;
        this.imap = null;
        this.isProcessing = false;
        this.config = {
            user: process.env.TICKET_EMAIL_USER,
            password: process.env.TICKET_EMAIL_PASSWORD,
            host: process.env.TICKET_EMAIL_HOST || 'outlook.office365.com',
            port: process.env.TICKET_EMAIL_PORT || 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false }
        };
    }

    /**
     * Initialize IMAP connection
     */
    connect() {
        if (!this.config.user || !this.config.password) {
            console.error('❌ Email-to-Ticket service: Missing email credentials in environment variables');
            return false;
        }

        this.imap = new Imap(this.config);

        this.imap.once('ready', () => {
            console.log('✅ Email-to-Ticket service: IMAP connection ready');
        });

        this.imap.once('error', (err) => {
            console.error('❌ Email-to-Ticket service: IMAP error:', err);
        });

        this.imap.once('end', () => {
            console.log('📧 Email-to-Ticket service: IMAP connection ended');
        });

        return true;
    }

    /**
     * Process unread emails and create tickets
     */
    async processEmails() {
        if (this.isProcessing) {
            console.log('⏳ Email processing already in progress, skipping...');
            return { success: true, message: 'Already processing', processed: 0 };
        }

        this.isProcessing = true;
        let processedCount = 0;
        const results = [];

        try {
            if (!this.imap) {
                const connected = this.connect();
                if (!connected) {
                    throw new Error('Failed to initialize IMAP connection');
                }
            }

            const emails = await this.fetchUnreadEmails();
            console.log(`📧 Found ${emails.length} unread email(s) to process`);

            for (const email of emails) {
                try {
                    const result = await this.createTicketFromEmail(email);
                    results.push(result);
                    
                    if (result.success) {
                        processedCount++;
                        // Mark email as read after successful ticket creation
                        await this.markEmailAsRead(email.uid);
                    }
                } catch (error) {
                    console.error(`❌ Error processing email ${email.uid}:`, error);
                    results.push({
                        success: false,
                        email: email.from?.text || 'unknown',
                        error: error.message
                    });
                }
            }

            return {
                success: true,
                processed: processedCount,
                total: emails.length,
                results: results
            };

        } catch (error) {
            console.error('❌ Error in email processing:', error);
            return {
                success: false,
                error: error.message,
                processed: processedCount
            };
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Fetch unread emails from inbox
     */
    fetchUnreadEmails() {
        return new Promise((resolve, reject) => {
            this.imap.connect();

            this.imap.once('ready', () => {
                this.imap.openBox('INBOX', false, (err, box) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Search for unseen emails
                    this.imap.search(['UNSEEN'], (err, results) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        if (!results || results.length === 0) {
                            resolve([]);
                            this.imap.end();
                            return;
                        }

                        const fetch = this.imap.fetch(results, { bodies: '' });
                        const emails = [];

                        fetch.on('message', (msg, seqno) => {
                            let buffer = '';
                            let uid = null;

                            msg.on('body', (stream, info) => {
                                stream.on('data', (chunk) => {
                                    buffer += chunk.toString('utf8');
                                });
                            });

                            msg.once('attributes', (attrs) => {
                                uid = attrs.uid;
                            });

                            msg.once('end', async () => {
                                try {
                                    const parsed = await simpleParser(buffer);
                                    parsed.uid = uid;
                                    emails.push(parsed);
                                } catch (error) {
                                    console.error('Error parsing email:', error);
                                }
                            });
                        });

                        fetch.once('error', (err) => {
                            reject(err);
                        });

                        fetch.once('end', () => {
                            this.imap.end();
                            resolve(emails);
                        });
                    });
                });
            });

            this.imap.once('error', (err) => {
                reject(err);
            });
        });
    }

    /**
     * Mark email as read
     */
    markEmailAsRead(uid) {
        return new Promise((resolve, reject) => {
            if (!this.imap || this.imap.state !== 'authenticated') {
                // IMAP connection already closed, skip marking as read
                resolve();
                return;
            }

            this.imap.addFlags(uid, ['\\Seen'], (err) => {
                if (err) {
                    console.error('Error marking email as read:', err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Create ticket from email
     */
    async createTicketFromEmail(email) {
        try {
            const senderEmail = email.from?.value?.[0]?.address || email.from?.text;
            
            if (!senderEmail) {
                throw new Error('No sender email found');
            }

            console.log(`📧 Processing email from: ${senderEmail}`);

            // Lookup client based on email domain or user account
            const clientName = await this.lookupClient(senderEmail);
            
            // Get subject and body
            const subject = email.subject || 'No Subject';
            const shortDescription = subject.length > 250 ? subject.substring(0, 247) + '...' : subject;
            const longDescription = email.text || email.html || '';

            // Generate display ID
            const displayId = await this.generateDisplayId();

            // Find or create a system user for email-generated tickets
            const systemUserId = await this.getSystemUserId();

            // Create ticket data
            const ticketData = {
                display_id: displayId,
                reporter_id: systemUserId,
                reporter_email: senderEmail,
                reporter_name: email.from?.value?.[0]?.name || senderEmail,
                reporter_firstName: null,
                reporter_lastName: null,
                request_for_email: senderEmail, // Same as sender
                category: 'troubleshoot', // Default category
                short_description: shortDescription,
                long_description: longDescription,
                contact_number: 'N/A', // Default value
                priority: 'Low', // Default priority
                hostname_asset_id: 'Email-Generated', // Default hostname
                status: 'Open',
                created_at: this.admin.firestore.FieldValue.serverTimestamp(),
                updated_at: this.admin.firestore.FieldValue.serverTimestamp(),
                comments: [],
                attachments: [],
                assigned_to_id: null,
                assigned_to_email: null,
                resolved_at: null,
                time_spent_minutes: null,
                closure_notes: null,
                status_history: [],
                assigned_to_history: [],
                notes: [],
                client_name: clientName,
                source: 'email', // Mark this ticket as email-generated
                original_email_date: email.date ? email.date.toISOString() : new Date().toISOString()
            };

            // Process attachments if any
            if (email.attachments && email.attachments.length > 0) {
                console.log(`📎 Processing ${email.attachments.length} attachment(s)`);
                const processedAttachments = await this.processAttachments(email.attachments);
                ticketData.attachments = processedAttachments;
            }

            // Add ticket to database
            const docRef = await this.ticketsCollection.add(ticketData);
            console.log(`✅ Ticket created successfully: ${displayId} (ID: ${docRef.id})`);

            // Send notification email to distribution list
            try {
                await this.emailService.sendTicketNotificationEmail({
                    ticketId: displayId,
                    subject: shortDescription,
                    description: longDescription,
                    priority: 'Low',
                    category: 'troubleshoot',
                    reporterName: senderEmail,
                    ticketUrl: `${process.env.FRONTEND_URL || 'https://ticketingtoolv2.web.app'}/tickets/${docRef.id}`,
                    toEmail: process.env.DISTRIBUTION_EMAIL || 'support@sahayaon.com',
                    ccEmail: senderEmail
                });
            } catch (emailError) {
                console.error('❌ Error sending notification email:', emailError);
            }

            return {
                success: true,
                ticketId: docRef.id,
                displayId: displayId,
                email: senderEmail,
                subject: subject
            };

        } catch (error) {
            console.error('❌ Error creating ticket from email:', error);
            throw error;
        }
    }

    /**
     * Lookup client based on email address
     */
    async lookupClient(email) {
        try {
            // First, try to find user by email
            const userQuery = await this.usersCollection
                .where('email', '==', email)
                .limit(1)
                .get();

            if (!userQuery.empty) {
                const userData = userQuery.docs[0].data();
                if (userData.client_name) {
                    console.log(`✅ Found client from user: ${userData.client_name}`);
                    return userData.client_name;
                }
            }

            // If not found, try to match by email domain
            const emailDomain = email.split('@')[1];
            if (emailDomain) {
                const clientQuery = await this.clientsCollection
                    .where('domain', '==', emailDomain)
                    .limit(1)
                    .get();

                if (!clientQuery.empty) {
                    const clientData = clientQuery.docs[0].data();
                    console.log(`✅ Found client from domain: ${clientData.client_name}`);
                    return clientData.client_name;
                }
            }

            console.log('⚠️ No client found for email, using default');
            return 'Email-Generated'; // Default client name

        } catch (error) {
            console.error('Error looking up client:', error);
            return 'Email-Generated';
        }
    }

    /**
     * Get or create system user for email-generated tickets
     */
    async getSystemUserId() {
        try {
            const systemEmail = 'system@sahayaon.com';
            
            // Check if system user exists
            const userQuery = await this.usersCollection
                .where('email', '==', systemEmail)
                .limit(1)
                .get();

            if (!userQuery.empty) {
                return userQuery.docs[0].id;
            }

            // Create system user if doesn't exist
            try {
                const userRecord = await this.admin.auth().createUser({
                    email: systemEmail,
                    password: uuidv4(), // Random password
                    displayName: 'System (Email Bot)',
                    disabled: true // Disable login for system user
                });

                await this.usersCollection.doc(userRecord.uid).set({
                    email: systemEmail,
                    role: 'user',
                    firstName: 'System',
                    lastName: 'Email Bot',
                    client_name: 'System',
                    created_at: this.admin.firestore.FieldValue.serverTimestamp()
                });

                console.log('✅ System user created for email-to-ticket service');
                return userRecord.uid;

            } catch (authError) {
                // If user already exists in auth but not in Firestore
                if (authError.code === 'auth/email-already-exists') {
                    const existingUser = await this.admin.auth().getUserByEmail(systemEmail);
                    return existingUser.uid;
                }
                throw authError;
            }

        } catch (error) {
            console.error('Error getting system user:', error);
            throw error;
        }
    }

    /**
     * Generate display ID for ticket
     */
    async generateDisplayId() {
        try {
            const counterRef = this.db.collection('counters').doc('ticket_display_id');
            
            const result = await this.db.runTransaction(async (transaction) => {
                const counterDoc = await transaction.get(counterRef);
                
                let nextNumber = 1;
                
                if (counterDoc.exists) {
                    const counterData = counterDoc.data();
                    nextNumber = (counterData.count || 0) + 1;
                } else {
                    console.log('⚠️ Counter document does not exist, starting from 1');
                }
                
                if (nextNumber > 999999) {
                    nextNumber = 1;
                }
                
                transaction.set(counterRef, { 
                    count: nextNumber,
                    last_updated: this.admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
                
                return nextNumber;
            });
            
            const displayId = `TT${result.toString().padStart(6, '0')}`;
            console.log(`🎫 Generated display ID: ${displayId}`);
            return displayId;
            
        } catch (error) {
            console.error('Error generating display ID:', error);
            
            // Fallback
            const lastTicketQuery = await this.ticketsCollection
                .orderBy('display_id', 'desc')
                .limit(1)
                .get();
            
            let nextNumber = 1;
            
            if (!lastTicketQuery.empty) {
                const lastTicket = lastTicketQuery.docs[0].data();
                const lastDisplayId = lastTicket.display_id;
                
                if (lastDisplayId && lastDisplayId.startsWith('TT')) {
                    const numberPart = lastDisplayId.substring(2);
                    const lastNumber = parseInt(numberPart, 10);
                    if (!isNaN(lastNumber) && lastNumber > 0) {
                        nextNumber = lastNumber + 1;
                    }
                }
            }
            
            if (nextNumber > 999999) {
                nextNumber = 1;
            }
            
            const displayId = `TT${nextNumber.toString().padStart(6, '0')}`;
            return displayId;
        }
    }

    /**
     * Process email attachments
     */
    async processAttachments(attachments) {
        const processedAttachments = [];

        for (const attachment of attachments) {
            try {
                // For now, we'll store attachment metadata
                // In a production environment, you'd upload to Firebase Storage
                processedAttachments.push({
                    originalFilename: attachment.filename,
                    size: attachment.size,
                    mimetype: attachment.contentType,
                    added_at: new Date().toISOString(),
                    note: 'Attachment received via email (not uploaded to storage)'
                });
                
                console.log(`📎 Processed attachment: ${attachment.filename} (${attachment.size} bytes)`);
            } catch (error) {
                console.error(`❌ Error processing attachment ${attachment.filename}:`, error);
            }
        }

        return processedAttachments;
    }

    /**
     * Stop the service and close connections
     */
    stop() {
        if (this.imap) {
            this.imap.end();
            console.log('📧 Email-to-Ticket service stopped');
        }
    }
}

module.exports = EmailToTicketService;

