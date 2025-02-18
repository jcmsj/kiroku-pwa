import { createApp } from 'vue'
import './tailwind.css'
import App from './App.vue'
import { createWebHistory, createRouter } from 'vue-router'
import { routes } from 'vue-router/auto-routes'
const app = createApp(App)
const router = createRouter({
    history: createWebHistory(import.meta.env.BASE_URL),
    routes,
})

app.use(router)
app.mount('#app')
