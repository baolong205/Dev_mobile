const mongoose = require('mongoose');

const ROLES = ['admin', 'viewer'];
const schema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, match: /^[a-z0-9._-]{3,32}$/ },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ROLES, default: 'viewer', required: true },
  // Tăng khi đổi mật khẩu/khóa tài khoản để vô hiệu hóa token cũ.
  tokenVersion: { type: Number, default: 0 },
  disabled: { type: Boolean, default: false }
}, { timestamps: true, bufferCommands: false });

module.exports = mongoose.models.User || mongoose.model('User', schema);
module.exports.ROLES = ROLES;
