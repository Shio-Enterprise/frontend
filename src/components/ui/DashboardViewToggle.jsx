import { Icon } from './ShioDesign';

const icons = { list: 'list', bars: 'chartBar', donut: 'chartDonut', cards: 'grid' };

export default function DashboardViewToggle({ label, views, value, onChange }) {
  return <div role="group" aria-label={label} className="inline-flex max-w-full shrink-0 rounded-lg border border-black/15 p-1">
    {views.map(([mode, name]) => <button key={mode} type="button" aria-label={name} title={name} aria-pressed={value === mode}
      onClick={() => onChange(mode)}
      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black ${value === mode ? 'bg-black text-white' : 'text-black/65 hover:bg-black/5'}`}>
      <Icon name={icons[mode]} className="h-5 w-5" />
    </button>)}
  </div>;
}
