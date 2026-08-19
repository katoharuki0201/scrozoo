import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AppProviders } from './app/providers'
import './index.css'
import App from './App.tsx'

async function bootstrap() {
  const { enableMocking } = await import('./mocks/enable-mocking')

  await enableMocking()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppProviders>
        <App />
      </AppProviders>
    </StrictMode>,
  )
}

void bootstrap()
