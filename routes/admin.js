const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { getDB } = require('../database');
const { authMiddleware, adminMiddleware } = require('./auth');

// 所有路由都需要管理员权限
router.use(authMiddleware, adminMiddleware);

// 统计数据
router.get('/stats', (req, res) => {
  const db = getDB();
  const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get();
  const activeUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE status='active'").get();
  const pendingUsers = db.prepare("SELECT COUNT(*) as c FROM users WHERE status='pending'").get();
  const totalPhotos = db.prepare('SELECT COUNT(*) as c FROM photos').get();
  const totalComments = db.prepare('SELECT COUNT(*) as c FROM comments').get();
  const totalLikes = db.prepare('SELECT COUNT(*) as c FROM likes').get();
  res.json({
    totalUsers: totalUsers?.c || 0,
    activeUsers: activeUsers?.c || 0,
    pendingUsers: pendingUsers?.c || 0,
    totalPhotos: totalPhotos?.c || 0,
    totalComments: totalComments?.c || 0,
    totalLikes: totalLikes?.c || 0
  });
});

// 用户列表
router.get('/users', (req, res) => {
  const db = getDB();
  const { status, search, page = 1 } = req.query;
  const offset = (page - 1) * 20;
  let where = 'WHERE 1=1'; const params = [];

  if (status && status !== 'all') { where += ' AND status=?'; params.push(status); }
  if (search) { where += ' AND (username LIKE ? OR email LIKE ?)'; params.push('%'+search+'%', '%'+search+'%'); }

  const users = db.prepare(`
    SELECT u.*, (SELECT COUNT(*) FROM photos p WHERE p.user_id=u.id) as photo_count
    FROM users u ${where} ORDER BY u.created_at DESC LIMIT 20 OFFSET ?
  `).all(...params, offset);

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM users u ${where}`).get(...params) || { total: 0 };
  res.json({ users, total, page: Number(page) });
});

// 审核用户
router.put('/users/:id/status', (req, res) => {
  const db = getDB();
  const { status } = req.body;
  if (!['active', 'rejected'].includes(status)) return res.status(400).json({ error: '状态无效' });

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.role === 'admin' && status === 'rejected') return res.status(400).json({ error: '不能拒绝管理员' });

  db.prepare('UPDATE users SET status=? WHERE id=?').run(status, req.params.id);

  // 通知用户
  const msg = status === 'active' ? '你的账号已通过审核，欢迎加入照片墙！' : '你的注册申请已被拒绝';
  db.prepare('INSERT INTO notifications(user_id,type,message,related_id) VALUES(?,?,?,?)')
    .run(user.id, 'review', msg, user.id);

  res.json({ ok: true });
});

// 设置/取消管理员
router.put('/users/:id/role', (req, res) => {
  const db = getDB();
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) return res.status(400).json({ error: '角色无效' });

  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: '用户不存在' });
  if (user.id === req.user.id && role === 'user') return res.status(400).json({ error: '不能取消自己的管理员权限' });

  db.prepare('UPDATE users SET role=? WHERE id=?').run(role, req.params.id);
  res.json({ ok: true });
});

// 邀请码列表
router.get('/invites', (req, res) => {
  const db = getDB();
  const invites = db.prepare(`
    SELECT i.*, u.username as creator_name,
      u2.username as used_by_name
    FROM invites i
    LEFT JOIN users u ON i.created_by=u.id
    LEFT JOIN users u2 ON i.used_by=u2.id
    ORDER BY i.created_at DESC
  `).all();
  res.json({ invites });
});

// 生成邀请码
router.post('/invites', (req, res) => {
  const db = getDB();
  const { count = 1, max_uses = 1 } = req.body;
  const codes = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase().substring(0, 8);
    db.prepare('INSERT INTO invites(code,created_by,max_uses) VALUES(?,?,?)').run(code, req.user.id, max_uses);
    codes.push(code);
  }

  res.json({ codes, ok: true });
});

// 删除照片（管理员）
router.delete('/photos/:id', (req, res) => {
  const db = getDB();
  const photo = db.prepare('SELECT * FROM photos WHERE id=?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: '照片不存在' });

  const fs = require('fs');
  const path = require('path');
  try { fs.unlinkSync(path.join(__dirname, '..', 'public', 'uploads', photo.filename)); } catch(e) {}

  db.prepare('DELETE FROM comments WHERE photo_id=?').run(photo.id);
  db.prepare('DELETE FROM likes WHERE photo_id=?').run(photo.id);
  db.prepare('DELETE FROM photos WHERE id=?').run(photo.id);

  // 通知作者
  db.prepare('INSERT INTO notifications(user_id,type,message,related_id) VALUES(?,?,?,?)')
    .run(photo.user_id, 'admin', '管理员删除了你的一张照片', photo.id);

  res.json({ ok: true });
});

// 删除评论（管理员）
router.delete('/comments/:id', (req, res) => {
  const db = getDB();
  const comment = db.prepare('SELECT * FROM comments WHERE id=?').get(req.params.id);
  if (!comment) return res.status(404).json({ error: '评论不存在' });
  db.prepare('DELETE FROM comments WHERE id=?').run(comment.id);
  res.json({ ok: true });
});

module.exports = router;
