const membersPanel = () => {
  if (!isSupabaseConfigured || !activeTeam) return '';
  const rows = teamMembers.map((member) => `<div class="catalog-row"><div><strong>${member.user_id === authState.user?.id ? 'Tú' : escapeHtml(member.user_id.slice(0, 8))}</strong><span>${member.role}</span></div>${activeRole === 'owner' && member.user_id !== authState.user?.id ? `<div><button class="text-button" data-action="change-role:${member.user_id}:editor">Editor</button><button class="text-button" data-action="change-role:${member.user_id}:viewer">Lector</button><button class="icon-button danger" data-action="remove-member:${member.user_id}" aria-label="Retirar miembro">${icon('trash')}</button></div>` : ''}</div>`).join('');
  const invite = activeRole === 'owner' ? `<form class="member-invite-form" id="member-invite-form"><label>Email<input name="email" type="email" required placeholder="persona@ejemplo.com" /></label><label>Rol<select name="role"><option value="editor">Editor</option><option value="viewer">Lector</option></select></label><button class="button primary" type="submit">Invitar miembro</button></form>` : '<p class="field-hint">Solo el propietario puede gestionar miembros.</p>';
  return `<section class="panel catalog-panel members-panel"><div class="panel-heading"><div><span class="eyebrow">${teamMembers.length} MIEMBROS</span><h2>Personas del equipo</h2></div></div>${rows}${invite}</section>`;
};

import './styles.css';
import { AppData, applySurcharge, balanceForPlayer, createBalanceDeposit, createFineWithBalance, createTransaction, currentAmount, euros, Fine, formatDate, isSurchargeDue, parseAmount, surchargeCount, summary, today, Transaction, uid, whatsappMessage } from './domain';
import { load, loadTeamSnapshot, save, saveTeamSnapshot } from './storage';
import { AuthState, getAuthState, isSupabaseConfigured, requestMagicLink, signOut, subscribeToAuth } from './supabase';
import { acceptTeamInvitation, changeTeamMemberRole, createTeam, inviteTeamMember, listTeamMembers, listTeams, removeTeamMember, subscribeToTeamChanges, Team, TeamMember, TeamRole } from './collaboration';
import { applySurchargeRemote, createBalanceDepositRemote, createFineRemote, createFineTypeRemote, createPlayerRemote, createTransactionRemote, deleteFineRemote, deleteFineTypeRemote, deletePlayerRemote, deleteTransactionRemote, loadRemoteData, markFinePaidRemote, saveRemoteData, setPlayerActiveRemote, updateFineTypeRemote, updateTeamSettingsRemote } from './remoteRepository';

let data: AppData;
let activeView = 'overview';
let toastTimer: number | undefined;
let authState: AuthState = { session: null, user: null };
let authLoading = isSupabaseConfigured;
let authError = '';
let authMessage = '';
let loginBusy = false;
let teams: Team[] = [];
let activeTeam: Team | null = null;
let activeRole: TeamRole = 'viewer';
let teamMembers: TeamMember[] = [];
let syncStatus: 'syncing' | 'synced' | 'offline' | 'error' = isSupabaseConfigured ? 'syncing' : 'offline';
let teamLoading = false;
let teamError = '';
let unsubscribeTeam: () => void = () => undefined;

const app = document.querySelector<HTMLDivElement>('#app')!;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char]!));
const errorMessage = (error: unknown, fallback: string) => {
  const value = error as { message?: string; details?: string; hint?: string; code?: string } | null;
  if (!value || typeof value !== 'object') return fallback;
  const message = value.message || fallback;
  return `${message}${value.code ? ` (${value.code})` : ''}${value.details ? ` · ${value.details}` : ''}${value.hint ? ` · ${value.hint}` : ''}`;
};
const acceptPendingInvitation = async () => {
  const token = new URLSearchParams(window.location.search).get('invite');
  if (!token || !authState.user) return;
  try {
    await acceptTeamInvitation(token);
    window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.hash}`);
    authMessage = 'Invitación aceptada. Ya tienes acceso al equipo.';
  } catch (error) {
    authError = errorMessage(error, 'No se pudo aceptar la invitación');
  }
};
const moneyInput = (cents: number) => (cents / 100).toFixed(2);
const playerName = (id: string) => data.players.find((player) => player.id === id)?.name ?? 'Jugador eliminado';
const showToast = (message: string) => {
  const toast = document.querySelector<HTMLDivElement>('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 2600);
};
const copyToClipboard = async (value: string) => {
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const input = document.createElement('textarea');
  input.value = value;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.focus();
  input.select();
  const copied = document.execCommand('copy');
  input.remove();
  if (!copied) throw new Error('El navegador no permite copiar al portapapeles');
};

const loginView = () => `<main class="login-screen"><section class="login-panel"><div class="brand login-brand"><div class="brand-mark">CC</div><div><strong>Cuenta Clara</strong><span>Control de equipo</span></div></div><span class="eyebrow">ACCESO DEL EQUIPO</span><h1>Entra a tu cuenta</h1><p>Usa tu email para recibir un enlace de acceso seguro. No necesitas contraseña.</p><form id="login-form" class="login-form"><label>Email<input name="email" type="email" autocomplete="email" required placeholder="tu@email.com" /></label><button class="button primary" type="submit" ${loginBusy ? 'disabled' : ''}>${loginBusy ? 'Enviando...' : 'Enviar enlace de acceso'}</button>${authMessage ? `<div class="login-message success">${escapeHtml(authMessage)}</div>` : ''}${authError ? `<div class="login-message error">${escapeHtml(authError)}</div>` : ''}</form></section></main>`;
const teamView = () => `<main class="login-screen"><section class="login-panel team-panel"><div class="brand login-brand"><div class="brand-mark">CC</div><div><strong>Cuenta Clara</strong><span>Control de equipo</span></div></div><span class="eyebrow">EQUIPOS DISPONIBLES</span><h1>Elige tu equipo</h1><p>Selecciona un equipo existente o crea uno nuevo para empezar a colaborar.</p>${teams.length ? `<div class="team-list">${teams.map((team) => `<button class="team-option" data-team-id="${team.id}"><strong>${escapeHtml(team.name)}</strong><span>Equipo compartido</span></button>`).join('')}</div>` : ''}<form id="team-form" class="login-form"><label>${teams.length ? 'Crear otro equipo' : 'Nombre del equipo'}<input name="teamName" required maxlength="120" placeholder="Ej. Los del martes" /></label><button class="button primary" type="submit" ${teamLoading ? 'disabled' : ''}>${teamLoading ? 'Creando...' : 'Crear equipo'}</button>${teamError ? `<div class="login-message error">${escapeHtml(teamError)}</div>` : ''}</form><button class="text-button team-signout" data-action="sign-out">Cerrar sesión</button></section></main>`;

const persist = async (message?: string) => {
  if (isSupabaseConfigured && activeTeam) {
    syncStatus = 'syncing';
    render();
    try { await saveRemoteData(activeTeam.id, data); await saveTeamSnapshot(activeTeam.id, data); syncStatus = 'synced'; } catch (error) { syncStatus = 'error'; throw error; }
  } else await save(data);
  render();
  if (message) showToast(message);
};

const icon = (name: string) => ({
  dashboard: '⌂', users: '♟', book: '▤', settings: '⚙', plus: '+', trash: '×', check: '✓', share: '↗', arrow: '→',
}[name] ?? '•');

const navItem = (id: string, label: string, iconName: string) => `<button class="nav-item ${activeView === id ? 'active' : ''}" data-view="${id}"><span class="nav-icon">${icon(iconName)}</span>${label}</button>`;

const renderSidebar = () => `<aside class="sidebar">
  <div class="brand"><div class="brand-mark">CC</div><div><strong>Cuenta Clara</strong><span>Control de equipo</span></div></div>
  <div class="team-switcher"><span class="eyebrow">EQUIPO ACTIVO</span><strong>${escapeHtml(data.settings.teamName)}</strong><span class="status-dot">● ${syncStatus === 'synced' ? 'Sincronizado' : syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'offline' ? 'Sin conexión' : 'Error de sincronización'} · ${activeRole}</span><button class="team-change-button" data-action="manage-teams">Cambiar equipo</button></div>
  <nav><span class="nav-heading">MENÚ PRINCIPAL</span>${navItem('overview', 'Resumen', 'dashboard')}${navItem('players', 'Jugadores', 'users')}${navItem('fines', 'Multas', 'book')}<span class="nav-heading spaced">CONFIGURACIÓN</span>${navItem('settings', 'Equipo y recargos', 'settings')}</nav>
  <div class="sidebar-foot"><span class="local-badge">⌁</span><div><strong>${isSupabaseConfigured ? 'Sesión activa' : 'Modo local'}</strong><small>${isSupabaseConfigured ? escapeHtml(authState.user?.email ?? '') : 'Tus datos no salen del dispositivo'}</small></div>${isSupabaseConfigured ? '<button class="logout-button" data-action="sign-out">Cerrar sesión</button>' : ''}</div>
</aside>`;

const header = (kicker: string, title: string, subtitle: string, action = '') => `<header class="page-header"><div><span class="eyebrow">${kicker}</span><h1>${title}</h1><p>${subtitle}</p></div>${action}</header>`;
const button = (label: string, action: string, className = 'button primary', extra = '') => {
  const readOnlyAction = activeRole === 'viewer' && /^(add-|delete-|edit-|toggle-|pay-fine:|apply-surcharge:|confirm-)/.test(action);
  return `<button class="${className}" data-action="${action}" ${readOnlyAction ? 'disabled ' : ''}${extra}>${label}</button>`;
};

const dashboard = () => {
  const totals = summary(data);
  const pending = data.fines.filter((fine) => fine.status === 'pending');
  const recent = [...data.fines].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const max = totals.ranking[0]?.amount ?? 1;
  const totalIncomeCents = totals.collectedPaidCents + totals.manualIncomeCents + totals.balanceIncomeCents;
  return `${header('VISTA GENERAL', 'El pulso del equipo', 'Una mirada rápida a lo que está pendiente y a lo que ya se ha recaudado.', `${button(`${icon('plus')} Movimiento`, 'add-transaction', 'button primary')} ${button(`${icon('share')} Compartir pendientes`, 'share', 'button dark')}`)}
    <section class="metric-grid"><article class="metric-card amber"><span class="metric-label">PENDIENTE DE PAGO</span><strong>${euros(totals.pendingCents)}</strong><span class="metric-note">${pending.length} ${pending.length === 1 ? 'multa activa' : 'multas activas'}</span></article><article class="metric-card green"><span class="metric-label">SALDO DEL BOTE</span><strong>${euros(totals.balanceCents)}</strong><span class="metric-note">Multas, aportaciones y gastos</span></article><article class="metric-card blue"><span class="metric-label">INGRESOS</span><strong>${euros(totalIncomeCents)}</strong><span class="metric-note">${data.fines.filter((fine) => fine.status === 'paid').length} pagos y ${data.transactions.filter((transaction) => transaction.type === 'income').length + data.balanceMovements.filter((movement) => movement.type === 'deposit').length} aportaciones</span></article><article class="metric-card rose"><span class="metric-label">GASTOS</span><strong>${euros(totals.expenseCents)}</strong><span class="metric-note">${data.transactions.filter((transaction) => transaction.type === 'expense').length} movimientos</span></article></section>
    <section class="content-grid"><article class="panel ranking-panel"><div class="panel-heading"><div><span class="eyebrow">CONTABILIDAD</span><h2>Ranking de recaudación</h2></div><button class="icon-button" data-view="players" aria-label="Ver jugadores">${icon('arrow')}</button></div>${totals.ranking.length ? totals.ranking.map((entry, index) => `<div class="rank-row"><span class="rank-number">${String(index + 1).padStart(2, '0')}</span><div class="avatar">${escapeHtml(entry.player.name.slice(0, 2).toUpperCase())}</div><div class="rank-person"><strong>${escapeHtml(entry.player.name)}</strong><span>${totalIncomeCents > 0 ? Math.round((entry.amount / totalIncomeCents) * 100) : 0}% del total</span></div><div class="rank-bar"><i style="width:${Math.max(8, (entry.amount / max) * 100)}%"></i></div><strong class="rank-amount">${euros(entry.amount)}</strong></div>`).join('') : `<div class="empty-state compact">Aún no hay pagos registrados.<br><span>El ranking aparecerá aquí al cobrar la primera multa.</span></div>`}</article>
      <article class="panel recent-panel"><div class="panel-heading"><div><span class="eyebrow">ACTIVIDAD</span><h2>Últimas multas</h2></div>${button('Ver todas', 'fines', 'text-button')}</div>${recent.length ? recent.map((fine) => fineRow(fine)).join('') : `<div class="empty-state">${icon('book')}<strong>Tu historial está limpio</strong><span>Las nuevas multas aparecerán aquí.</span></div>`}</article></section>`;
};

const fineRow = (fine: Fine) => `<div class="fine-row"><div class="fine-date">${formatDate(fine.date).slice(0, 5)}</div><div class="fine-main"><strong>${escapeHtml(fine.description)}</strong><span>${escapeHtml(playerName(fine.playerId))}</span></div><span class="pill ${fine.status}">${fine.status === 'paid' ? 'Pagada' : 'Pendiente'}</span><strong class="fine-amount">${euros(currentAmount(fine, data.settings))}</strong></div>`;

const playersView = () => `${header('PLANTILLA', 'Jugadores', 'Gestiona quién forma parte del equipo y consulta su actividad.', button(`${icon('plus')} Añadir jugador`, 'add-player', 'button dark'))}<section class="panel table-panel"><div class="panel-heading"><div><span class="eyebrow">${data.players.length} REGISTROS</span><h2>Plantilla del equipo</h2></div></div>${data.players.length ? `<div class="table-head"><span>JUGADOR</span><span>ESTADO</span><span>SALDO</span><span>MULTAS</span><span></span></div>${data.players.map((player) => { const fines = data.fines.filter((fine) => fine.playerId === player.id); return `<div class="player-row"><div class="avatar">${escapeHtml(player.name.slice(0, 2).toUpperCase())}</div><strong>${escapeHtml(player.name)}</strong><span class="pill ${player.active ? 'active' : 'inactive'}">${player.active ? 'Activo' : 'Inactivo'}</span><span class="player-balance">${euros(balanceForPlayer(data, player.id))}</span><span>${fines.length} ${fines.length === 1 ? 'multa' : 'multas'}</span><div class="row-actions">${button('Añadir saldo', `add-balance:${player.id}`, 'text-button')}${button(player.active ? 'Desactivar' : 'Activar', `toggle-player:${player.id}`, 'text-button')}${button(icon('trash'), `delete-player:${player.id}`, 'icon-button danger', `aria-label="Eliminar ${escapeHtml(player.name)}"`)}</div></div>`; }).join('')}` : `<div class="empty-state">${icon('users')}<strong>Aún no hay jugadores</strong><span>Añade la plantilla para empezar a registrar multas.</span>${button(`${icon('plus')} Añadir primer jugador`, 'add-player', 'button primary')}</div>`}</section>`;

const transactionCard = (transaction: Transaction) => `<div class="transaction-card ${transaction.type}"><div class="fine-date large">${formatDate(transaction.date)}</div><div class="fine-main"><strong>${escapeHtml(transaction.description)}</strong><span>${transaction.type === 'income' ? 'Aportación al bote' : 'Gasto del equipo'}</span></div><strong class="transaction-amount">${transaction.type === 'income' ? '+' : '-'}${euros(transaction.amountCents)}</strong>${button(icon('trash'), `delete-transaction:${transaction.id}`, 'icon-button danger', `aria-label="Eliminar ${escapeHtml(transaction.description)}"`)}</div>`;

const transactionForm = () => openModal(`<form class="modal-form" id="transaction-form"><button type="button" class="modal-close" data-close>×</button><span class="eyebrow">MOVIMIENTO DEL BOTE</span><h2>Añadir transacción</h2><p class="modal-intro">Registra una aportación o un gasto sin modificar ninguna multa.</p><label>Tipo<select name="type" required><option value="income">Ingreso / aportación</option><option value="expense">Gasto del equipo</option></select></label><label>Descripción<input name="description" required maxlength="100" placeholder="Ej. Ronda de bebidas" /></label><label>Importe<div class="input-prefix"><span>€</span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="10.00" /></div></label><label>Fecha<input name="date" type="date" value="${today()}" required /></label><div class="modal-actions"><button type="button" class="button ghost" data-close>Cancelar</button><button class="button primary">Guardar movimiento</button></div></form>`);
const balanceForm = (playerId: string) => openModal(`<form class="modal-form" id="balance-form"><input type="hidden" name="playerId" value="${playerId}"><button type="button" class="modal-close" data-close>×</button><span class="eyebrow">SALDO PRECARGADO</span><h2>Añadir saldo a ${escapeHtml(playerName(playerId))}</h2><p class="modal-intro">Esta aportación entra en el bote y podrá cubrir sus próximas multas.</p><label>Descripción<input name="description" required maxlength="100" placeholder="Ej. Cuota de marzo" /></label><label>Importe<div class="input-prefix"><span>€</span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="10.00" /></div></label><label>Fecha<input name="date" type="date" value="${today()}" required /></label><div class="modal-actions"><button type="button" class="button ghost" data-close>Cancelar</button><button class="button primary">Guardar saldo</button></div></form>`);

const finesView = () => {
  const pending = data.fines.filter((fine) => fine.status === 'pending').sort((a, b) => b.date.localeCompare(a.date));
  const paid = data.fines.filter((fine) => fine.status === 'paid').sort((a, b) => b.date.localeCompare(a.date));
  const transactions = [...data.transactions].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const balanceMovements = [...data.balanceMovements].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  return `${header('REGISTRO', 'Multas y movimientos', 'Añade cargos, registra pagos y mantén trazable cada movimiento del bote.', `${button(`${icon('plus')} Movimiento`, 'add-transaction', 'button primary')} ${button(`${icon('plus')} Nueva multa`, 'add-fine', 'button dark')}`)}<section class="panel table-panel"><div class="panel-heading"><div><span class="eyebrow">${pending.length} PENDIENTES</span><h2>Por cobrar</h2></div>${pending.length ? button(`${icon('share')} Compartir`, 'share', 'text-button') : ''}</div>${pending.length ? pending.map((fine) => fineCard(fine, true)).join('') : `<div class="empty-state compact">No hay multas pendientes. Buen trabajo.</div>`}</section><section class="panel table-panel history"><div class="panel-heading"><div><span class="eyebrow">HISTÓRICO DE MULTAS</span><h2>Pagadas</h2></div><span class="history-total">${euros(summary(data).paidCents)} recaudados</span></div>${paid.length ? paid.map((fine) => fineCard(fine, false)).join('') : `<div class="empty-state compact">Aún no hay pagos en el histórico.</div>`}</section><section class="panel table-panel history"><div class="panel-heading"><div><span class="eyebrow">${transactions.length + balanceMovements.length} MOVIMIENTOS</span><h2>Ingresos, gastos y saldos</h2></div><span class="history-total">Saldo ${euros(summary(data).balanceCents)}</span></div>${transactions.map(transactionCard).join('')}${balanceMovements.map((movement) => `<div class="transaction-card ${movement.type === 'deposit' ? 'income' : 'consumption'}"><div class="fine-date large">${formatDate(movement.date)}</div><div class="fine-main"><strong>${escapeHtml(movement.description)}</strong><span>${movement.type === 'deposit' ? `Saldo de ${escapeHtml(playerName(movement.playerId))}` : `Consumo de ${escapeHtml(playerName(movement.playerId))}${movement.fineId ? ' · multa asociada' : ''}`}</span></div><strong class="transaction-amount">${movement.type === 'deposit' ? '+' : '-'}${euros(movement.amountCents)}</strong></div>`).join('')}${transactions.length + balanceMovements.length === 0 ? `<div class="empty-state compact">Aún no hay aportaciones ni gastos registrados.</div>` : ''}</section>`;
};

const fineCard = (fine: Fine, pending: boolean) => { const due = pending && isSurchargeDue(fine, data.settings); const applications = fine.surchargeApplications; return `<div class="fine-card ${due ? 'overdue' : ''}"><div class="fine-date large">${formatDate(fine.date)}</div><div class="fine-main"><strong>${escapeHtml(fine.description)}</strong><span>${escapeHtml(playerName(fine.playerId))}${surchargeCount(fine) ? ` · ${surchargeCount(fine)} ${surchargeCount(fine) === 1 ? 'recargo' : 'recargos'}` : ''}</span>${applications.length ? `<small class="surcharge-history">Aplicado: ${applications.map((application) => formatDate(application.appliedAt)).join(', ')}</small>` : ''}${due ? '<small class="surcharge-warning">Período de recargo vencido</small>' : ''}</div><div class="fine-card-right"><strong>${euros(currentAmount(fine, data.settings))}</strong><span class="pill ${fine.status}">${pending ? 'Pendiente' : `Pagada ${fine.paidAt ? formatDate(fine.paidAt) : ''}`}</span></div>${due ? button('Aplicar recargo', `apply-surcharge:${fine.id}`, 'button small surcharge-action') : ''}${pending ? button('Marcar pagada', `pay-fine:${fine.id}`, 'button small primary') : ''}${button(icon('trash'), `delete-fine:${fine.id}`, 'icon-button danger', 'aria-label="Eliminar multa"')}</div>`; };

const settingsView = () => `${header('CONFIGURACIÓN', 'Equipo y recargos', 'Define las reglas que utiliza Cuenta Clara para calcular cada multa.', '')}<section class="settings-layout"><div><form class="panel form-panel" id="settings-form"><span class="eyebrow">IDENTIDAD DEL EQUIPO</span><h2>Datos principales</h2><label>Nombre del equipo<input name="teamName" value="${escapeHtml(data.settings.teamName)}" required maxlength="60" /></label><div class="divider"></div><span class="eyebrow">PAGO TARDÍO</span><div class="toggle-line"><div><strong>Habilitar recargos</strong><span>Se avisa cuando vence el período y tú decides cuándo aplicarlo.</span></div><label class="switch"><input type="checkbox" name="lateFeesEnabled" ${data.settings.lateFeesEnabled ? 'checked' : ''}><span></span></label></div><label>Importe del recargo<div class="input-prefix"><span>€</span><input name="weeklySurcharge" type="number" min="0.01" step="0.01" value="${moneyInput(data.settings.weeklySurchargeCents)}" required /></div></label><label>Período hasta el siguiente recargo<input name="surchargePeriodDays" type="number" min="1" step="1" value="${data.settings.surchargePeriodDays}" required /><small class="field-hint">Días desde la multa o desde el último recargo aplicado.</small></label><button class="button primary" type="submit">Guardar configuración</button></form><section class="panel catalog-panel"><div class="panel-heading"><div><span class="eyebrow">CATÁLOGO</span><h2>Tipos de multa</h2></div>${button(`${icon('plus')} Nueva regla`, 'add-type', 'text-button')}</div>${data.fineTypes.length ? data.fineTypes.map((type) => `<div class="catalog-row"><div><strong>${escapeHtml(type.description)}</strong><span>${euros(type.amountCents)} predeterminados</span></div><div><button class="text-button" data-action="edit-type:${type.id}">Editar</button><button class="icon-button danger" data-action="delete-type:${type.id}" aria-label="Eliminar regla">${icon('trash')}</button></div></div>`).join('') : '<div class="empty-state compact">Crea reglas habituales para registrar multas más rápido.</div>'}</section></div><aside class="tip-card"><span class="tip-icon">✦</span><strong>Una regla clara</strong><p>Los recargos se aplican al cumplirse cada período configurado y siempre requieren confirmación.</p></aside></section>`;

const overviewModal = (content: string) => `<div class="modal-backdrop"><div class="modal">${content}</div></div>`;
const render = () => {
    if (activeView === 'settings' && isSupabaseConfigured && activeTeam) queueMicrotask(() => document.querySelector('.settings-layout > div')?.insertAdjacentHTML('afterbegin', membersPanel()));
  if (isSupabaseConfigured && authLoading) { app.innerHTML = '<main class="login-screen"><div class="login-loading">Comprobando sesión...</div></main>'; return; }
  if (isSupabaseConfigured && !authState.user) { app.innerHTML = loginView(); return; }
  if (isSupabaseConfigured && !activeTeam) { app.innerHTML = teamView(); return; }
  app.innerHTML = `<div class="app-shell">${renderSidebar()}<main class="main-content"><div class="mobile-top"><div class="brand-mark">CC</div><strong>Cuenta Clara</strong>${isSupabaseConfigured ? '<button class="logout-button mobile-logout" data-action="sign-out">Cerrar sesión</button><button class="logout-button" data-action="manage-teams">Cambiar equipo</button>' : ''}<button class="icon-button" data-view="settings">${icon('settings')}</button></div><div class="content-wrap">${activeView === 'overview' ? dashboard() : activeView === 'players' ? playersView() : activeView === 'fines' ? finesView() : settingsView()}</div></main></div><div id="toast" class="toast"></div>`;
};

const loadTeams = async () => {
  teamLoading = true;
  teamError = '';
  render();
  try {
    teams = await listTeams();
    if (teams[0]) await selectTeam(teams[0]);
  } catch (error) {
    teamError = error instanceof Error ? error.message : 'No se pudieron cargar los equipos';
  } finally {
    teamLoading = false;
    render();
  }
};

const selectTeam = async (team: Team) => {
  teamLoading = true;
  teamError = '';
  render();
  try {
    const remoteData = await loadRemoteData(team.id);
    await saveTeamSnapshot(team.id, remoteData);
    syncStatus = 'synced';
    teamMembers = await listTeamMembers(team.id);
    activeRole = teamMembers.find((member) => member.user_id === authState.user?.id)?.role ?? 'viewer';
    unsubscribeTeam();
    activeTeam = team;
    data = remoteData;
    unsubscribeTeam = subscribeToTeamChanges(team.id, async () => {
      try { data = await loadRemoteData(team.id); teamMembers = await listTeamMembers(team.id); await saveTeamSnapshot(team.id, data); syncStatus = 'synced'; render(); } catch (error) { syncStatus = 'error'; teamError = error instanceof Error ? error.message : 'No se pudieron actualizar los datos'; render(); }
    });
  } catch (error) {
    const cached = await loadTeamSnapshot(team.id).catch(() => null);
    if (cached) { activeTeam = team; data = cached; syncStatus = 'offline'; teamError = 'Mostrando la última copia local; no se pudo conectar con PostgreSQL'; }
    else { syncStatus = 'error'; teamError = error instanceof Error ? error.message : 'No se pudo cargar el equipo'; }
  } finally {
    teamLoading = false;
    render();
  }
};

const openModal = (content: string) => { document.body.insertAdjacentHTML('beforeend', overviewModal(content)); };
const closeModal = () => document.querySelector('.modal-backdrop')?.remove();
const playerOptions = () => data.players.filter((player) => player.active).map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`).join('');
const typeOptions = () => data.fineTypes.map((type) => `<option value="${type.id}">${escapeHtml(type.description)} · ${euros(type.amountCents)}</option>`).join('');

const playerForm = () => openModal(`<form class="modal-form" id="player-form"><button type="button" class="modal-close" data-close>×</button><span class="eyebrow">NUEVO REGISTRO</span><h2>Añadir jugador</h2><p class="modal-intro">Solo necesitas su nombre. No tendrá que iniciar sesión.</p><label>Nombre completo<input name="name" autofocus required maxlength="60" placeholder="Ej. Carlos Martín" /></label><div class="modal-actions"><button type="button" class="button ghost" data-close>Cancelar</button><button class="button primary">Guardar jugador</button></div></form>`);
const fineForm = () => { if (!data.players.some((player) => player.active)) { showToast('Añade un jugador activo antes de crear una multa'); activeView = 'players'; render(); return; } openModal(`<form class="modal-form" id="fine-form"><button type="button" class="modal-close" data-close>×</button><span class="eyebrow">NUEVA MULTA</span><h2>Registrar una multa</h2><p class="modal-intro">La descripción y el importe quedan guardados en este registro.</p><label>Jugador<select name="playerId" required>${playerOptions()}</select></label><label>Tipo de multa<select name="typeId"><option value="">Selecciona del catálogo...</option>${typeOptions()}</select></label><label>Descripción<input name="description" required maxlength="80" placeholder="Ej. Llegar tarde" /></label><label>Importe<div class="input-prefix"><span>€</span><input name="amount" type="number" min="0.01" step="0.01" required placeholder="10.00" /></div></label><label>Fecha<input name="date" type="date" value="${today()}" required /></label><div class="modal-actions"><button type="button" class="button ghost" data-close>Cancelar</button><button class="button primary">Crear multa</button></div></form>`); };
const typeForm = (typeId?: string) => { const type = data.fineTypes.find((entry) => entry.id === typeId); openModal(`<form class="modal-form" id="type-form"><input type="hidden" name="typeId" value="${type?.id ?? ''}"><button type="button" class="modal-close" data-close>×</button><span class="eyebrow">CATÁLOGO</span><h2>${type ? 'Editar regla' : 'Nueva regla de multa'}</h2><label>Descripción<input name="description" value="${escapeHtml(type?.description ?? '')}" required maxlength="80" placeholder="Ej. No traer equipación" /></label><label>Importe predeterminado<div class="input-prefix"><span>€</span><input name="amount" type="number" min="0.01" step="0.01" value="${type ? moneyInput(type.amountCents) : ''}" required /></div></label><div class="modal-actions"><button type="button" class="button ghost" data-close>Cancelar</button><button class="button primary">Guardar regla</button></div></form>`); };

const confirmAction = (title: string, description: string, action: string, label = 'Eliminar definitivamente') => openModal(`<div class="modal-form"><button type="button" class="modal-close" data-close>×</button><span class="eyebrow">CONFIRMAR ACCIÓN</span><h2>${title}</h2><p class="modal-intro">${description}</p><div class="modal-actions"><button class="button ghost" data-close>Cancelar</button><button class="button ${label === 'Aplicar recargo' || label === 'Marcar multa como pagada' ? 'primary' : 'danger-fill'}" data-action="${action}">${label}</button></div></div>`);

const share = async () => { const text = whatsappMessage(data); try { if (navigator.share) await navigator.share({ title: `${data.settings.teamName} · multas`, text }); else throw new Error('share unavailable'); } catch (error) { if (error instanceof Error && error.name === 'AbortError') return; await navigator.clipboard?.writeText(text); window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener'); showToast('Mensaje copiado. Abriendo WhatsApp...'); } };

document.addEventListener('click', async (event) => {
  const target = event.target as HTMLElement;
  const teamId = target.closest<HTMLElement>('[data-team-id]')?.dataset.teamId;
  if (teamId) { const team = teams.find((entry) => entry.id === teamId); if (team) await selectTeam(team); return; }
  const view = target.closest<HTMLElement>('[data-view]')?.dataset.view;
  if (view) { activeView = view; render(); return; }
  const action = target.closest<HTMLElement>('[data-action]')?.dataset.action;
  if (!action) { if (target.matches('[data-close]')) closeModal(); return; }
  if (action === 'sign-out') { await signOut(); return; }
  if (action === 'manage-teams') { activeTeam = null; render(); return; }
  if (action === 'add-player') playerForm();
  else if (action === 'add-fine') fineForm();
  else if (action === 'add-transaction') transactionForm();
  else if (action === 'fines') { activeView = 'fines'; render(); }
  else if (action.startsWith('add-balance:')) balanceForm(action.split(':')[1]);
  else if (action === 'add-type') typeForm();
  else if (action === 'share') await share();
  else if (action.startsWith('change-role:') && activeTeam && activeRole === 'owner') { const [, userId, role] = action.split(':'); try { await changeTeamMemberRole(activeTeam.id, userId, role as TeamRole); teamMembers = await listTeamMembers(activeTeam.id); render(); showToast('Rol actualizado'); } catch (error) { showToast(errorMessage(error, 'No se pudo cambiar el rol')); } }
  else if (action.startsWith('remove-member:') && activeTeam && activeRole === 'owner') { const userId = action.split(':')[1]; try { await removeTeamMember(activeTeam.id, userId); teamMembers = await listTeamMembers(activeTeam.id); render(); showToast('Miembro retirado'); } catch (error) { showToast(errorMessage(error, 'No se pudo retirar al miembro')); } }
  else if (action.startsWith('toggle-player:')) { const player = data.players.find((entry) => entry.id === action.split(':')[1]); if (player) { const active = !player.active; if (isSupabaseConfigured && activeTeam) { try { await setPlayerActiveRemote(activeTeam.id, player.id, active); data = await loadRemoteData(activeTeam.id); render(); showToast(active ? 'Jugador activado' : 'Jugador desactivado'); } catch (error) { showToast(errorMessage(error, 'No se pudo actualizar el jugador')); } } else { player.active = active; await persist(active ? 'Jugador activado' : 'Jugador desactivado'); } } }
  else if (action.startsWith('pay-fine:')) { const fine = data.fines.find((entry) => entry.id === action.split(':')[1]); if (fine) confirmAction('¿Registrar este pago?', `Se marcará como pagada por ${euros(currentAmount(fine, data.settings))}.`, `confirm-pay:${fine.id}`, 'Marcar multa como pagada'); }
  else if (action.startsWith('apply-surcharge:')) { const fine = data.fines.find((entry) => entry.id === action.split(':')[1]); if (fine && isSurchargeDue(fine, data.settings)) confirmAction('¿Aplicar este recargo?', `Se añadirán ${euros(data.settings.weeklySurchargeCents)} y se registrará la fecha de aplicación.`, `confirm-apply-surcharge:${fine.id}`, 'Aplicar recargo'); }
  else if (action.startsWith('delete-fine:')) { const fine = data.fines.find((entry) => entry.id === action.split(':')[1]); if (fine) confirmAction('¿Eliminar esta multa?', `${playerName(fine.playerId)} · ${fine.description} · ${euros(currentAmount(fine, data.settings))}. Esta acción no se puede deshacer.`, `confirm-delete-fine:${fine.id}`); }
  else if (action.startsWith('delete-transaction:')) { const transaction = data.transactions.find((entry) => entry.id === action.split(':')[1]); if (transaction) confirmAction('¿Eliminar este movimiento?', `${transaction.description} · ${transaction.type === 'income' ? '+' : '-'}${euros(transaction.amountCents)}. Esta acción no se puede deshacer.`, `confirm-delete-transaction:${transaction.id}`); }
  else if (action.startsWith('delete-player:')) { const player = data.players.find((entry) => entry.id === action.split(':')[1]); if (player) { const hasFines = data.fines.some((fine) => fine.playerId === player.id); confirmAction(hasFines ? '¿Desactivar este jugador?' : '¿Eliminar este jugador?', hasFines ? `${player.name} tiene multas asociadas y se conservará para proteger el histórico.` : `${player.name}. Esta acción no se puede deshacer.`, `${hasFines ? 'confirm-deactivate-player' : 'confirm-delete-player'}:${player.id}`, hasFines ? 'Desactivar jugador' : undefined); } }
  else if (action.startsWith('edit-type:')) typeForm(action.split(':')[1]);
  else if (action.startsWith('delete-type:')) { const type = data.fineTypes.find((entry) => entry.id === action.split(':')[1]); if (type) confirmAction('¿Eliminar esta regla?', `${type.description} · ${euros(type.amountCents)}. Las multas ya registradas no cambiarán.`, `confirm-delete-type:${type.id}`); }
  else if (action.startsWith('confirm-pay:')) { const fineId = action.split(':')[1]; const fine = data.fines.find((entry) => entry.id === fineId); if (fine) { closeModal(); if (isSupabaseConfigured && activeTeam) { await markFinePaidRemote(activeTeam.id, fineId); data = await loadRemoteData(activeTeam.id); render(); showToast('Pago registrado'); } else { const remaining = currentAmount(fine, data.settings); fine.paidAmountCents = (fine.paidAmountCents ?? 0) + remaining; fine.finalAmountCents = fine.paidAmountCents; fine.status = 'paid'; fine.paidAt = today(); await persist('Pago registrado'); } } }
  else if (action.startsWith('confirm-apply-surcharge:')) { const fineId = action.split(':')[1]; closeModal(); if (isSupabaseConfigured && activeTeam) { await applySurchargeRemote(activeTeam.id, fineId); data = await loadRemoteData(activeTeam.id); render(); showToast('Recargo aplicado'); } else { const updated = applySurcharge(data, fineId); if (!updated) { showToast('El período de recargo todavía no ha vencido'); return; } data = updated; await persist('Recargo aplicado'); } }
  else if (action.startsWith('confirm-delete-fine:')) { const fineId = action.split(':')[1]; closeModal(); if (isSupabaseConfigured && activeTeam) { try { await deleteFineRemote(activeTeam.id, fineId); data = await loadRemoteData(activeTeam.id); render(); showToast('Multa eliminada'); } catch (error) { showToast(errorMessage(error, 'No se pudo eliminar la multa')); } } else { data.fines = data.fines.filter((fine) => fine.id !== fineId); await persist('Multa eliminada'); } }
  else if (action.startsWith('confirm-delete-transaction:')) { const transactionId = action.split(':')[1]; closeModal(); if (isSupabaseConfigured && activeTeam) { try { await deleteTransactionRemote(activeTeam.id, transactionId); data = await loadRemoteData(activeTeam.id); render(); showToast('Movimiento eliminado'); } catch (error) { showToast(errorMessage(error, 'No se pudo eliminar el movimiento')); } } else { data.transactions = data.transactions.filter((transaction) => transaction.id !== transactionId); await persist('Movimiento eliminado'); } }
  else if (action.startsWith('confirm-delete-player:')) { const playerId = action.split(':')[1]; closeModal(); if (isSupabaseConfigured && activeTeam) { try { await deletePlayerRemote(activeTeam.id, playerId); data = await loadRemoteData(activeTeam.id); render(); showToast('Jugador eliminado'); } catch (error) { showToast(errorMessage(error, 'No se pudo eliminar el jugador')); } } else { data.players = data.players.filter((player) => player.id !== playerId); await persist('Jugador eliminado'); } }
  else if (action.startsWith('confirm-deactivate-player:')) { const playerId = action.split(':')[1]; closeModal(); if (isSupabaseConfigured && activeTeam) { try { await setPlayerActiveRemote(activeTeam.id, playerId, false); data = await loadRemoteData(activeTeam.id); render(); showToast('Jugador desactivado'); } catch (error) { showToast(errorMessage(error, 'No se pudo desactivar el jugador')); } } else { const player = data.players.find((entry) => entry.id === playerId); if (player) { player.active = false; await persist('Jugador desactivado'); } } }
  else if (action.startsWith('confirm-delete-type:')) { const typeId = action.split(':')[1]; closeModal(); if (isSupabaseConfigured && activeTeam) { try { await deleteFineTypeRemote(activeTeam.id, typeId); data = await loadRemoteData(activeTeam.id); render(); showToast('Regla eliminada'); } catch (error) { showToast(errorMessage(error, 'No se pudo eliminar la regla')); } } else { data.fineTypes = data.fineTypes.filter((type) => type.id !== typeId); await persist('Regla eliminada'); } }
});

document.addEventListener('change', (event) => { const target = event.target as HTMLSelectElement; if (target.name === 'typeId') { const type = data.fineTypes.find((entry) => entry.id === target.value); const form = target.closest('form'); if (type && form) { (form.elements.namedItem('description') as HTMLInputElement).value = type.description; (form.elements.namedItem('amount') as HTMLInputElement).value = moneyInput(type.amountCents); } } });
document.addEventListener('submit', async (event) => { event.preventDefault(); const form = event.target as HTMLFormElement; const values = new FormData(form);
  if (form.id === 'login-form') { const email = String(values.get('email') ?? '').trim(); if (!email) return; loginBusy = true; authError = ''; authMessage = ''; render(); try { await requestMagicLink(email, window.location.href); authMessage = 'Revisa tu correo para continuar.'; } catch (error) { authError = error instanceof Error ? error.message : 'No se pudo enviar el enlace de acceso'; } finally { loginBusy = false; render(); } return; }
  if (form.id === 'team-form') { const name = String(values.get('teamName') ?? '').trim(); if (!name) return; teamLoading = true; teamError = ''; render(); try { const team = await createTeam(name); teams = [...teams, team]; await selectTeam(team); } catch (error) { teamError = errorMessage(error, 'No se pudo crear el equipo'); } finally { teamLoading = false; render(); } return; }
  if (form.id === 'member-invite-form' && activeTeam && activeRole === 'owner') { const email = String(values.get('email') ?? '').trim(); const role = String(values.get('role') ?? 'editor') as TeamRole; try { const invitation = await inviteTeamMember(activeTeam.id, email, role); const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${encodeURIComponent(invitation.token)}`; await copyToClipboard(inviteUrl); showToast('Enlace de invitación copiado en el portapapeles'); } catch (error) { showToast(errorMessage(error, 'No se pudo crear o copiar la invitación')); } return; }
  if (form.id === 'player-form') { const name = String(values.get('name') ?? '').trim(); if (!name) return; const player = { id: uid(), name, active: true }; activeView = 'players'; if (isSupabaseConfigured && activeTeam) { try { await createPlayerRemote(activeTeam.id, player); data = await loadRemoteData(activeTeam.id); closeModal(); render(); showToast('Jugador añadido'); } catch (error) { showToast(errorMessage(error, 'No se pudo añadir el jugador')); } } else { data.players.push(player); closeModal(); await persist('Jugador añadido'); } }
  if (form.id === 'type-form') { const description = String(values.get('description') ?? '').trim(); const amountCents = parseAmount(String(values.get('amount') ?? '')); const typeId = String(values.get('typeId') ?? ''); if (!description || !amountCents) return showToast('Introduce una descripción y un importe válido'); const type = { id: typeId || uid(), description, amountCents }; const existing = data.fineTypes.find((entry) => entry.id === typeId); activeView = 'settings'; if (isSupabaseConfigured && activeTeam) { try { if (existing) await updateFineTypeRemote(activeTeam.id, type); else await createFineTypeRemote(activeTeam.id, type); data = await loadRemoteData(activeTeam.id); closeModal(); render(); showToast(existing ? 'Regla actualizada' : 'Regla guardada'); } catch (error) { showToast(errorMessage(error, 'No se pudo guardar la regla')); } } else { if (existing) { existing.description = description; existing.amountCents = amountCents; } else data.fineTypes.push(type); closeModal(); await persist(existing ? 'Regla actualizada' : 'Regla guardada'); } }
  if (form.id === 'fine-form') { const description = String(values.get('description') ?? '').trim(); const amountCents = parseAmount(String(values.get('amount') ?? '')); const playerId = String(values.get('playerId') ?? ''); const date = String(values.get('date') ?? ''); if (!description || !amountCents || !playerId || !date) return showToast('Completa todos los campos'); const fine: Fine = { id: uid(), playerId, description, baseAmountCents: amountCents, date, status: 'pending', surchargeWeeks: 0, surchargeApplications: [] }; activeView = 'fines'; if (isSupabaseConfigured && activeTeam) { try { await createFineRemote(activeTeam.id, fine); data = await loadRemoteData(activeTeam.id); closeModal(); render(); showToast('Multa registrada'); } catch (error) { showToast(errorMessage(error, 'No se pudo registrar la multa')); } } else { closeModal(); const updated = createFineWithBalance(data, fine); const consumed = updated.balanceMovements.length - data.balanceMovements.length; const createdFine = updated.fines.at(-1)!; data = updated; await persist(consumed ? (createdFine.status === 'paid' ? 'Multa pagada con saldo' : `Saldo aplicado; queda ${euros(currentAmount(createdFine, data.settings))} pendiente`) : 'Multa registrada'); } }
  if (form.id === 'transaction-form') { const type = String(values.get('type') ?? ''); const description = String(values.get('description') ?? ''); const amountCents = parseAmount(String(values.get('amount') ?? '')); const date = String(values.get('date') ?? ''); const transaction = createTransaction(type as 'income' | 'expense', amountCents, description, date); if (!transaction) return showToast('Introduce un tipo, importe, descripción y fecha válidos'); activeView = 'fines'; if (isSupabaseConfigured && activeTeam) { try { await createTransactionRemote(activeTeam.id, transaction); data = await loadRemoteData(activeTeam.id); closeModal(); render(); showToast('Movimiento guardado'); } catch (error) { showToast(errorMessage(error, 'No se pudo guardar el movimiento')); } } else { data.transactions.push(transaction); closeModal(); await persist('Movimiento guardado'); } }
  if (form.id === 'balance-form') { const playerId = String(values.get('playerId') ?? ''); const description = String(values.get('description') ?? ''); const amountCents = parseAmount(String(values.get('amount') ?? '')); const date = String(values.get('date') ?? ''); const updated = createBalanceDeposit(data, playerId, amountCents, description, date); if (!updated) return showToast('Introduce jugador, importe, descripción y fecha válidos'); const movement = updated.balanceMovements.at(-1)!; activeView = 'players'; if (isSupabaseConfigured && activeTeam) { try { await createBalanceDepositRemote(activeTeam.id, movement); data = await loadRemoteData(activeTeam.id); closeModal(); render(); showToast('Saldo precargado'); } catch (error) { showToast(errorMessage(error, 'No se pudo guardar el saldo')); } } else { data = updated; closeModal(); await persist('Saldo precargado'); } }
  if (form.id === 'settings-form') { const teamName = String(values.get('teamName') ?? '').trim(); const weeklySurchargeCents = parseAmount(String(values.get('weeklySurcharge') ?? '')); const surchargePeriodDays = Number(values.get('surchargePeriodDays')); if (!teamName || !weeklySurchargeCents || !Number.isInteger(surchargePeriodDays) || surchargePeriodDays <= 0) return showToast('Revisa el nombre, el recargo y el período en días'); const settings = { teamName, weeklySurchargeCents, surchargePeriodDays, lateFeesEnabled: values.get('lateFeesEnabled') === 'on' }; if (isSupabaseConfigured && activeTeam) { try { await updateTeamSettingsRemote(activeTeam.id, settings); data = await loadRemoteData(activeTeam.id); render(); showToast('Configuración guardada'); } catch (error) { showToast(errorMessage(error, 'No se pudo guardar la configuración')); } } else { data.settings = settings; await persist('Configuración guardada'); } }
});

const init = async () => {
  if (isSupabaseConfigured) {
    subscribeToAuth(async (state) => {
      authState = state;
      authError = '';
      authMessage = '';
      activeTeam = null;
      teams = [];
      unsubscribeTeam();
      if (state.user) { await acceptPendingInvitation(); await loadTeams(); }
      render();
    });
    authState = await getAuthState();
    authLoading = false;
    if (authState.user) { await acceptPendingInvitation(); await loadTeams(); }
  }
  if (!isSupabaseConfigured) { data = await load(); await save(data); }
  render();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => undefined);
};
init().catch(() => { authLoading = false; app.innerHTML = '<main class="error-screen"><h1>No se pudo abrir la aplicación</h1><p>Comprueba la configuración de Supabase y que el navegador permite datos para esta aplicación.</p></main>'; });