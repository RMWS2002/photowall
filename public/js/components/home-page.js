const HomePage = {
  template: `
  <div>
    <div v-if="photos.length===0 && !loading" class="empty-state">
      <div class="empty-icon">◉</div>
      <p>等待第一束光</p>
      <button v-if="user" class="btn btn-primary" @click="window.location.hash='#/upload'" style="margin-top:1rem">上传</button>
      <button v-else class="btn" @click="window.location.hash='#/register'" style="margin-top:1rem">加入</button>
    </div>

    <!-- 2D 不规则流动照片墙 -->
    <div v-if="rows.length>0" class="flow-wall">
      <div v-for="(row, ri) in rows" :key="'r'+ri" class="flow-row">
        <!-- 两份副本，形成循环 -->
        <template v-for="p in row" :key="'a-'+p.id">
          <div class="flow-card" @click="window.location.hash='#/photo/'+p.id">
            <img v-if="p.media_type==='photo'" :src="'/uploads/'+p.filename" loading="lazy"
              @load="e=>e.target.classList.add('loaded')">
            <video v-else :src="'/uploads/'+p.filename" muted loop playsinline
              @mouseenter="e=>e.target.play()" @mouseleave="e=>e.target.pause()"></video>
            <span v-if="p.media_type==='video'" class="media-badge">▶</span>
            <span v-if="p.music_filename" class="media-badge" style="right:auto;left:0.8rem">🎵</span>
            <div class="card-overlay">
              <div class="card-bottom">
                <div class="card-user-dot">{{ p.username[0] }}</div>
                <div class="card-stats">
                  <span>♥ {{ p.like_count||0 }}</span><span style="opacity:0.4">·</span>
                  <span>💬 {{ p.comment_count||0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <template v-for="p in row" :key="'b-'+p.id">
          <div class="flow-card" @click="window.location.hash='#/photo/'+p.id">
            <img v-if="p.media_type==='photo'" :src="'/uploads/'+p.filename" loading="lazy"
              @load="e=>e.target.classList.add('loaded')">
            <video v-else :src="'/uploads/'+p.filename" muted loop playsinline
              @mouseenter="e=>e.target.play()" @mouseleave="e=>e.target.pause()"></video>
            <span v-if="p.media_type==='video'" class="media-badge">▶</span>
            <span v-if="p.music_filename" class="media-badge" style="right:auto;left:0.8rem">🎵</span>
            <div class="card-overlay">
              <div class="card-bottom">
                <div class="card-user-dot">{{ p.username[0] }}</div>
                <div class="card-stats"><span>♥ {{ p.like_count||0 }}</span><span style="opacity:0.4">·</span><span>💬 {{ p.comment_count||0 }}</span></div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <div v-if="hasMore && photos.length>0" style="text-align:center;padding:1rem">
      <button class="btn" @click="loadMore" :disabled="loading">{{ loading?'···':'更多' }}</button>
    </div>
    <div v-if="loading&&photos.length===0" style="text-align:center;padding:5rem;opacity:0.3">◌</div>
  </div>`,
  data() { return { photos:[], rows:[], page:1, hasMore:false, loading:false, user:null, tag:'' }; },
  async mounted() {
    if (API.getToken()) { try { this.user = (await API.me()).user; } catch(e) {} }
    await this.loadPhotos();
    window.addEventListener('search', e => { this.tag=e.detail; this.page=1; this.photos=[]; this.loadPhotos(); });
  },
  methods: {
    buildRows() {
      // 把照片分成多行，每行 6-12 张
      if (this.photos.length < 1) { this.rows = []; return; }
      const perRow = Math.max(4, Math.min(12, Math.floor(this.photos.length / 3)));
      const rows = [];
      let idx = 0;
      while (idx < this.photos.length) {
        rows.push(this.photos.slice(idx, idx + perRow));
        idx += perRow;
      }
      if (rows.length < 3) {
        // 不够3行就拆分更细
        const p2 = Math.ceil(this.photos.length / 3);
        const r2 = [];
        for (let i = 0; i < this.photos.length; i += p2) {
          r2.push(this.photos.slice(i, i + p2));
        }
        this.rows = r2;
      } else {
        this.rows = rows;
      }
    },
    async loadPhotos(reset=true) {
      this.loading = true;
      try {
        const params = { page: this.page, sort: 'latest', limit: 40 };
        if (this.tag) params.tag = this.tag;
        const d = await API.getPhotos(params);
        this.photos = reset ? d.photos : [...this.photos, ...d.photos];
        this.hasMore = d.hasMore;
        this.buildRows();
      } catch(e) {}
      this.loading = false;
    },
    async loadMore() { this.page++; await this.loadPhotos(false); }
  }
};
