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