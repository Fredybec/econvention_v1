
import { SystemConfig, ConventionTemplate } from '../types';

const getAuthHeaders = (token?: string | null) => {
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

export const fetchSystemConfig = async (token?: string | null): Promise<SystemConfig | null> => {
  try {
    const response = await fetch('/api/config', {
      headers: getAuthHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch config');
    return await response.json();
  } catch (error) {
    console.error('Error fetching system config:', error);
    return null;
  }
};

export const saveSystemConfig = async (config: SystemConfig, token?: string | null): Promise<void> => {
  try {
    const response = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify(config),
    });
    if (!response.ok) throw new Error('Failed to save config');
  } catch (error) {
    console.error('Error saving system config:', error);
    throw error;
  }
};

export const fetchTemplateConfig = async (token?: string | null): Promise<ConventionTemplate | null> => {
  try {
    const response = await fetch('/api/template', {
      headers: getAuthHeaders(token)
    });
    if (!response.ok) throw new Error('Failed to fetch template');
    return await response.json();
  } catch (error) {
    console.error('Error fetching template config:', error);
    return null;
  }
};

export const saveTemplateConfig = async (template: ConventionTemplate, token?: string | null): Promise<void> => {
  try {
    const response = await fetch('/api/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders(token) },
      body: JSON.stringify(template),
    });
    if (!response.ok) throw new Error('Failed to save template');
  } catch (error) {
    console.error('Error saving template config:', error);
    throw error;
  }
};
