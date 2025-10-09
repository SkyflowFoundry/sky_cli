/**
 * Shared entity mapping constants for deidentify and reidentify commands
 */

import { DetectEntities } from 'skyflow-node';

/**
 * Map of entity aliases to DetectEntities enum values
 */
export const ENTITY_MAP: Record<string, DetectEntities> = {
  SSN: DetectEntities.SSN,
  CREDIT_CARD: DetectEntities.CREDIT_CARD,
  CREDIT_CARD_NUMBER: DetectEntities.CREDIT_CARD,
  EMAIL: DetectEntities.EMAIL_ADDRESS,
  EMAIL_ADDRESS: DetectEntities.EMAIL_ADDRESS,
  PHONE_NUMBER: DetectEntities.PHONE_NUMBER,
  PHONE: DetectEntities.PHONE_NUMBER,
  NAME: DetectEntities.NAME,
  DOB: DetectEntities.DOB,
  DATE_OF_BIRTH: DetectEntities.DOB,
  ACCOUNT_NUMBER: DetectEntities.ACCOUNT_NUMBER,
  DRIVER_LICENSE: DetectEntities.DRIVER_LICENSE,
  PASSPORT_NUMBER: DetectEntities.PASSPORT_NUMBER,
  PASSPORT: DetectEntities.PASSPORT_NUMBER,
};

/**
 * Comma-separated list of available entity types
 */
export const AVAILABLE_ENTITIES = Object.keys(ENTITY_MAP).join(', ');