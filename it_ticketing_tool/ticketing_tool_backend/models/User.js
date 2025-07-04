const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true }, // Use Firebase UID as string _id
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'read_only_admin', 'super_admin', 'user', 'support', 'site_admin'], required: true },
    active: { type: Boolean, default: true },
    loginActivity: { type: [Object], default: [] }, // Array of login activity objects
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema); 