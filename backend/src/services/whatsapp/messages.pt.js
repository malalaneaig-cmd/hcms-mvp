/**
 * Portuguese message templates for the WhatsApp/SMS booking chatbot.
 * All patient-facing text lives here for easy translation.
 */

export const MSG = {
  GREETING:
    '👋 Olá! Bem-vindo à clínica.\n' +
    'Posso ajudá-lo a marcar uma consulta.\n\n' +
    'Por favor, digite o seu *nome completo*:',

  ASK_DOCTOR: (doctors) => {
    const list = doctors
      .map((d, i) => `  ${i + 1}. ${d.name}${d.specialty ? ` — ${d.specialty}` : ''}`)
      .join('\n');
    return (
      '🩺 Com qual médico gostaria de consultar?\n\n' +
      list +
      '\n\nDigite o *número* correspondente:'
    );
  },

  ASK_DATE: (maxDays) =>
    '📅 Qual a data pretendida para a consulta?\n\n' +
    'Digite no formato *DD/MM/AAAA*\n' +
    `(pode marcar até *${maxDays} dias* à frente)`,

  ASK_SLOT: (slots) => {
    const list = slots.map((t, i) => `  ${i + 1}. ${t}`).join('\n');
    return (
      '🕐 Horários disponíveis:\n\n' +
      list +
      '\n\nDigite o *número* da lista (ex: 4) ou a *hora* directamente (ex: 09:30):'
    );
  },

  NO_SLOTS:
    '⚠️ Não há horários disponíveis nessa data.\n\n' +
    '📅 Por favor, escolha outra data (*DD/MM/AAAA*):',

  CONFIRM: ({ patientName, doctorName, date, time }) =>
    '✅ *Resumo da marcação:*\n\n' +
    `👤 Paciente: ${patientName}\n` +
    `🩺 Médico: ${doctorName}\n` +
    `📅 Data: ${date}\n` +
    `🕐 Hora: ${time}\n\n` +
    'Está correcto? Digite *SIM* para confirmar ou *NÃO* para cancelar.',

  BOOKED: (ref) =>
    '🎉 Consulta marcada com sucesso!\n\n' +
    `📋 Referência: #${ref}\n\n` +
    'Se precisar cancelar, envie *CANCELAR #' + ref + '*.\n' +
    'Obrigado e até breve!',

  CANCELLED:
    '❌ Marcação cancelada.\n' +
    'Se quiser marcar novamente, faça uma nova marcação.',

  APPT_CANCELLED: (ref) =>
    `❌ Consulta #${ref} foi cancelada com sucesso.\n` +
    'Se quiser marcar novamente, envie qualquer mensagem.',

  APPT_NOT_FOUND: (ref) =>
    `⚠️ Não encontrámos a consulta #${ref}.\n` +
    'Verifique o número de referência e tente novamente.',

  APPT_ALREADY_CANCELLED: (ref) =>
    `ℹ️ A consulta #${ref} já foi cancelada anteriormente.`,

  CANCEL_TOO_LATE: (hours) =>
    `⚠️ Não é possível cancelar com menos de *${hours} horas* de antecedência.\n` +
    'Por favor contacte a recepção da clínica.',

  CONFLICT:
    '⚠️ Lamentamos, esse horário já não está disponível.\n' +
    'Por favor, escolha outro horário da lista:',

  INVALID_DOCTOR:
    '⚠️ Opção inválida. Por favor, digite o *número* do médico da lista.',

  INVALID_DATE:
    '⚠️ Data inválida. Por favor, use o formato *DD/MM/AAAA*\n' +
    '(exemplo: 25/12/2026)',

  DATE_PAST:
    '⚠️ Não é possível marcar para uma data passada.\n\n' +
    '📅 Por favor, escolha hoje ou uma data futura (*DD/MM/AAAA*):',

  DATE_TOO_FAR: (maxDays) =>
    `⚠️ Só é possível marcar até *${maxDays} dias* à frente.\n\n` +
    '📅 Por favor, escolha uma data mais próxima (*DD/MM/AAAA*):',

  INVALID_SLOT:
    '⚠️ Opção inválida. Por favor, digite o *número* do horário da lista.',

  INVALID_CONFIRM:
    'Por favor, digite *SIM* para confirmar ou *NÃO* para cancelar.',

  ERROR:
    '😔 Ocorreu um erro inesperado. Por favor, tente novamente mais tarde\n' +
    'ou contacte a recepção da clínica.',

  ESCALATE:
    '🔄 Vou transferir a sua conversa para a nossa equipa.\n' +
    'Um membro da recepção irá responder em breve.',

  SESSION_EXPIRED:
    '⏰ A sua sessão expirou por inactividade.\n' +
    'Envie qualquer mensagem para iniciar nova marcação.',

  HELP:
    'Posso ajudá-lo a marcar uma consulta. Envie qualquer mensagem para começar,\n' +
    'ou *CANCELAR #número* para cancelar uma marcação existente.\n' +
    'Envie *AJUDA* para falar com a recepção.',

  REMINDER: ({ patientName, doctorName, when, ref }) =>
    `🔔 Lembrete: Olá ${patientName}, tem uma consulta amanhã.\n\n` +
    `🩺 Médico: ${doctorName}\n` +
    `📅 Quando: ${when}\n` +
    `📋 Referência: #${ref}\n\n` +
    `Para cancelar, envie *CANCELAR #${ref}*.`,
};
