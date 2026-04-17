import PresentationClient from './PresentationClient'

export const metadata = {
  title: 'Presentación | AbuApp',
  description: 'Presentación interactiva de AbuApp',
}

export default function PresentationPage() {
  return (
    <div className="flex-1 overflow-hidden">
      <PresentationClient />
    </div>
  )
}
