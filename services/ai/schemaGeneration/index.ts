// services/ai/schemaGeneration/index.ts
// Schema generation module exports

export { generateSchema, type SchemaGenerationContext } from './schemaGenerator';
export { validateSchema } from './schemaValidator';
export {
  applyAutoFixes,
  addDateModified,
  addImage,
  addSpeakable,
  updateDates,
  updateKeywords,
  mergeEntitySameAs
} from './schemaAutoFix';
