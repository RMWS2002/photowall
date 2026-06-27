/* ========== Vue 应用入口 ========== */
const router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/photo/:id', component: PhotoDetail },
    { path: '/upload', component: UploadPage },
    { path: '/login', component: LoginPage },
    { path: '/register', component: { ...LoginPage, data() { const d = LoginPage.data(); d.isLogin = false; return d; } } },
    { path: '/user/:id', component: UserProfile },
    { path: '/settings', component: SettingsPage },
    { path: '/admin', component: AdminPage }
  ]
});

const app = Vue.createApp({
  template: `<div><nav-bar ref="navbar"></nav-bar><main class="main-content"><router-view></router-view></main></div>`
});

app.component('nav-bar', NavBar);
app.use(router);
app.mount('#app');

// 认证变化时刷新导航栏
window.addEventListener('auth-changed', () => {
  const inst = document.querySelector('#app').__vue_app__?._instance;
  if (inst?.refs?.navbar) inst.refs.navbar.checkAuth();
});
