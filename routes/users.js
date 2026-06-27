const express = require('express');
const router = express.Router();
const { getDB } = require('../database');

// 用户主页
router.get('/:id/profile', (req, res) => {
  const db = getDB();
  const user = db.prepare('SELECT id,username,avatar,bio,role,created_at FROM users WHERE id=? AND status=?')
    .get(req.params.id, 'active');
  if (!user) return res.status(404).json({ error: '用户不存在' });

  const photoCount = db.prepare('SELECT COUNT(*) as c FROM photos WHERE user_id=?').get(user.id);
  const likeCount = db.prepare(`
    SELECT COUNT(*) as c FROM likes l
    JOIN photos p ON l.photo_id=p.id WHERE p.user_id=?
  `).get(user.id);

  const recentPhotos = db.prepare(`
    SELECT p.*, (SELECT COUNT(*) FROM likes l WHERE l.photo_id=p.id) as like_count,
      (SELECT COUNT(*) FROM comments c WHERE c.photo_id=p.id) as comment_count
    FROM photos p WHERE p.user_id=? ORDER BY p.created_at DESC LIMIT 12
  `).all(user.id);

  res.json({
    user,
    stats: { photoCount: photoCount?.c || 0, likeCount: likeCount?.c || 0 },
    photos: recentPhotos
  });
});

module.exports = router;
