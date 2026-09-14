import GlowingLogo from './components/GlowingLogo'

export default function App() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center gap-12 py-20 px-8" style={{ backgroundColor: '#13100b' }}>

      {/* Dark background */}
      <div
        className="flex items-center justify-center rounded-sm px-16 py-14"
        style={{ backgroundColor: '#1a1208', minWidth: 420 }}
      >
        <GlowingLogo size="xl" bg="dark" />
      </div>

      {/* Light background */}
      <div
        className="flex items-center justify-center rounded-sm px-16 py-14"
        style={{ backgroundColor: '#faf7f0', minWidth: 420 }}
      >
        <GlowingLogo size="xl" bg="light" />
      </div>

    </div>
  )
}
