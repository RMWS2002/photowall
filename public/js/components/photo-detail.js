const PhotoDetail = {
  template: `
  <div v-if="photo" class="lightbox-overlay" @click.self="$router.push('/')">
    <button class="lightbox-close" @click="$router.push('/')">✕</button>
    <div class="lightbox-content">
      <div class="lightbox-image">
        <img v-if="photo.media_type==='photo'" :src="'/uploads/'+photo.filename">
        <video v-else :src="'/uploads/'+photo.filename" controls autoplay style="width:100%;max-height:90vh"></video>
      </div>
      <div class="lightbox-sidebar">
        <div class="user-row">
          <div class="user-dot" @click="$router.push('/user/'+photo.user_id)">
            <img v-if="photo.avatar" :src="photo.avatar" style="width:100%;height:100%;object-fit:cover">
            <span v-else>{{ photo.username[0] }}</span>
          </div>
          <div>
            <div style="font-weight:500;cursor:pointer;font-size:0.9rem" @click="$router.push('/user/'+photo.user_id)">{{ photo.username }}</div>
            <div style="font-size:0.7rem;color:var(--text-faint)">{{ fmt(photo.created_at) }}</div>
          </div>
        </div>

        <p v-if="photo.title" style="font-weight:500">{{ photo.title }}</p>
        <p v-if="photo.description" style="color:var(--text-dim);font-size:0.85rem;line-height:1.6">{{ photo.description }}</p>

        <div v-if="photo.tags" style="display:flex;flex-wrap:wrap;gap:0.2rem">
          <span v-for="t in (photo.tags||'').split(',').filter(Boolean)" :key="t" class="tag"
            @click="$router.push('/');window.dispatchEvent(new CustomEvent('search',{detail:t.trim()}))">{{ t.trim() }}</span>
        </div>

        <!-- 音乐播放器 -->
        <div v-if="photo.music_filename" class="music-player">
          🎵 <audio :src="'/uploads/'+photo.music_filename" controls></audio>
        </div>

        <div style="display:flex;gap:1rem;font-size:0.75rem;color:var(--text-faint)">
          <span>{{ photo.view_count||0 }} 浏览</span>
          <span>{{ photo.like_count||0 }} 喜欢</span>
          <span>{{ photo.comment_count||0 }} 评论</span>
        </div>

        <div class="lightbox-actions">
          <button :class="['btn-icon', photo.liked?'liked':'']" @click="toggleLike">{{ photo.liked?'♥':'♡' }} {{ photo.liked?'已赞':'赞' }}</button>
          <button class="btn-icon" @click="download">↓ 下载</button>
          <button v-if="isOwner||isAdmin" class="btn-icon" @click="del" style="color:var(--red)">删除</button>
        </div>

        <div style="flex:1;overflow-y:auto;min-height:0">
          <div style="font-size:0.75rem;color:var(--text-faint);margin-bottom:0.6rem">评论</div>
          <div v-for="c in comments" :key="c.id" class="comment-item">
            <strong>{{ c.username }}</strong><span>{{ fmt(c.created_at) }}</span>
            <p>{{ c.content }}</p>
          </div>
        </div>

        <div v-if="user" class="comment-input">
          <input v-model="nc" placeholder="说点什么..." @keyup.enter="addComment">
          <button class="btn-icon" @click="addComment">发送</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else style="text-align:center;padding:5rem;opacity:0.3">◌</div>`,
  data() { return { photo:null, comments:[], nc:'', user:null }; },
  computed: {
    isOwner() { return this.user&&this.photo&&this.user.id===this.photo.user_id },
    isAdmin() { return this.user&&this.user.role==='admin' }
  },
  async mounted() {
    if(API.getToken()){try{this.user=(await API.me()).user}catch(e){}}
    const id=this.$route.params.id; if(!id) return this.$router.push('/');
    try{const d=await API.getPhoto(id);this.photo=d.photo;const c=await API.getComments(id);this.comments=c.comments}catch(e){this.$router.push('/')}
  },
  methods: {
    fmt(d){return d?new Date(d).toLocaleDateString('zh-CN'):''},
    async toggleLike(){if(!this.user)return alert('请先登录');try{const r=await API.likePhoto(this.photo.id);this.photo.liked=r.liked;this.photo.like_count+=r.liked?1:-1}catch(e){};},
    async addComment(){if(!this.nc.trim())return;try{await API.addComment(this.photo.id,this.nc);const c=await API.getComments(this.photo.id);this.comments=c.comments;this.photo.comment_count=this.comments.length;this.nc=''}catch(e){alert(e.message)}},
    async del(){if(!confirm('删除？'))return;try{await API.deletePhoto(this.photo.id);this.$router.push('/')}catch(e){}},
    download(){const a=document.createElement('a');a.href='/uploads/'+this.photo.filename;a.download=this.photo.title||'media';a.click()}
  }
};
