const UserProfile = {
  template: `
  <div v-if="p" style="max-width:900px;margin:0 auto">
    <div class="card" style="padding:2.5rem 2rem;text-align:center;margin-bottom:2rem">
      <div class="user-dot" style="width:80px;height:80px;font-size:2rem;margin:0 auto 1rem;cursor:default">{{ p.user.username[0] }}</div>
      <div style="font-size:1.3rem;font-weight:600">{{ p.user.username }}</div>
      <p v-if="p.user.bio" style="color:var(--text-dim);margin-top:0.3rem;font-size:0.9rem">{{ p.user.bio }}</p>
      <p style="color:var(--text-faint);font-size:0.75rem;margin-top:0.3rem">{{ fmt(p.user.created_at) }} 加入</p>
      <div style="display:flex;justify-content:center;gap:2.5rem;margin-top:1.5rem">
        <div><div style="font-size:1.8rem;font-weight:300">{{ p.stats.photoCount }}</div><span style="color:var(--text-faint);font-size:0.75rem">照片</span></div>
        <div><div style="font-size:1.8rem;font-weight:300">{{ p.stats.likeCount }}</div><span style="color:var(--text-faint);font-size:0.75rem">获赞</span></div>
      </div>
    </div>

    <div class="masonry-grid">
      <div v-for(photo in p.photos) :key="photo.id" class="photo-card" @click="$router.push('/photo/'+photo.id)">
        <img :src="'/uploads/'+photo.filename" loading="lazy">
        <div class="card-overlay"><div class="card-bottom"><div class="card-stats"><span>{{ photo.like_count }}</span><span style="opacity:0.4">·</span><span>{{ photo.comment_count }}</span></div></div></div>
      </div>
    </div>
    <div v-if="!p.photos.length" class="empty-state"><p>还没有分享</p></div>
  </div>
  <div v-else style="text-align:center;padding:4rem;opacity:0.4">◌</div>`,
  data(){return{p:null}},
  async mounted(){try{this.p=await API.getUserProfile(this.$route.params.id)}catch(e){this.$router.push('/')}},
  methods:{fmt(d){return d?new Date(d).toLocaleDateString('zh-CN'):''}}
};
