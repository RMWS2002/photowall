const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./database');

async function start() {
  await initDB();
  console.log('📦 数据库已就绪');

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/photos', require('./routes/photos'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/admin', require('./routes/admin'));

  app.get(/^(?!\/api|\/uploads).*/, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, '0.0.0.0', async () => {
    const os = require('os');
    const ips = [];
    Object.values(os.networkInterfaces()).flat().forEach(i => {
      if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
    });

    console.log('📸 照片墙已启动:');
    console.log(`   💻 本机: http://localhost:${PORT}`);
    ips.forEach(ip => console.log(`   📱 局域网: http://${ip}:${PORT}`));

    // 本地启动时自动开公网隧道（部署到 Render 后用自己的域名）
    if (!process.env.RENDER && !process.env.RAILWAY_STATIC_URL) {
      try {
        const localtunnel = require('localtunnel');
        const tunnel = await localtunnel({ port: PORT });
        console.log(`   🌐 临时公网: ${tunnel.url}`);
      } catch(e) {
        console.log(`   ⚠️  公网隧道启动失败，局域网仍可用`);
      }
    }

    console.log(`   👑 管理员: admin / admin123`);
  });
}

start().catch(err => { console.error('启动失败:', err); process.exit(1); });
