const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

module.exports = (admin, authenticateToken) => {
    const router = express.Router();

    router.post('/', authenticateToken, async (req, res) => {
        if (!admin.storage()) {
            console.error("Firebase Storage not initialized.");
            if (!res.headersSent) {
                return res.status(500).json({ error: "Firebase Storage not configured on the server." });
            }
            return;
        }

        const busboy = Busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } }); // Max 10MB per file
        const bucket = admin.storage().bucket();

        const uploads = [];
        const filePromises = [];
        let responseSent = false;
        const sendResponse = (statusCode, data) => {
            if (!responseSent) {
                responseSent = true;
                return res.status(statusCode).json(data);
            }
        };

        busboy.on('file', (fieldname, file, filenameInfo) => {
            if (responseSent) {
                file.resume();
                return;
            }
            const { filename: originalFilename, encoding, mimetype } = filenameInfo;
            const fileExtension = path.extname(originalFilename).toLowerCase();
            const allowedMimeTypes = [
                'application/pdf',
                'image/jpeg',
                'image/png',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/zip',
                'application/x-zip-compressed'
            ];
            const allowedExtensions = [
                '.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx', '.xls', '.xlsx', '.zip'
            ];
            const fileUploadPromise = new Promise((resolve, reject) => {
                const isMimeTypeAllowed = mimetype && allowedMimeTypes.includes(mimetype);
                const isExtensionAllowed = fileExtension && allowedExtensions.includes(fileExtension);
                if (!isMimeTypeAllowed && !isExtensionAllowed) {
                    file.resume();
                    const errorMsg = `File type for ${originalFilename} not allowed. Detected MIME: "${mimetype}", Extension: "${fileExtension}". Allowed types: PNG, JPG, PDF, Word, Excel, ZIP.`;
                    return reject(new Error(errorMsg));
                }
                const uniqueFilename = `${uuidv4()}${fileExtension}`;
                const filepath = path.join(os.tmpdir(), uniqueFilename);
                const writeStream = fs.createWriteStream(filepath);
                file.pipe(writeStream);
                writeStream.on('finish', () => {
                    const destination = `attachments/${Date.now()}_${uniqueFilename}`;
                    bucket.upload(filepath, {
                        destination: destination,
                        metadata: {
                            contentType: mimetype,
                            metadata: {
                                firebaseStorageDownloadTokens: uuidv4(),
                                uploadedBy: req.user.email,
                                originalFileName: originalFilename
                            }
                        }
                    })
                    .then(() => {
                        const fileRef = bucket.file(destination);
                        return fileRef.makePublic();
                    })
                    .then(() => {
                        const publicUrl = `https://storage.googleapis.com/${bucket.name}/${destination}`;
                        uploads.push({
                            originalFilename: originalFilename,
                            url: publicUrl,
                            mimetype: mimetype,
                            added_at: new Date().toISOString()
                        });
                        fs.unlink(filepath, () => {});
                        resolve();
                    })
                    .catch(err => {
                        console.error("Error uploading file to Firebase Storage:", err);
                        fs.unlink(filepath, () => {});
                        reject(new Error(`Failed to upload file ${originalFilename}: ${err.message}`));
                    });
                });
                writeStream.on('error', (err) => {
                    fs.unlink(filepath, () => {});
                    reject(new Error(`Failed to write file ${originalFilename} to disk: ${err.message}`));
                });
                file.on('limit', () => {
                    fs.unlink(filepath, () => {});
                    file.resume();
                    reject(new Error(`File ${originalFilename} exceeds the 10MB limit.`));
                });
            });
            filePromises.push(fileUploadPromise);
        });
        busboy.on('finish', async () => {
            if (responseSent) return;
            try {
                const results = await Promise.allSettled(filePromises);
                const failedUploads = [];
                results.forEach((result) => {
                    if (result.status !== 'fulfilled') {
                        failedUploads.push(result.reason.message);
                    }
                });
                if (failedUploads.length > 0) {
                    const errorMessage = `Some files failed to upload: ${failedUploads.join('; ')}`;
                    sendResponse(400, { error: errorMessage, files: uploads });
                } else if (uploads.length > 0) {
                    sendResponse(200, { message: 'Files uploaded successfully', files: uploads });
                } else {
                    sendResponse(400, { error: 'No files were uploaded or processed.' });
                }
            } catch (error) {
                console.error('Busboy finish processing error:', error);
                sendResponse(500, { error: `An unexpected error occurred during file processing: ${error.message}` });
            }
        });
        busboy.on('error', (error) => {
            console.error('Busboy parsing error:', error);
            sendResponse(500, { error: `File upload parsing error: ${error.message}` });
        });
        req.pipe(busboy);
    });

    return router;
}; 
