const AdminPage = {
  template: `
  <div>
    <div v-if="!user||user.role!=='admin'" class="empty-state"><p>需要管理员权限</p></div>
    <div v-else class="admin-layout">
      <div class="admin-sidebar">
        <a :class="{active:tab==='stats'}" @click="tab='stats'">概览</a>
        <a :class="{active:tab==='users'}" @click="tab='users'">用户</a>
        <a :class="{active:tab==='invites'}" @click="tab='invites'">邀请码</a>
        <a :class="{active:tab==='content'}" @click="tab='content'">内容</a>
      </div>

      <div class="admin-main">
        <div v-if="tab==='stats'">
          <div class="stat-cards">
            <div class="stat-card"><div class="stat-num">{{ s.totalUsers }}</div><div class="stat-label">用户</div></div>
            <div class="stat-card"><div class="stat-num">{{ s.activeUsers }}</div><div class="stat-label">活跃</div></div>
            <div class="stat-card"><div class="stat-num" style="color:#fbbf24">{{ s.pendingUsers }}</div><div class="stat-label">待审</div></div>
            <div class="stat-card"><div class="stat-num">{{ s.totalPhotos }}</div><div class="stat-label">照片</div></div>
            <div class="stat-card"><div class="stat-num">{{ s.totalComments }}</div><div class="stat-label">评论</div></div>
            <div class="stat-card"><div class="stat-num">{{ s.totalLikes }}</div><div class="stat-label">赞</div></div>
          </div>
        </div>

        <div v-if="tab==='users'">
          <div style="display:flex;gap:0.4rem;margin-bottom:1rem;flex-wrap:wrap">
            <button v-for(o in ['all','pending','active','rejected']" :key="o" class="btn btn-sm" :class="uf===o?'btn-primary':'btn'" @click="uf=o;lu()">{{ {all:'全部',pending:'待审核',active:'已通过',rejected:'已拒绝'}[o] }}</button>
          </div>
          <div v-for="u in users" :key="u.id" class="card" style="padding:0.8rem 1rem;margin-bottom:0.5rem;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:0.5rem">
            <div style="display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">
              <strong style="font-size:0.9rem">{{ u.username }}</strong>
              <span style="color:var(--text-faint);font-size:0.75rem">{{ u.email }}</span>
              <span class="status-badge" :class="'status-'+u.status">{{ {pending:'待审',active:'通过',rejected:'拒绝'}[u.status] }}</span>
              <span v-if="u.role==='admin'" class="status-badge status-active">管理</span>
              <span style="color:var(--text-faint);font-size:0.7rem">{{ u.photo_count }}张</span>
            </div>
            <div style="display:flex;gap:0.3rem">
              <button v-if="u.status==='pending'" class="btn btn-sm btn-primary" @click="ap(u)">通过</button>
              <button v-if="u.status==='pending'" class="btn btn-sm btn-danger" @click="rj(u)">拒绝</button>
              <button v-if="u.status==='active'&&u.role!=='admin'" class="btn btn-sm" @click="ta(u)">设为管理</button>
              <button v-if="u.role==='admin'&&u.id!==user.id" class="btn btn-sm" @click="ta(u)">取消管理</button>
            </div>
          </div>
        </div>

        <div v-if="tab==='invites'">
          <div style="margin-bottom:1rem;display:flex;align-items:center;gap:0.8rem;flex-wrap:wrap">
            <input v-model.number="inviteUses" type="number" min="1" max="999" style="width:60px;padding:0.35rem 0.5rem;border:1px solid var(--glass-border);border-radius:8px;background:var(--surface);color:var(--text);text-align:center;font-size:0.8rem" title="可用次数（999=无限）">
            <span style="font-size:0.75rem;color:var(--text-faint)">次使用</span>
            <button class="btn btn-primary btn-sm" @click="gi">生成邀请码</button>
            <span v-if="nc.length" style="font-family:monospace;font-size:0.9rem">{{ nc.join(' ') }}</span>
            <button v-if="nc.length" class="btn btn-sm" @click="cp">复制</button>
          </div>
          <div class="card" style="overflow-x:auto;padding:1rem">
            <table style="width:100%;border-collapse:collapse;font-size:0.82rem">
              <thead><tr style="border-bottom:1px solid var(--glass-border);text-align:left">
                <th style="padding:0.5rem">码</th><th style="padding:0.5rem">创建</th><th style="padding:0.5rem">使用</th><th style="padding:0.5rem">上限</th><th style="padding:0.5rem">用户</th><th style="padding:0.5rem">时间</th>
              </tr></thead>
              <tbody>
                <tr v-for="i in invites" :key="i.id" style="border-bottom:1px solid var(--glass-border)">
                  <td style="padding:0.5rem;font-family:monospace;font-weight:600">{{ i.code }}</td>
                  <td style="padding:0.5rem">{{ i.creator_name }}</td>
                  <td style="padding:0.5rem">{{ i.use_count }}</td>
                  <td style="padding:0.5rem">{{ i.max_uses===999?'∞':i.max_uses }}</td>
                  <td style="padding:0.5rem">{{ i.used_by_name||'-' }}</td>
                  <td style="padding:0.5rem;font-size:0.7rem;color:var(--text-faint)">{{ fmt(i.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div v-if="tab==='content'">
          <div v-for="p in cPhotos" :key="p.id" class="card" style="padding:0.8rem;margin-bottom:0.5rem;display:flex;align-items:center;gap:1rem">
            <img :src="'/uploads/'+p.filename" style="width:56px;height:56px;object-fit:cover;border-radius:4px">
            <div style="flex:1;font-size:0.85rem">{{ p.title||'无标题' }}<span style="color:var(--text-faint);margin-left:0.5rem;font-size:0.75rem">{{ p.username }}</span></div>
            <button class="btn btn-sm btn-danger" @click="dp(p)">删除</button>
          </div>
        </div>
      </div>
    </div>
  </div>`,
  data(){return{user:null,tab:'stats',s:{},users:[],uf:'all',invites:[],nc:[],cPhotos:[],inviteUses:1}},
  async mounted(){
    if(!API.getToken())return this.$router.push('/login');
    try{const d=await API.me();if(d.user.role!=='admin')return this.$router.push('/');this.user=d.user;this.lt()}catch(e){API.setToken('');this.$router.push('/login')}
  },
  watch:{tab(){this.lt()}},
  methods:{
    fmt(d){return d?new Date(d).toLocaleDateString('zh-CN'):''},
    async lt(){
      try{
        if(this.tab==='stats')this.s=await API.getAdminStats();
        if(this.tab==='users')await this.lu();
        if(this.tab==='invites'){const d=await API.getInvites();this.invites=d.invites}
        if(this.tab==='content'){const d=await API.getPhotos({limit:50});this.cPhotos=d.photos}
      }catch(e){}
    },
    async lu(){try{const d=await API.getAdminUsers({status:this.uf});this.users=d.users}catch(e){}},
    async ap(u){try{await API.updateUserStatus(u.id,'active');u.status='active';this.s.pendingUsers--;this.s.activeUsers++}catch(e){alert(e.message)}},
    async rj(u){try{await API.updateUserStatus(u.id,'rejected');u.status='rejected';this.s.pendingUsers--}catch(e){alert(e.message)}},
    async ta(u){const r=u.role==='admin'?'user':'admin';try{await API.updateUserRole(u.id,r);u.role=r}catch(e){alert(e.message)}},
    async gi(){try{const uses=this.inviteUses||1;const d=await API.createInvites({count:1,max_uses:uses});this.nc=d.codes;this.lt()}catch(e){alert(e.message)}},
    cp(){navigator.clipboard.writeText(this.nc.join(' '));this.nc=[]},
    async dp(p){if(!confirm('删除？'))return;try{await API.adminDeletePhoto(p.id);this.cPhotos=this.cPhotos.filter(x=>x.id!==p.id)}catch(e){alert(e.message)}}
  }
};
