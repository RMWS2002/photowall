const UploadPage = {
  template: `
  <div style="max-width:680px;margin:0 auto">
    <div v-if="!user" class="empty-state"><p>登录后才能上传</p></div>
    <div v-else>
      <div class="upload-zone" :class="{dragover}" @click="$refs.fi.click()"
        @dragover.prevent="dragover=true" @dragleave="dragover=false" @drop.prevent="handleDrop">
        <div class="upload-icon">+</div>
        <p>拖拽照片/视频到这里</p>
        <p style="color:var(--text-faint);font-size:0.7rem;margin-top:0.2rem">自动压缩 · JPG/PNG/MP4 · ≤10个</p>
        <input ref="fi" type="file" multiple accept="image/*,video/*" @change="handleFiles" style="display:none">
      </div>

      <div v-if="previews.length" style="display:flex;flex-wrap:wrap;gap:0.6rem;margin-top:1rem">
        <div v-for="(p,i) in previews" :key="i" style="width:90px;height:90px;border-radius:8px;overflow:hidden;position:relative">
          <img v-if="p.type==='image'" :src="p.url" style="width:100%;height:100%;object-fit:cover">
          <video v-else :src="p.url" style="width:100%;height:100%;object-fit:cover" muted></video>
          <button @click="removeFile(i)" style="position:absolute;top:2px;right:2px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.7);border:none;color:#fff;cursor:pointer;font-size:11px">✕</button>
          <span v-if="p.compressed" style="position:absolute;bottom:2px;left:2px;background:rgba(0,0,0,0.7);color:#4ade80;font-size:0.55rem;padding:1px 4px;border-radius:4px">✓</span>
        </div>
      </div>

      <div v-if="compressing" style="text-align:center;margin-top:1rem;color:var(--text-dim);font-size:0.85rem">
        压缩中... {{ compressedCount }}/{{ files.length }}
      </div>

      <div v-if="files.length && !compressing" class="card" style="padding:1.5rem;margin-top:1rem">
        <div class="form-group"><label>标题</label><input class="form-input" v-model="title" placeholder="可选"></div>
        <div class="form-group"><label>描述</label><textarea class="form-input" v-model="desc" placeholder="可选"></textarea></div>
        <div class="form-group"><label>标签</label><input class="form-input" v-model="tags" placeholder="风景, 旅行"></div>
        <div class="form-group">
          <label>🎵 背景音乐（可选）</label>
          <input type="file" ref="mi" accept="audio/*" @change="onMusic">
          <span v-if="musicFile" style="font-size:0.75rem;color:#4ade80;margin-left:0.5rem">{{ musicFile.name }}</span>
        </div>
        <button class="btn btn-primary" @click="upload" :disabled="up" style="width:100%;justify-content:center">
          {{ up ? '上传中 '+pg+'%' : '上传 ' + files.length + ' 个文件' }}
        </button>
        <div v-if="up" style="margin-top:0.5rem;background:rgba(255,255,255,0.05);border-radius:8px;height:4px">
          <div :style="{width:pg+'%',background:'#fff',height:'4px',borderRadius:'8px',transition:'width 0.2s'}"></div>
        </div>
      </div>
    </div>
  </div>`,
  data() { return { user:null,files:[],previews:[],musicFile:null,dragover:false,title:'',desc:'',tags:'',up:false,pg:0,compressing:false,compressedCount:0 }; },
  async mounted() {
    if(!API.getToken()) return window.location.hash='#/login';
    try{this.user=(await API.me()).user}catch(e){API.setToken('');window.location.hash='#/login'}
  },
  methods: {
    handleFiles(e){this.addFiles(Array.from(e.target.files))},
    handleDrop(e){this.dragover=false;this.addFiles(Array.from(e.dataTransfer.files))},
    async addFiles(fl){
      this.compressing = true; this.compressedCount = 0;
      for(const f of fl){
        if(this.files.length>=10)break;
        const isImg=f.type.startsWith('image/'),isVid=f.type.startsWith('video/');
        if(!isImg&&!isVid)continue;

        if(isImg){
          // Canvas 压缩图片
          try{
            const compressed = await this.compressImage(f, 1920, 0.75);
            this.files.push(compressed);
          }catch(e){
            this.files.push(f); // 压缩失败用原图
          }
        } else {
          this.files.push(f);
        }
        this.previews.push({url:URL.createObjectURL(f),type:isVid?'video':'image',compressed:isImg});
        this.compressedCount = this.files.length;
      }
      this.compressing = false;
    },
    compressImage(file, maxW, quality){
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          let w=img.width, h=img.height;
          if(w>maxW){h=h*(maxW/w);w=maxW;}
          const c=document.createElement('canvas');c.width=w;c.height=h;
          c.getContext('2d').drawImage(img,0,0,w,h);
          c.toBlob(blob => {
            const nf=new File([blob],file.name,{type:'image/jpeg'});
            resolve(nf);
          },'image/jpeg',quality);
        };
        img.onerror = () => reject(file);
        img.src = URL.createObjectURL(file);
      });
    },
    removeFile(i){this.files.splice(i,1);this.previews.splice(i,1)},
    onMusic(e){this.musicFile=e.target.files[0]||null},
    async upload(){
      if(!this.files.length)return;this.up=true;this.pg=0;
      const fd=new FormData();
      this.files.forEach(f=>fd.append('media',f));
      if(this.musicFile) fd.append('music',this.musicFile);
      fd.append('title',this.title);fd.append('description',this.desc);fd.append('tags',this.tags);

      const xhr=new XMLHttpRequest();
      xhr.upload.onprogress=e=>{if(e.lengthComputable)this.pg=Math.round(e.loaded/e.total*100)};
      xhr.onload=()=>{this.pg=100;setTimeout(()=>window.location.hash='#/',400)};
      xhr.onerror=()=>{alert('上传失败');this.up=false};
      xhr.open('POST','/api/photos');
      xhr.setRequestHeader('Authorization','Bearer '+API.getToken());
      xhr.send(fd);
    }
  }
};
