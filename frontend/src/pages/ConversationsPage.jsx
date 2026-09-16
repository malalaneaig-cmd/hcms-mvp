import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import PageHeader from '../components/PageHeader.jsx';
import StaffOnlyGate from '../components/StaffOnlyGate.jsx';
import { Conversations } from '../services/api.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { useI18n } from '../i18n/I18nProvider.jsx';

export default function ConversationsPage() {
  const { t } = useI18n();
  const { canManageClinic } = usePermissions();
  const [threads, setThreads]         = useState([]);
  const [escalations, setEscalations] = useState([]);
  const [active, setActive]           = useState(null);
  const [messages, setMessages]       = useState([]);
  const [reply, setReply]             = useState('');
  const [loading, setLoading]         = useState(true);
  const [sending, setSending]         = useState(false);
  const [reminderMsg, setReminderMsg] = useState('');
  const [simPhone, setSimPhone]       = useState('+258841000001');
  const [simChannel, setSimChannel]   = useState('whatsapp');
  const [simText, setSimText]         = useState('');
  const [simBusy, setSimBusy]         = useState(false);
  const [simError, setSimError]       = useState('');

  async function refreshList() {
    const [threadList, esc] = await Promise.all([
      Conversations.list(),
      Conversations.escalations(),
    ]);
    setThreads(threadList);
    setEscalations(esc);
  }

  useEffect(() => {
    refreshList().finally(() => setLoading(false));
  }, []);

  async function openThread(thread) {
    setActive(thread);
    setReply('');
    const msgs = await Conversations.thread(thread.phone, thread.channel);
    setMessages(msgs);
  }

  async function sendReply(e) {
    e.preventDefault();
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      await Conversations.reply(active.phone, reply.trim(), active.channel);
      setReply('');
      const msgs = await Conversations.thread(active.phone, active.channel);
      setMessages(msgs);
      await refreshList();
    } finally {
      setSending(false);
    }
  }

  async function resolve(id) {
    await Conversations.resolve(id);
    await refreshList();
  }

  async function sendAsPatient(e) {
    e.preventDefault();
    if (!simPhone.trim() || !simText.trim()) return;
    setSimBusy(true);
    setSimError('');
    try {
      await Conversations.simulate(simPhone.trim(), simText.trim(), simChannel);
      setSimText('');
      await refreshList();
      const thread = { phone: simPhone.trim(), channel: simChannel };
      setActive(thread);
      const msgs = await Conversations.thread(thread.phone, thread.channel);
      setMessages(msgs);
    } catch (err) {
      setSimError(err.response?.data?.error || t('conversations.simulatorFailed'));
    } finally {
      setSimBusy(false);
    }
  }

  async function runReminders() {
    setReminderMsg(t('conversations.sendingReminders'));
    try {
      const r = await Conversations.runReminders();
      setReminderMsg(t('conversations.remindersSent', { sent: r.sent, failed: r.failed }));
    } catch {
      setReminderMsg(t('conversations.remindersError'));
    }
  }

  if (!canManageClinic) return <StaffOnlyGate />;

  return (
    <>
      <PageHeader
        title={t('conversations.title')}
        subtitle={t('conversations.subtitle')}
        actions={
          <button className="btn-secondary" onClick={runReminders}>
            {t('conversations.sendReminders')}
          </button>
        }
      />

      <div className="p-8 space-y-4">
        {reminderMsg && (
          <div className="text-sm text-slate-600 bg-slate-100 rounded-lg px-3 py-2">{reminderMsg}</div>
        )}

        <div className="card p-4 space-y-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{t('conversations.simulatorTitle')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{t('conversations.simulatorHint')}</p>
          </div>
          <form onSubmit={sendAsPatient} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-3">
              <label className="label">{t('conversations.patientPhone')}</label>
              <input className="input" value={simPhone} onChange={(e) => setSimPhone(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="label">{t('common.channel')}</label>
              <select className="input" value={simChannel} onChange={(e) => setSimChannel(e.target.value)}>
                <option value="whatsapp">WhatsApp</option>
                <option value="sms">SMS</option>
              </select>
            </div>
            <div className="md:col-span-5">
              <label className="label">{t('conversations.message')}</label>
              <input
                className="input"
                placeholder={t('conversations.messagePh')}
                value={simText}
                onChange={(e) => setSimText(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <button className="btn-primary w-full" disabled={simBusy || !simText.trim()}>
                {simBusy ? t('common.sending') : t('conversations.sendAsPatient')}
              </button>
            </div>
          </form>
          {simError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{simError}</div>
          )}
        </div>

        {escalations.length > 0 && (
          <div className="card p-4 border-amber-200 bg-amber-50">
            <h2 className="text-sm font-semibold text-amber-900 mb-2">
              {t('conversations.openEscalations', { count: escalations.length })}
            </h2>
            <ul className="space-y-2">
              {escalations.map((e) => (
                <li key={e.id} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-medium">{e.phone}</span>
                    <span className="text-slate-500"> · {e.channel} · {e.reason}</span>
                  </span>
                  <button className="btn-secondary text-xs py-1" onClick={() => resolve(e.id)}>
                    {t('conversations.resolve')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[28rem]">
          <div className="card overflow-hidden lg:col-span-1">
            {loading ? (
              <div className="px-4 py-10 text-center text-slate-500">{t('common.loading')}</div>
            ) : threads.length === 0 ? (
              <div className="px-4 py-10 text-center text-slate-500 text-sm">
                {t('conversations.noThreads')}
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 max-h-[32rem] overflow-y-auto">
                {threads.map((thread) => (
                  <li key={`${thread.phone}-${thread.channel}`}>
                    <button
                      type="button"
                      onClick={() => openThread(thread)}
                      className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${
                        active?.phone === thread.phone && active?.channel === thread.channel ? 'bg-brand-50' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-sm">{thread.phone}</span>
                        <span className="text-xs text-slate-500">{thread.channel}</span>
                      </div>
                      <div className="text-xs text-slate-500 truncate mt-0.5">{thread.last_body}</div>
                      {Number(thread.open_escalations) > 0 && (
                        <div className="text-xs text-amber-700 mt-1">{t('conversations.awaitingHuman')}</div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="card flex flex-col lg:col-span-2 min-h-[28rem]">
            {!active ? (
              <div className="flex-1 grid place-items-center text-sm text-slate-500 p-6">
                {t('conversations.selectThread')}
              </div>
            ) : (
              <>
                <div className="px-4 py-3 border-b border-slate-200 text-sm font-medium">
                  {active.phone} · {active.channel}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[22rem]">
                  {messages.map((m) => (
                    <div
                      key={m.id}
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                        m.direction === 'in'
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-brand-50 text-brand-900 ml-auto'
                      }`}
                    >
                      <div>{m.body}</div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        {format(new Date(m.created_at), 'dd/MM HH:mm')} · {m.direction === 'in' ? t('conversations.patient') : t('conversations.clinic')}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendReply} className="p-3 border-t border-slate-200 flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder={t('conversations.replyPh')}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                  />
                  <button className="btn-primary" disabled={sending || !reply.trim()}>
                    {sending ? t('common.sending') : t('common.send')}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
