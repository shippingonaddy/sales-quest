import { ClerkProvider } from '@clerk/clerk-react'
import SalesQuest from './pages/SalesQuest'

const PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY
  || "pk_test_c3Vubnktc3BpZGVyLTI0LmNsZXJrLmFjY291bnRzLmRldiQ";

function App() {
  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <div className="min-h-screen bg-[#0a0612]">
        <SalesQuest />
      </div>
    </ClerkProvider>
  )
}

export default App
