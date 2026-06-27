const HomePage = {
  template: `
  <div>
    <div v-if="photos.length===0 && !loading" class="empty-state">
      <div class="empty-icon">◉</div>
      <p>等待第一束光</p>
      <button v-if="user" class="btn btn-primary" @click="window.location.hash='#/upload'" style="margin-top:1rem">上传</button>
      <button v-else class="btn" @click="window.location.hash='#/register'" style="margin-top:1rem">加入</button>
    </div>

    <!-- 流动照片墙 -->
    <div v-if="photos.length>0" class="flow-wall" ref="wall" @wheel.prevent="onWheel">
      <div class="flow-row med">
        <!-- 第一组 -->
        <template v-for="p in photos" :key="'a-'+p.id">
          <div class="flow-card" @click="window.location.hash='#/photo/'+p.id">
            <img v-if="p.media_type==='photo'" :src="'/uploads/'+p.filename" loading="lazy"
              @load="e=>e.target.classList.add('loaded')"
              @error="e=>e.target.style.display='none'">
            <video v-else :src="'/uploads/'+p.filename" muted loop playsinline
              @mouseenter="e=>e.target.play()" @mouseleave="e=>e.target.pause()"></video>
            <span v-if="p.media_type==='video'" class="media-badge">▶</span>
            <span v-if="p.music_filename" class="media-badge" style="right:auto;left:0.8rem">🎵</span>
            <div class="card-overlay">
              <div class="card-bottom">
                <div class="card-user-dot">
                  <img v-if="p.avatar" :src="p.avatar" style="width:100%;height:100%;object-fit:cover">
                  <span v-else>{{ p.username[0] }}</span>
                </div>
                <div class="card-stats">
                  <span>♥ {{ p.like_count||0 }}</span><span style="opacity:0.4">·</span>
                  <span>💬 {{ p.comment_count||0 }}</span>
                </div>
              </div>
            </div>
          </div>
        </template>
        <!-- 第二组（重复，形成无限循环） -->
        <template v-for="p in photos" :key="'b-'+p.id">
          <div class="flow-card" @click="window.location.hash='#/photo/'+p.id">
            <img v-if="p.media_type==='photo'" :src="'/uploads/'+p.filename" loading="lazy"
              @load="e=>e.target.classList.add('loaded')"
              @error="e=>e.target.style.display='none'">
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
      </div>
    </div>

    <div v-if="hasMore && photos.length>0" style="text-align:center;padding:1rem">
      <button class="btn" @click="loadMore" :disabled="loading">{{ loading?'···':'更多' }}</button>
    </div>
    <div v-if="loading&&photos.length===0" style="text-align:center;padding:5rem;opacity:0.3">◌</div>
  </div>`,
  data() { return { photos:[], page:1, hasMore:false, loading:false, user:null, tag:'' }; },
  async mounted() {
    if (API.getToken()) { try { this.user = (await API.me()).user; } catch(e) {} }
    await this.loadPhotos();
    window.addEventListener('search', e => { this.tag=e.detail; this.page=1; this.photos=[]; this.loadPhotos(); });
  },
  methods: {
    onWheel(e) {
      const wall = this.$refs.wall;
      if (wall) wall.scrollLeft += e.deltaY * 2;
    },
    async loadPhotos(reset=true) {
      this.loading = true;
      try {
        const params = { page: this.page, sort: 'latest', limit: 40 };
        if (this.tag) params.tag = this.tag;
        const d = await API.getPhotos(params);
        this.photos = reset ? d.photos : [...this.photos, ...d.photos];
        this.hasMore = d.hasMore;
      } catch(e) {}
      this.loading = false;
    },
    async loadMore() { this.page++; await this.loadPhotos(false); }
  }
};
