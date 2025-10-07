import { DetectEntities } from 'skyflow-node';
import { ENTITY_MAP, AVAILABLE_ENTITIES } from '../../../src/utils/entities';

describe('Entities Utility', () => {
  describe('ENTITY_MAP', () => {
    it('should contain mapping for SSN', () => {
      expect(ENTITY_MAP.SSN).toBe(DetectEntities.SSN);
    });

    it('should map CREDIT_CARD to DetectEntities.CREDIT_CARD', () => {
      expect(ENTITY_MAP.CREDIT_CARD).toBe(DetectEntities.CREDIT_CARD);
    });

    it('should map CREDIT_CARD_NUMBER to DetectEntities.CREDIT_CARD', () => {
      expect(ENTITY_MAP.CREDIT_CARD_NUMBER).toBe(DetectEntities.CREDIT_CARD);
    });

    it('should map EMAIL to DetectEntities.EMAIL_ADDRESS', () => {
      expect(ENTITY_MAP.EMAIL).toBe(DetectEntities.EMAIL_ADDRESS);
    });

    it('should map EMAIL_ADDRESS to DetectEntities.EMAIL_ADDRESS', () => {
      expect(ENTITY_MAP.EMAIL_ADDRESS).toBe(DetectEntities.EMAIL_ADDRESS);
    });

    it('should map PHONE_NUMBER to DetectEntities.PHONE_NUMBER', () => {
      expect(ENTITY_MAP.PHONE_NUMBER).toBe(DetectEntities.PHONE_NUMBER);
    });

    it('should map PHONE to DetectEntities.PHONE_NUMBER', () => {
      expect(ENTITY_MAP.PHONE).toBe(DetectEntities.PHONE_NUMBER);
    });

    it('should contain mapping for NAME', () => {
      expect(ENTITY_MAP.NAME).toBe(DetectEntities.NAME);
    });

    it('should contain mapping for DOB', () => {
      expect(ENTITY_MAP.DOB).toBe(DetectEntities.DOB);
    });

    it('should map DATE_OF_BIRTH to DetectEntities.DOB', () => {
      expect(ENTITY_MAP.DATE_OF_BIRTH).toBe(DetectEntities.DOB);
    });

    it('should contain mapping for ACCOUNT_NUMBER', () => {
      expect(ENTITY_MAP.ACCOUNT_NUMBER).toBe(DetectEntities.ACCOUNT_NUMBER);
    });

    it('should contain mapping for DRIVER_LICENSE', () => {
      expect(ENTITY_MAP.DRIVER_LICENSE).toBe(DetectEntities.DRIVER_LICENSE);
    });

    it('should contain mapping for PASSPORT_NUMBER', () => {
      expect(ENTITY_MAP.PASSPORT_NUMBER).toBe(DetectEntities.PASSPORT_NUMBER);
    });

    it('should map PASSPORT to DetectEntities.PASSPORT_NUMBER', () => {
      expect(ENTITY_MAP.PASSPORT).toBe(DetectEntities.PASSPORT_NUMBER);
    });

    it('should have 14 entity mappings', () => {
      expect(Object.keys(ENTITY_MAP)).toHaveLength(14);
    });

    it('should have all values be DetectEntities enum values', () => {
      Object.values(ENTITY_MAP).forEach((value) => {
        expect(Object.values(DetectEntities)).toContain(value);
      });
    });
  });

  describe('AVAILABLE_ENTITIES', () => {
    it('should be a comma-separated string', () => {
      expect(typeof AVAILABLE_ENTITIES).toBe('string');
      expect(AVAILABLE_ENTITIES).toContain(',');
    });

    it('should contain all entity map keys', () => {
      const keys = Object.keys(ENTITY_MAP);
      keys.forEach((key) => {
        expect(AVAILABLE_ENTITIES).toContain(key);
      });
    });

    it('should contain SSN', () => {
      expect(AVAILABLE_ENTITIES).toContain('SSN');
    });

    it('should contain CREDIT_CARD', () => {
      expect(AVAILABLE_ENTITIES).toContain('CREDIT_CARD');
    });

    it('should contain EMAIL', () => {
      expect(AVAILABLE_ENTITIES).toContain('EMAIL');
    });

    it('should contain PHONE_NUMBER', () => {
      expect(AVAILABLE_ENTITIES).toContain('PHONE_NUMBER');
    });

    it('should be properly formatted with commas and spaces', () => {
      const parts = AVAILABLE_ENTITIES.split(', ');
      expect(parts.length).toBe(14);
      parts.forEach((part) => {
        expect(part).toBeTruthy();
        expect(part).not.toContain(',');
      });
    });
  });
});
