const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { getDB } = require('../database');

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'public', 'uploads'),
    filename(req, file, cb) {
      cb(null, 'avatar-' + crypto.randomBytes(8).toString('hex') + path.extname(file.originalname).toLowerCase());
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, ['.jpg','.jpeg','.png','.gif','.webp'].includes(ext));
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'photowall-secret-key-2024';
const JWT_EXPIRES = '7d';

function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: '未登录' });
  try {
    req.user = jwt.verify(header.split(' ')[1], JWT_SECRET);
    // 检查用户是否被禁用
    const db = getDB();
    const u = db.prepare('SELECT status FROM users WHERE id=?').get(req.user.id);
    if (!u) return res.status(401).json({ error: '用户不存在' });
    if (u.status !== 'active') return res.status(403).json({ error: '账号未激活，请等待管理员审核' });
    next();
  } catch(e) { return res.status(401).json({ error: '登录已过期' }); }
}

function adminMiddleware(req, res, next) {
  const db = getDB();
  const u = db.prepare('SELECT role FROM users WHERE id=?').get(req.user.id);
  if (!u || u.role !== 'admin') return res.status(403).json({ error: '需要管理员权限' });
  next();
}

// 注册
router.post('/register', (req, res) => {
  const db = getDB();
  const { username, email, password, invite_code } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: '请填写所有必填字段' });
  if (!invite_code) return res.status(400).json({ error: '需要邀请码才能注册' });
  if (password.length < 6) return res.status(400).json({ error: '密码至少6位' });

  // 验证邀请码
  const invite = db.prepare('SELECT * FROM invites WHERE code=?').get(invite_code.toUpperCase());
  if (!invite) return res.status(400).json({ error: '邀请码无效' });
  if (invite.use_count >= invite.max_uses) return res.status(400).json({ error: '邀请码已用完' });

  const existing = db.prepare('SELECT id FROM users WHERE username=? OR email=?').get(username, email);
  if (existing) return res.status(409).json({ error: '用户名或邮箱已存在' });

  const hash = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users(username,email,password_hash,status) VALUES(?,?,?,?)')
    .run(username, email, hash, 'pending');

  // 标记邀请码使用
  db.prepare('UPDATE invites SET use_count=use_count+1, used_by=?, used_at=datetime("now") WHERE id=?')
    .run(r.lastInsertRowid, invite.id);

  // 通知管理员
  const admins = db.prepare("SELECT id FROM users WHERE role='admin'").all();
  admins.forEach(a => {
    db.prepare('INSERT INTO notifications(user_id,type,message,related_id) VALUES(?,?,?,?)')
      .run(a.id, 'new_user', `新用户 ${username} 申请注册，等待审核`, r.lastInsertRowid);
  });

  res.json({ ok: true, msg: '注册成功！请等待管理员审核通过后登录。' });
});

// 登录
router.post('/login', (req, res) => {
  const db = getDB();
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username=? OR email=?').get(username, username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  if (user.status === 'pending') return res.status(403).json({ error: '账号正在等待管理员审核' });
  if (user.status === 'rejected') return res.status(403).json({ error: '账号已被拒绝，请联系管理员' });

  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
  res.json({ token, user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar, bio: user.bio, role: user.role } });
});

// 当前用户
router.get('/me', authMiddleware, (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id,username,email,avatar,bio,role,status,created_at FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });

  // 未读通知数
  const unread = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE user_id=? AND is_read=0').get(req.user.id);
  res.json({ user, unreadCount: unread?.c || 0 });
});

// 更新资料（头像上传 + 签名）
router.put('/profile', authMiddleware, avatarUpload.single('avatar'), (req, res) => {
  const db = getDB();
  const bio = req.body.bio || '';
  const avatar = req.file ? '/uploads/' + req.file.filename : req.body.avatar || '';
  if (req.file) {
    // 删除旧头像
    const old = db.prepare('SELECT avatar FROM users WHERE id=?').get(req.user.id);
    if (old?.avatar && old.avatar.startsWith('/uploads/avatar-')) {
      try { require('fs').unlinkSync(path.join(__dirname, '..', 'public', old.avatar)); } catch(e) {}
    }
  }
  db.prepare('UPDATE users SET avatar=?, bio=? WHERE id=?').run(avatar, bio, req.user.id);
  res.json({ ok: true, avatar });
});

// 修改密码
router.put('/password', authMiddleware, (req, res) => {
  const db = getDB();
  const { old_password, new_password } = req.body;
  const user = db.prepare('SELECT password_hash FROM users WHERE id=?').get(req.user.id);
  if (!bcrypt.compareSync(old_password, user.password_hash)) return res.status(400).json({ error: '原密码错误' });
  if (new_password.length < 6) return res.status(400).json({ error: '新密码至少6位' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(new_password, 10), req.user.id);
  res.json({ ok: true });
});

// 通知列表
router.get('/notifications', authMiddleware, (req, res) => {
  const db = getDB();
  const list = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 50').all(req.user.id);
  res.json({ notifications: list });
});

// 标记通知已读
router.put('/notifications/:id/read', authMiddleware, (req, res) => {
  const db = getDB();
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ ok: true });
});

module.exports = router;
module.exports.authMiddleware = authMiddleware;
module.exports.adminMiddleware = adminMiddleware;
