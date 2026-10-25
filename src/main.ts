import { createApp } from 'vue'
import App from './App.vue'
import { initTheme } from './lib/theme'
import './styles/tokens.css'
import './styles/base.css'
import './styles/markdown.css'

initTheme()
createApp(App).mount('#app')

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // Offline caching is an enhancement; the viewer works without it.
    })
  })
}
