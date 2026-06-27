const LoginPage = {
  template: `
  <div style="max-width:400px;margin:3rem auto">
    <div class="card" style="padding:2.5rem 2rem">
      <div style="text-align:center;margin-bottom:2rem">
        <div style="font-size:2.5rem;opacity:0.6">◉</div>
        <div style="font-size:1.2rem;font-weight:500;margin-top:0.5rem">{{ isLogin ? '欢迎回来' : '加入' }}</div>
        <p style="color:var(--text-faint);font-size:0.8rem;margin-top:0.3rem">
          {{ isLogin ? '登录账号' : '需要邀请码' }}
        </p>
      </div>

      <div v-if="!isLogin" class="form-group"><label>邮箱</label><input class="form-input" v-model="f.email" type="email"></div>
      <div class="form-group"><label>用户名</label><input class="form-input" v-model="f.username" @keyup.enter="submit"></div>
      <div class="form-group"><label>密码</label><input class="form-input" v-model="f.password" type="password" @keyup.enter="submit"></div>
      <div v-if="!isLogin" class="form-group"><label>邀请码 <span style="color:var(--red)">*</span></label><input class="form-input" v-model="f.invite_code" placeholder="输入邀请码"></div>

      <p v-if="error" style="color:var(--red);font-size:0.8rem;margin-bottom:0.8rem">{{ error }}</p>
      <p v-if="ok" style="color:#4ade80;font-size:0.8rem;margin-bottom:0.8rem">{{ ok }}</p>

      <button class="btn btn-primary" style="width:100%;justify-content:center;padding:0.7rem" @click="submit" :disabled="loading">
        {{ loading ? '…' : (isLogin ? '登录' : '注册') }}
      </button>

      <p style="text-align:center;margin-top:1.2rem;font-size:0.8rem;color:var(--text-dim)">
        {{ isLogin ? '没有账号？' : '已有账号？' }}
        <a @click="sw" style="color:var(--text);cursor:pointer;text-decoration:underline">{{ isLogin ? '注册' : '登录' }}</a>
      </p>
    </div>
  </div>`,
  data() { return { isLogin:true,loading:false,error:'',ok:'',f:{username:'',email:'',password:'',invite_code:''} }; },
  methods: {
    sw(){this.isLogin=!this.isLogin;this.error='';this.ok=''},
    async submit(){
      this.error='';this.ok='';
      if(!this.f.username||!this.f.password){this.error='请填写完整';return}
      if(!this.isLogin&&!this.f.email){this.error='请填写邮箱';return}
      if(!this.isLogin&&!this.f.invite_code){this.error='需要邀请码';return}
      this.loading=true;
      try{
        if(this.isLogin){const d=await API.login(this.f);API.setToken(d.token);window.dispatchEvent(new CustomEvent('auth-changed'));this.$router.push('/')}
        else{const d=await API.register(this.f);this.ok=d.msg;this.f={username:'',email:'',password:'',invite_code:''}}
      }catch(e){this.error=e.message}
      this.loading=false;
    }
  }
};
