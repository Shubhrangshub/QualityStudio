// QualityStudio Entities API
// Provides access to all data entities via local backend

import { entities, auth } from './localBackendClient';

// Export all entities
export const CustomerComplaint = entities.CustomerComplaint;
export const DefectTicket = entities.DefectTicket;
export const RCARecord = entities.RCARecord;
export const CAPAPlan = entities.CAPAPlan;
export const ProcessRun = entities.ProcessRun;
export const GoldenBatch = entities.GoldenBatch;
export const SOP = entities.SOP;
export const DoE = entities.DoE;
export const KnowledgeDocument = entities.KnowledgeDocument;
export const Equipment = entities.Equipment;
export const FileUploadHistory = entities.FileUploadHistory;
export const KPI = entities.KPI;

// Auth SDK
export const User = auth;

// Legacy Query export (for compatibility)
export const Query = {
  ...entities
};
