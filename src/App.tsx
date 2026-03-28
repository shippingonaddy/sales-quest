import { ClerkProvider } from '@clerk/clerk-react'
import { QueryClientProvider } from '@tanstack/react-query'
import SalesQuest from './pages/SalesQuest'
import { queryClient } from './lib/react-query'

const PUBLISHABLE_KEY = (import.meta as any).env?.VITE_CLERK_PUBLISHABLE_KEY
  || "pk_test_c3Vubnktc3BpZGVyLTI0LmNsZXJrLmFjY291bnRzLmRldiQ";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <div className="min-h-screen bg-[#0a0612]">
          <SalesQuest />
        </div>
      </ClerkProvider>
    </QueryClientProvider>
  )
}

export default App
