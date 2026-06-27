/* 导航栏 — 纯图标 · 玻璃悬浮 · 零文字 */
const NavBar = {
  template: `
  <nav class="navbar">
    <div class="nav-icon" @click="$router.push('/')" title="首页">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
      <span class="tooltip">探索</span>
    </div>

    <div class="nav-divider"></div>

    <div v-if="user" class="nav-icon" @click="$router.push('/upload')" title="上传">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <span class="tooltip">上传</span>
    </div>

    <template v-if="user">
      <div class="nav-icon" @click="$router.push('/user/'+user.id)" title="我的">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <span class="tooltip">主页</span>
      </div>

      <div class="nav-icon" @click="showNotif=!showNotif" title="通知" style="position:relative">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
        <span v-if="unreadCount>0" class="nav-badge" style="top:-2px;right:-2px;width:10px;height:10px"></span>
        <span class="tooltip">通知</span>

        <div v-if="showNotif" class="notif-dropdown" @click.stop>
          <div v-if="notifications.length===0" style="color:var(--text-faint);text-align:center;padding:1rem;font-size:0.8rem">暂无通知</div>
          <div v-for="n in notifications.slice(0,15)" :key="n.id" class="notif-item" @click="readNotif(n)">
            <span v-if="!n.is_read" style="color:var(--red);margin-right:4px;font-size:0.6rem">●</span>
            {{ n.message }}
            <div style="color:var(--text-faint);font-size:0.65rem;margin-top:2px">{{ fmt(n.created_at) }}</div>
          </div>
        </div>
      </div>

      <div class="nav-divider"></div>

      <div v-if="user.role==='admin'" class="nav-icon" @click="$router.push('/admin')" title="管理">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
        <span class="tooltip">管理</span>
      </div>

      <div class="nav-icon" @click="showMenu=!showMenu" title="更多">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/></svg>
        <span class="tooltip">更多</span>
        <div v-if="showMenu" class="notif-dropdown" style="right:0;top:48px;width:200px" @click.stop>
          <div class="notif-item" @click="$router.push('/settings');showMenu=false">⚙️ 设置</div>
          <div class="notif-item" @click="logout" style="color:var(--red)">退出</div>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="nav-icon" @click="$router.push('/login')" title="登录">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
        <span class="tooltip">登录</span>
      </div>
      <div class="nav-icon" @click="$router.push('/register')" title="注册">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
        <span class="tooltip">注册</span>
      </div>
    </template>
  </nav>`,
  data() {
    return { user: null, unreadCount: 0, showMenu: false, showNotif: false, notifications: [] };
  },
  methods: {
    async checkAuth() {
      if (!API.getToken()) return;
      try {
        const d = await API.me();
        this.user = d.user;
        this.unreadCount = d.unreadCount || 0;
        if (this.unreadCount > 0) await this.loadNotifs();
      } catch(e) { API.setToken(''); }
    },
    async loadNotifs() {
      try { const d = await API.getNotifications(); this.notifications = d.notifications; } catch(e) {}
    },
    async readNotif(n) {
      if (!n.is_read) { try { await API.readNotification(n.id); n.is_read=1; this.unreadCount--; } catch(e) {} }
      this.showNotif = false;
      if (n.type==='comment'||n.type==='like') this.$router.push('/photo/'+n.related_id);
    },
    async logout() { API.setToken(''); this.user=null; this.showMenu=false; this.$router.push('/'); },
    fmt(d) { return d ? new Date(d).toLocaleDateString('zh-CN') : ''; }
  },
  mounted() {
    this.checkAuth();
    document.addEventListener('click', () => { this.showMenu = false; this.showNotif = false; });
  }
};
