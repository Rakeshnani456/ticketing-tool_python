const express = require('express');
const Busboy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

module.exports = (supabase, verifySupabaseToken) => {
    const router = express.Router();

    router.post('/', verifySupabaseToken, async (req, res) => {
        const busboy = Busboy({ headers: req.headers, limits: { fileSize: 10 * 1024 * 1024 } }); // Max 10MB per file

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
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            ];
            const allowedExtensions = [
                '.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'
            ];
            const fileUploadPromise = new Promise((resolve, reject) => {
                const isMimeTypeAllowed = mimetype && allowedMimeTypes.includes(mimetype);
                const isExtensionAllowed = fileExtension && allowedExtensions.includes(fileExtension);
                if (!isMimeTypeAllowed && !isExtensionAllowed) {
                    file.resume();
                    const errorMsg = `File type for ${originalFilename} not allowed. Detected MIME: "${mimetype}", Extension: "${fileExtension}". Allowed types: PDF, JPG, PNG, Word.`;
                    return reject(new Error(errorMsg));
                }
                const uniqueFilename = `${uuidv4()}${fileExtension}`;
                const filepath = path.join(os.tmpdir(), uniqueFilename);
                const writeStream = fs.createWriteStream(filepath);
                file.pipe(writeStream);
                writeStream.on('finish', async () => {
                    const destination = `attachments/${Date.now()}_${uniqueFilename}`;
                    try {
                        const { data, error } = await supabase.storage
                            .from('attachments')
                            .upload(destination, fs.createReadStream(filepath), {
                                contentType: mimetype,
                                metadata: {
                                    uploadedBy: req.user.email,
                                    originalFileName: originalFilename
                                }
                            });

                        if (error) throw error;

                        const { data: publicUrlData } = supabase.storage
                            .from('attachments')
                            .getPublicUrl(destination);

                        uploads.push({
                            originalFilename: originalFilename,
                            url: publicUrlData.publicUrl,
                            mimetype: mimetype,
                            added_at: new Date().toISOString()
                        });
                        fs.unlink(filepath, () => {});
                        resolve();
                    } catch (err) {
                        console.error("Error uploading file to Supabase Storage:", err);
                        fs.unlink(filepath, () => {});
                        reject(new Error(`Failed to upload file ${originalFilename}: ${err.message}`));
                    }
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