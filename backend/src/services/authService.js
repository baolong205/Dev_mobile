const crypto = require('node:crypto');
const { promisify } = require('node:util');
const jwt = require('jsonwebtoken');
const { httpError } = require('./sensorService');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const ROLES = ['admin', 'viewer'];

async function hashPassword(password) {
  validatePassword(password);
  const salt = crypto.randomBytes(16);
  const key = await scrypt(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64')}$${key.toString('base64')}`;
}
async function verifyPassword(password, stored) {
  const [scheme, salt, hash] = String(stored || '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash || typeof password !== 'string') return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length);
  return crypto.timingSafeEqual(actual, expected);
}
function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8 || password.length > 128) {
    throw httpError(400, 'INVALID_PASSWORD', 'Mật khẩu phải có từ 8 đến 128 ký tự.');
  }
}

/**
 * users: { findByUsername(name), findById(id), count(), create({ username, passwordHash, role }) }
 * Mặc định dùng Mongoose model User; test có thể truyền repository giả.
 */
function createAuth({ secret, expiresIn = '12h', users = mongoUsers() }) {
  if (typeof secret !== 'string' || secret.length < 32) throw new Error('JWT_SECRET must be at least 32 characters');
  // Hash giả để so sánh khi username không tồn tại: thời gian phản hồi như nhau.
  const dummyHash = hashPassword('dummy-password-for-timing');

  function sign(user) {
    return jwt.sign({ sub: String(user._id), role: user.role, ver: user.tokenVersion ?? 0 }, secret,
      { algorithm: 'HS256', expiresIn, issuer: 'smartstore' });
  }
  async function verify(token) {
    let claims;
    try { claims = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'smartstore' }); }
    catch { throw httpError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.'); }
    const user = await users.findById(claims.sub);
    if (!user || user.disabled || (user.tokenVersion ?? 0) !== claims.ver) {
      throw httpError(401, 'INVALID_TOKEN', 'Phiên đăng nhập không còn hiệu lực.');
    }
    return publicUser(user);
  }
  async function login(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string' || !username || password.length > 128) {
      throw httpError(400, 'INVALID_CREDENTIALS', 'Thiếu tên đăng nhập hoặc mật khẩu.');
    }
    const user = await users.findByUsername(username.trim().toLowerCase());
    const valid = await verifyPassword(password, user?.passwordHash || await dummyHash);
    if (!user || !valid || user.disabled) throw httpError(401, 'INVALID_CREDENTIALS', 'Sai tên đăng nhập hoặc mật khẩu.');
    return { token: sign(user), user: publicUser(user) };
  }
  async function ensureAdmin(username, password) {
    if (await users.count() > 0) return false;
    if (!password) {
      console.warn('[AUTH] Chưa có người dùng nào. Đặt ADMIN_PASSWORD để tạo tài khoản admin đầu tiên.');
      return false;
    }
    await users.create({ username: username.toLowerCase(), passwordHash: await hashPassword(password), role: 'admin' });
    console.log(`[AUTH] Đã tạo tài khoản admin "${username}".`);
    return true;
  }

  const bearer = header => (typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() : '');
  /** Express middleware: bắt buộc token hợp lệ, gắn req.user. */
  const authenticate = (req, _res, next) => {
    const token = bearer(req.headers.authorization);
    if (!token) return next(httpError(401, 'AUTH_REQUIRED', 'Vui lòng đăng nhập.'));
    verify(token).then(user => { req.user = user; next(); }, next);
  };
  /** Express middleware: chỉ cho phép các vai trò được liệt kê. */
  const requireRole = (...roles) => (req, _res, next) =>
    next(req.user && roles.includes(req.user.role) ? undefined : httpError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.'));

  return { login, verify, sign, ensureAdmin, authenticate, requireRole };
}

function publicUser(user) {
  return { id: String(user._id), username: user.username, role: user.role };
}
function mongoUsers() {
  const User = () => require('../models/User');
  const { requireDatabase } = require('./sensorService');
  return {
    findByUsername: username => { requireDatabase(); return User().findOne({ username }).lean(); },
    findById: id => { requireDatabase(); return /^[a-f\d]{24}$/i.test(id) ? User().findById(id).lean() : null; },
    count: () => { requireDatabase(); return User().estimatedDocumentCount(); },
    create: data => User().create(data)
  };
}

module.exports = { createAuth, hashPassword, verifyPassword, ROLES };
