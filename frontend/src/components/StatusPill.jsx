const STYLES = {
  booked:    'badge-blue',
  completed: 'badge-green',
  cancelled: 'badge-gray',
  no_show:   'badge-red',
  paid:      'badge-green',
  unpaid:    'badge-yellow',
};

const LABELS = {
  no_show: 'no-show',
};

export default function StatusPill({ status }) {
  const klass = STYLES[status] || 'badge-gray';
  return <span className={klass}>{LABELS[status] || status}</span>;
}

const CHANNEL_STYLES = {
  reception: 'badge-blue',
  website:   'badge-green',
  phone:     'badge-yellow',
};

export function ChannelPill({ channel }) {
  return <span className={CHANNEL_STYLES[channel] || 'badge-gray'}>{channel}</span>;
}
