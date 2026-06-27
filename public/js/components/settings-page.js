const SettingsPage = {
  template: `
  <div style="max-width:460px;margin:0 auto">
    <div v-if="!user" class="empty-state"><p>请先登录</p></div>
    <div v-else>
      <!-- 头像 -->
      <div class="card" style="padding:1.5rem;margin-bottom:1rem;text-align:center">
        <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:1rem">头像</div>
        <div style="width:80px;height:80px;border-radius:50%;overflow:hidden;margin:0 auto;cursor:pointer;background:var(--surface);display:flex;align-items:center;justify-content:center;position:relative" @click="$refs.av.click()">
          <img v-if="user.avatar" :src="user.avatar" style="width:100%;height:100%;object-fit:cover">
          <span v-else style="font-size:2rem;font-weight:300;opacity:0.3">+</span>
          <div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);font-size:0.65rem;padding:0.2rem">更换</div>
        </div>
        <input ref="av" type="file" accept="image/*" @change="uploadAvatar" style="display:none">
      </div>

      <!-- 签名 -->
      <div class="card" style="padding:1.5rem;margin-bottom:1rem">
        <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:1rem">个性签名</div>
        <div class="form-group"><label>简介</label><textarea class="form-input" v-model="bio" placeholder="写一句话介绍自己..." style="min-height:60px"></textarea></div>
        <button class="btn btn-primary btn-sm" @click="save" :disabled="saving">保存</button>
      </div>

      <div class="card" style="padding:1.5rem;margin-bottom:1rem">
        <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:1rem">修改密码</div>
        <div class="form-group"><label>原密码</label><input class="form-input" v-model="pw.old" type="password"></div>
        <div class="form-group"><label>新密码</label><input class="form-input" v-model="pw.n" type="password" placeholder="至少6位"></div>
        <button class="btn btn-sm" @click="chpw" :disabled="spw">修改密码</button>
      </div>
    </div>
  </div>`,
  data(){return{user:null,bio:'',pw:{old:'',n:''},saving:false,spw:false}},
  async mounted(){
    if(!API.getToken())return this.$router.push('/login');
    try{const d=await API.me();this.user=d.user;this.bio=d.user.bio||''}catch(e){API.setToken('');this.$router.push('/login')}
  },
  methods:{
    async uploadAvatar(e){
      const file=e.target.files[0];if(!file)return;
      const fd=new FormData();fd.append('avatar',file);fd.append('bio',this.bio);
      this.saving=true;
      try{
        // 用 fetch 直接发
        const res=await fetch('/api/auth/profile',{method:'PUT',headers:{Authorization:'Bearer '+API.getToken()},body:fd});
        const d=await res.json();
        if(d.ok){this.user.avatar=d.avatar+'?'+Date.now();window.dispatchEvent(new CustomEvent('auth-changed'))}
      }catch(e){alert(e.message)}
      this.saving=false;
    },
    async save(){this.saving=true;try{await API.updateProfile({bio:this.bio});this.user.bio=this.bio}catch(e){alert(e.message)}this.saving=false},
    async chpw(){if(!this.pw.old||!this.pw.n)return alert('请填写完整');if(this.pw.n.length<6)return alert('至少6位');this.spw=true;try{await API.changePassword({old_password:this.pw.old,new_password:this.pw.n});this.pw={old:'',n:''};alert('密码已修改')}catch(e){alert(e.message)}this.spw=false}
  }
};
