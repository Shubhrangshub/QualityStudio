// QualityStudio Integrations API
// Provides AI and utility functions via local backend

import { ai, files, notifications } from './localBackendClient';

// AI Integration (uses GPT-5.2 via backend)
export const InvokeLLM = async (prompt, options = {}) => {
  // Use the RCA suggestions endpoint for general LLM queries
  const result = await ai.getRCASuggestions(prompt, options.defectType || 'general', options.severity || 'minor');
  return result;
};

// File Upload
export const UploadFile = async (file) => {
  return await files.upload(file);
};

// Email (via backend notification service)
export const SendEmail = async (to, subject, body) => {
  console.log('Email sending requires SMTP configuration in backend');
  return { success: false, message: 'Configure SMTP in backend/.env' };
};

// SMS (not implemented)
export const SendSMS = async (to, message) => {
  console.log('SMS not implemented');
  return { success: false, message: 'SMS not implemented' };
};

// Image Generation (not implemented - would need DALL-E integration)
export const GenerateImage = async (prompt) => {
  console.log('Image generation not implemented');
  return { success: false, message: 'Image generation not implemented' };
};

// File Data Extraction (not implemented)
export const ExtractDataFromUploadedFile = async (fileUrl) => {
  console.log('File extraction not implemented');
  return { success: false, message: 'File extraction not implemented' };
};

// Core namespace for compatibility
export const Core = {
  InvokeLLM,
  SendEmail,
  SendSMS,
  UploadFile,
  GenerateImage,
  ExtractDataFromUploadedFile
};
