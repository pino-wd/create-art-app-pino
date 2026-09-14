import { createApp } from 'vue'
import App from './App.vue'
import { setupGlobDirectives } from './directives'
import language from './locales'
import router from './router'
import { initStore } from './store'
import { setupErrorHandle } from './utils/sys/error-handle'
import '@styles/core/tailwind.css'
import '@styles/index.scss'

const app = createApp(App)
initStore(app)
setupGlobDirectives(app)
setupErrorHandle(app)

app.use(language)
app.use(router)
app.mount('#app')
