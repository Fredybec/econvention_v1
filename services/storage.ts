
import { PFERecord, User, Notification, SupportQuestion, EligibilityCriteria, EligibilityOverride } from '../types';

const getAuthHeaders = (token?: string | null) => {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const fetchWithRetry = async (url: string, options: RequestInit = {}, retries = 3, backoff = 500): Promise<Response> => {
  try {
    const response = await fetch(url, options);
    return response;
  } catch (err) {
    if (retries <= 0) throw err;
    await new Promise(resolve => setTimeout(resolve, backoff));
    return fetchWithRetry(url, options, retries - 1, backoff * 2);
  }
};

export const getStoredRecords = async (token?: string | null): Promise<PFERecord[]> => {
  const response = await fetchWithRetry('/api/records', {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to fetch records: ${errorMessage || response.status}`);
  }
  return await response.json();
};

export const saveRecord = async (record: PFERecord, token?: string | null) => {
  const response = await fetchWithRetry(`/api/records/${record.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to save record: ${errorMessage || response.status}`);
  }
  return true;
};

export const saveRecords = async (records: PFERecord[], token?: string | null) => {
  const response = await fetch('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(records),
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch {
      // Ignore if not JSON
    }
    throw new Error(`Failed to save records: ${errorMessage || response.status}`);
  }
};

export const bulkUpdateRecordsApi = async (updates: any[], token?: string | null) => {
  const response = await fetch('/api/records/bulk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(updates),
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to bulk update records: ${errorMessage || response.status}`);
  }
  return await response.json();
};

export const addRecordApi = async (record: Partial<PFERecord>, token?: string | null) => {
  const response = await fetchWithRetry('/api/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(record),
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to add record: ${errorMessage || response.status}`);
  }
  return await response.json();
};

export const deleteRecordApi = async (id: string, token?: string | null) => {
  const response = await fetch(`/api/records/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to delete record: ${errorMessage || response.status}`);
  }
};

export const getRecordLock = async (id: string, token?: string | null) => {
  const response = await fetch(`/api/records/${id}/lock`, {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error("Failed to fetch lock");
  return await response.json();
};

export const lockRecordApi = async (id: string, token?: string | null) => {
  const response = await fetch(`/api/records/${id}/lock`, {
    method: 'POST',
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    if (response.status === 409) {
      const data = await response.json();
      return { success: false, lock: data.lock };
    }
    throw new Error("Failed to lock record");
  }
  return { success: true };
};

export const unlockRecordApi = async (id: string, token?: string | null) => {
  const response = await fetch(`/api/records/${id}/lock`, {
    method: 'DELETE',
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error("Failed to unlock record");
  return true;
};

export const getStoredUsers = async (token?: string | null): Promise<User[]> => {
  const response = await fetchWithRetry('/api/users', {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to fetch users: ${errorMessage || response.status}`);
  }
  return await response.json();
};

export const saveUsers = async (users: User[], token?: string | null) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(users),
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to save users: ${errorMessage || response.status}`);
  }
};

export const addUserApi = async (user: Partial<User>, token?: string | null) => {
  const response = await fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to add user: ${errorMessage || response.status}`);
  }
  return await response.json();
};

export const saveUserApi = async (user: User, token?: string | null) => {
  const response = await fetch(`/api/users/${user.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(user),
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to save user: ${errorMessage || response.status}`);
  }
  return await response.json();
};

export const deleteUserApi = async (id: string, token?: string | null) => {
  const response = await fetch(`/api/users/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token)
  });
  if (!response.ok) {
    let errorMessage = response.statusText;
    try {
      const data = await response.json();
      if (data.error) errorMessage = data.error;
    } catch { /* ignore */ }
    throw new Error(`Failed to delete user: ${errorMessage || response.status}`);
  }
};

export const getStoredNotifications = async (token?: string | null): Promise<Notification[]> => {
  const response = await fetch('/api/notifications', {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error(`Failed to fetch notifications: ${response.statusText}`);
  return await response.json();
};

export const saveNotifications = async (notifications: Notification[], token?: string | null) => {
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(notifications),
  });
  if (!response.ok) throw new Error(`Failed to save notifications: ${response.statusText}`);
};

export const addNotificationApi = async (notification: Partial<Notification>, token?: string | null) => {
  const response = await fetch('/api/notifications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(notification),
  });
  if (!response.ok) throw new Error(`Failed to add notification: ${response.statusText}`);
  return await response.json();
};

export const markNotificationReadApi = async (id: string, token?: string | null) => {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: 'PUT',
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error(`Failed to mark notification as read: ${response.statusText}`);
  return await response.json();
};

export const clearNotificationsApi = async (token?: string | null) => {
  const response = await fetch('/api/notifications', {
    method: 'DELETE',
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error(`Failed to clear notifications: ${response.statusText}`);
};

export const getStoredSupportQuestions = async (token?: string | null): Promise<SupportQuestion[]> => {
  const response = await fetch('/api/support', {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error(`Failed to fetch support questions: ${response.statusText}`);
  return await response.json();
};

export const saveSupportQuestions = async (questions: SupportQuestion[], token?: string | null) => {
  const response = await fetch('/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(questions),
  });
  if (!response.ok) throw new Error(`Failed to save support questions: ${response.statusText}`);
};

export const addSupportQuestionApi = async (question: Partial<SupportQuestion>, token?: string | null) => {
  const response = await fetch('/api/support', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(question),
  });
  if (!response.ok) throw new Error(`Failed to add support question: ${response.statusText}`);
  return await response.json();
};

export const updateSupportQuestionApi = async (id: string, data: Partial<SupportQuestion>, token?: string | null) => {
  const response = await fetch(`/api/support/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error(`Failed to update support question: ${response.statusText}`);
  return await response.json();
};

export const deleteSupportQuestionApi = async (id: string, token?: string | null) => {
  const response = await fetch(`/api/support/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error(`Failed to delete support question: ${response.statusText}`);
};

export const getEligibilityCriteria = async (token?: string | null): Promise<EligibilityCriteria[]> => {
  const response = await fetch('/api/eligibility/criteria', {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error(`Failed to fetch eligibility criteria: ${response.statusText}`);
  return await response.json();
};

export const saveEligibilityCriteria = async (criteria: EligibilityCriteria[], token?: string | null) => {
  const response = await fetch('/api/eligibility/criteria', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(criteria),
  });
  if (!response.ok) throw new Error(`Failed to save eligibility criteria: ${response.statusText}`);
};

export const getEligibilityOverrides = async (token?: string | null): Promise<EligibilityOverride[]> => {
  const response = await fetch('/api/eligibility/overrides', {
    headers: getAuthHeaders(token)
  });
  if (!response.ok) throw new Error(`Failed to fetch eligibility overrides: ${response.statusText}`);
  return await response.json();
};

export const saveEligibilityOverrides = async (overrides: EligibilityOverride[], token?: string | null) => {
  const response = await fetch('/api/eligibility/overrides', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
    body: JSON.stringify(overrides),
  });
  if (!response.ok) throw new Error(`Failed to save eligibility overrides: ${response.statusText}`);
};
