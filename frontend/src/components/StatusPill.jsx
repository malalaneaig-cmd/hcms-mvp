import { useI18n } from '../i18n/I18nProvider.jsx';

const STYLES = {
  booked:    'badge-blue',
  completed: 'badge-green',
  cancelled: 'badge-gray',
  no_show:   'badge-red',
  paid:      'badge-green',
  unpaid:    'badge-yellow',
};

export default function StatusPill({ status }) {
  const { t } = useI18n();
  const klass = STYLES[status] || 'badge-gray';
  const label = t(`status.${status}`) !== `status.${status}` ? t(`status.${status}`) : status;
  return <span className={klass}>{label}</span>;
}

const CHANNEL_STYLES = {
  reception: 'badge-blue',
  website:   'badge-green',
  phone:     'badge-yellow',
  whatsapp:  'badge-emerald',
  sms:       'badge-purple',
};

export function ChannelPill({ channel }) {
  const { t } = useI18n();
  const label = t(`channel.${channel}`) !== `channel.${channel}` ? t(`channel.${channel}`) : channel;
  return <span className={CHANNEL_STYLES[channel] || 'badge-gray'}>{label}</span>;
}
