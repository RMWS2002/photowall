const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const { getDB } = require('../database');
const { authMiddleware } = require('./auth');

const UPLOAD_DIR = path.join(__dirname, '..', 'public', 'uploads');

const storage = multer.diskStorage({
  destination: UPLOAD_DIR,
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const imgExts = ['.jpg','.jpeg','.png','.gif','.webp','.bmp'];
  const vidExts = ['.mp4','.mov','.webm','.avi','.mkv'];
  const audExts = ['.mp3','.wav','.ogg','.m4a','.aac'];
  const allowed = [...imgExts, ...vidExts, ...audExts];
  if (allowed.includes(ext)) cb(null, true);
  else cb(new Error('不支持的文件格式'));
};

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter
});

// 获取照片/视频列表
router.get('/', (req, res) => {
  const db = getDB();
  const { page = 1, tag, user_id, sort = 'latest', limit = 30 } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1'; const params = [];

  if (tag) { where += ' AND p.tags LIKE ?'; params.push('%' + tag + '%'); }
  if (user_id) { where += ' AND p.user_id=?'; params.push(Number(user_id)); }

  const order = sort === 'popular'
    ? 'ORDER BY p.view_count DESC, p.created_at DESC'
    : 'ORDER BY p.created_at DESC';

  const { total } = db.prepare(`SELECT COUNT(*) as total FROM photos p ${where}`).get(...params) || { total: 0 };

  const photos = db.prepare(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes l WHERE l.photo_id=p.id) as like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.photo_id=p.id) as comment_count
    FROM photos p JOIN users u ON p.user_id=u.id
    WHERE u.status='active' ${where ? 'AND ' + where.slice(6) : ''}
    ${order} LIMIT ? OFFSET ?
  `).all(...params, Number(limit), offset);

  res.json({ photos, total, page: Number(page), hasMore: offset + photos.length < total });
});

// 获取详情
router.get('/:id', (req, res) => {
  const db = getDB();
  const photo = db.prepare(`
    SELECT p.*, u.username, u.avatar,
      (SELECT COUNT(*) FROM likes l WHERE l.photo_id=p.id) as like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.photo_id=p.id) as comment_count
    FROM photos p JOIN users u ON p.user_id=u.id WHERE p.id=?
  `).get(req.params.id);
  if (!photo) return res.status(404).json({ error: '不存在' });

  db.prepare('UPDATE photos SET view_count=view_count+1 WHERE id=?').run(req.params.id);

  let liked = false;
  if (req.user?.id) {
    liked = !!db.prepare('SELECT id FROM likes WHERE user_id=? AND photo_id=?').get(req.user.id, photo.id);
  }
  res.json({ photo: { ...photo, liked } });
});

// 上传（照片/视频 + 可选音乐）
router.post('/', authMiddleware, upload.fields([
  { name: 'media', maxCount: 10 },
  { name: 'music', maxCount: 1 }
]), (req, res) => {
  const db = getDB();
  const mediaFiles = req.files?.media || [];
  const musicFile = req.files?.music?.[0] || null;
  if (!mediaFiles.length) return res.status(400).json({ error: '请选择文件' });

  const { title, description, tags } = req.body;
  const results = [];

  mediaFiles.forEach(file => {
    const ext = path.extname(file.originalname).toLowerCase();
    const isVideo = ['.mp4','.mov','.webm','.avi','.mkv'].includes(ext);
    const r = db.prepare(
      'INSERT INTO photos(user_id,filename,title,description,tags,media_type,music_filename,file_size) VALUES(?,?,?,?,?,?,?,?)'
    ).run(req.user.id, file.filename, title || '', description || '', tags || '',
      isVideo ? 'video' : 'photo', musicFile?.filename || '', file.size);
    results.push({ id: r.lastInsertRowid, filename: file.filename, media_type: isVideo?'video':'photo' });
  });

  res.json({ ok: true, photos: results });
});

// 删除
router.delete('/:id', authMiddleware, (req, res) => {
  const db = getDB();
  const photo = db.prepare('SELECT * FROM photos WHERE id=?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: '不存在' });
  const user = db.prepare('SELECT role FROM users WHERE id=?').get(req.user.id);
  if (photo.user_id !== req.user.id && user?.role !== 'admin') return res.status(403).json({ error: '无权' });

  const fs = require('fs');
  [photo.filename, photo.music_filename].filter(Boolean).forEach(f => {
    try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch(e) {}
  });

  db.prepare('DELETE FROM comments WHERE photo_id=?').run(photo.id);
  db.prepare('DELETE FROM likes WHERE photo_id=?').run(photo.id);
  db.prepare('DELETE FROM photos WHERE id=?').run(photo.id);
  res.json({ ok: true });
});

// 点赞
router.post('/:id/like', authMiddleware, (req, res) => {
  const db = getDB();
  const photo = db.prepare('SELECT id,user_id FROM photos WHERE id=?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: '不存在' });
  const ex = db.prepare('SELECT id FROM likes WHERE user_id=? AND photo_id=?').get(req.user.id, photo.id);
  if (ex) { db.prepare('DELETE FROM likes WHERE id=?').run(ex.id); res.json({ liked: false }); }
  else {
    db.prepare('INSERT INTO likes(user_id,photo_id) VALUES(?,?)').run(req.user.id, photo.id);
    if (photo.user_id !== req.user.id) {
      db.prepare('INSERT INTO notifications(user_id,type,message,related_id) VALUES(?,?,?,?)')
        .run(photo.user_id, 'like', `${req.user.username} 赞了你`, photo.id);
    }
    res.json({ liked: true });
  }
});

// 评论
router.get('/:id/comments', (req, res) => {
  const db = getDB();
  res.json({ comments: db.prepare('SELECT c.*, u.username, u.avatar FROM comments c JOIN users u ON c.user_id=u.id WHERE c.photo_id=? ORDER BY c.created_at ASC').all(req.params.id) });
});

router.post('/:id/comments', authMiddleware, (req, res) => {
  const db = getDB();
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '内容不能为空' });
  const photo = db.prepare('SELECT id,user_id FROM photos WHERE id=?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: '不存在' });
  const r = db.prepare('INSERT INTO comments(photo_id,user_id,content) VALUES(?,?,?)').run(photo.id, req.user.id, content);
  if (photo.user_id !== req.user.id) {
    db.prepare('INSERT INTO notifications(user_id,type,message,related_id) VALUES(?,?,?,?)')
      .run(photo.user_id, 'comment', `${req.user.username} 评论了你`, photo.id);
  }
  res.json({ id: r.lastInsertRowid, ok: true });
});

module.exports = router;
