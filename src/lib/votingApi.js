import { base44 } from '@/api/base44Client';

// Invoca una backend function y normaliza errores (axios lanza en non-2xx; el helper
// extrae el mensaje que la función devuelve en { error }).
async function invoke(name, args) {
  try {
    const res = await base44.functions.invoke(name, args);
    return res.data;
  } catch (e) {
    const msg = e?.response?.data?.error || e?.message || 'Error inesperado';
    throw new Error(msg);
  }
}

export const castVote = (taskId, vote, comment) => invoke('castCommitteeVote', { taskId, vote, comment });
export const finalApproval = (taskId) => invoke('finalApproval', { taskId });
export const adminVeto = (taskId, reason) => invoke('adminVeto', { taskId, reason });
export const openVoting = (taskId, suggestedBudgetId) => invoke('openCommitteeVoting', { taskId, suggestedBudgetId });
export const closeVoting = (taskId) => invoke('closeCommitteeVoting', { taskId });
export const manualDecision = (taskId, action, reason, extraDays) => invoke('manualVotingDecision', { taskId, action, reason, extraDays });
export const markNotificationRead = (id) => invoke('markNotificationRead', { id });
export const getMyCommunity = () => invoke('getMyCommunity', {});
// Fase 4b — lectura para roles no admin
export const getCommitteeVotingTasks = () => invoke('getCommitteeVotingTasks', {});
export const getMyTasks = () => invoke('getMyTasks', {});
export const getBudgets = (task_id) => invoke('getBudgets', { task_id });
export const getCommitteeMembersFn = (community_id) => invoke('getCommitteeMembers', { community_id });
// Fase 4b — escritura admin/equipo de comunidad
export const createTaskFn = (data) => invoke('createTask', data);
export const upsertBudget = (data) => invoke('upsertBudget', data);
export const deleteBudget = (id) => invoke('deleteBudget', { id });
export const advanceToEvaluation = (task_id) => invoke('advanceToEvaluation', { task_id });
export const selectBudget = (task_id, budget_id) => invoke('selectBudget', { task_id, budget_id });
export const giveVoBo = (task_id) => invoke('giveVoBo', { task_id });
export const rejectBudget = (task_id, reason) => invoke('rejectBudget', { task_id, reason });
export const setBudgetException = (task_id, reason) => invoke('setBudgetException', { task_id, reason });
export const updateTaskProgress = (task_id, progress) => invoke('updateTaskProgress', { task_id, progress });
export const markAllNotificationsRead = (all) => invoke('markAllNotificationsRead', all ? { all: true } : {});