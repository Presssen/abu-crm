import PresentationClient from './PresentationClient'

export const metadata = {
  title: 'Presentación | AbuApp',
  description: 'Presentación interactiva de AbuApp',
}

export default function PresentationPage() {
  return (
    <div className="w-full h-screen overflow-hidden bg-slate-950">
      <PresentationClient />
    </div>
  )
}
