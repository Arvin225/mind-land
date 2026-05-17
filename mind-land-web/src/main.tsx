import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { useThemeStore, initThemeListener } from './store/modules/themeStore'

initThemeListener()

function ThemeInit() {
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    // 等待 zustand persist rehydration
    const unsubscribe = useThemeStore.subscribe((state) => {
      if (!initialized && state.theme) {
        const resolved = state.theme === 'system'
          ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
          : state.theme;
        const root = document.documentElement;
        if (resolved === 'dark') {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
        setInitialized(true)
      }
    })

    // 立即尝试应用一次（处理非持久化状态）
    const state = useThemeStore.getState()
    if (state.theme) {
      const resolved = state.theme === 'system'
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : state.theme;
      const root = document.documentElement;
      if (resolved === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }

    return () => unsubscribe()
  }, [initialized])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeInit />
    <App />
  </StrictMode>,
)
