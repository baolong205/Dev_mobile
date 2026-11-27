// Tạo hoặc cập nhật người dùng:
//   $env:USER_PASSWORD='...'; node scripts/createUser.js <username> <admin|viewer>
// Mật khẩu đọc từ biến môi trường để không lưu vào lịch sử shell dưới dạng tham số.
const mongoose = require('mongoose');
const { loadConfig } = require('../src/config/environment');
const { hashPassword, ROLES } = require('../src/services/authService');
const User = require('../src/models/User');

async function main() {
  const [username, role = 'viewer'] = process.argv.slice(2);
  const password = process.env.USER_PASSWORD;
  if (!username || !ROLES.includes(role) || !password) {
    console.error('Cách dùng: USER_PASSWORD=<mật khẩu> node scripts/createUser.js <username> <admin|viewer>');
    process.exitCode = 1; return;
  }
  const config = loadConfig();
  await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 5000 });
  try {
    const passwordHash = await hashPassword(password);
    // Đổi mật khẩu/vai trò => tăng tokenVersion để đăng xuất các phiên cũ.
    await User.findOneAndUpdate({ username: username.toLowerCase() },
      { $set: { passwordHash, role, disabled: false }, $inc: { tokenVersion: 1 } },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
    console.log(`Đã lưu người dùng "${username.toLowerCase()}" với vai trò ${role}.`);
  } finally { await mongoose.disconnect(); }
}
main().catch(error => { console.error('Không tạo được người dùng:', error.message); process.exitCode = 1; });
