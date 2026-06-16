import App from './App.vue'
import { createApp } from 'vue'
import { initStore } from './store'
import router from './router'
import language from './locales'
import '@styles/core/tailwind.css'
import '@styles/index.scss'
import '@utils/sys/console'
import { setupGlobDirectives } from './directives'
import { setupErrorHandle } from './utils/sys/error-handle'

const app = createApp(App)
initStore(app)
setupGlobDirectives(app)
setupErrorHandle(app)

app.use(language)
app.use(router)
app.mount('#app')
