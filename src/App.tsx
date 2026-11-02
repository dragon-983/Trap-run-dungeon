import { Component, useEffect, useMemo, useState, type ErrorInfo, type ReactNode } from 'react'
import { inbox } from '@/app/inbox'
import { NavContext, type Route } from '@/app/nav'
import { Button } from '@/components/ui'
import { sfx } from '@/lib/audio'
import { useAuth } from '@/auth/useAuth'
import { profileStore, useProfile } from '@/progress/store'
import { ChainSync } from '@/web3/useShopData'
import { DailyScreen } from '@/screens/DailyScreen'
import { EditorScreen } from '@/screens/EditorScreen'
import { FriendScreen } from '@/screens/FriendScreen'
import { MenuScreen } from '@/screens/MenuScreen'
import { ModesScreen } from '@/screens/ModesScreen'
import { PlayScreen } from '@/screens/PlayScreen'
import { PracticeScreen } from '@/screens/PracticeScreen'
import { ProfileScreen } from '@/screens/ProfileScreen'
import { ReplayScreen } from '@/screens/ReplayScreen'
import { ResultScreen } from '@/screens/ResultScreen'
import { SettingsScreen } from '@/screens/SettingsScreen'
import { ShopScreen } from '@/screens/ShopScreen'

class Boundary extends Component<{ children: ReactNode; onReset: () => void }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) {
    return { error }
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TRAP//RUN crashed', error, info.componentStack)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="bg-dungeon grid min-h-dvh place-items-center p-6 text-center">
        <div className="max-w-sm">
          <div className="font-pixel text-3xl text-blood-500">GLITCH</div>
          <p className="mt-3 text-zinc-300">Something broke in the dungeon. Your saved progress is safe.</p>
          <p className="mt-1 break-words text-xs text-zinc-500">{this.state.error.message}</p>
          <Button
            className="mt-5"
            variant="primary"
            onClick={() => {
              this.setState({ error: null })
              this.props.onReset()
            }}
          >
            Back to menu
          </Button>
        </div>
      </div>
    )
  }
}

function bootRoute(): Route {
  const code = new URLSearchParams(window.location.search).get('c')
  if (code) {
    inbox.code = code
    return { name: 'friend' }
  }
  return { name: 'menu' }
}

export default function App() {
  const [route, go] = useState<Route>(bootRoute)
  const profile = useProfile()
  const { sound, volume, reducedMotion } = profile.settings
  const { signedInAddress } = useAuth()

  // Free health refills at UTC midnight even if the app stays open.
  useEffect(() => {
    const t = setInterval(() => profileStore.refreshDay(), 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    sfx.configure({ enabled: sound, volume })
  }, [sound, volume])

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reducedMotion)
  }, [reducedMotion])

  // Opening a challenge link once is enough; keep the URL clean afterwards.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('c')) window.history.replaceState(null, '', window.location.pathname)
  }, [])

  const nav = useMemo(() => ({ route, go }), [route])

  let screen: ReactNode
  switch (route.name) {
    case 'menu':
      screen = <MenuScreen />
      break
    case 'modes':
      screen = <ModesScreen />
      break
    case 'practice':
      screen = <PracticeScreen />
      break
    case 'daily':
      screen = <DailyScreen />
      break
    case 'friend':
      screen = <FriendScreen />
      break
    case 'editor':
      screen = <EditorScreen />
      break
    case 'profile':
      screen = <ProfileScreen />
      break
    case 'settings':
      screen = <SettingsScreen />
      break
    case 'shop':
      screen = <ShopScreen />
      break
    case 'play':
      screen = <PlayScreen key={route.attempt} dungeon={route.dungeon} mode={route.mode} back={route.back} next={route.next} tip={route.tip} />
      break
    case 'result':
      screen = <ResultScreen result={route.result} report={route.report} dungeon={route.dungeon} back={route.back} next={route.next} tip={route.tip} />
      break
    case 'replay':
      screen = <ReplayScreen dungeon={route.dungeon} actions={route.actions} back={route.back} />
      break
  }

  return (
    <NavContext.Provider value={nav}>
      <ChainSync address={signedInAddress} />
      <Boundary onReset={() => go({ name: 'menu' })}>{screen}</Boundary>
    </NavContext.Provider>
  )
}
