import type { RequestHandler } from 'express';

import * as dictionaryService from '../services/dictionary.service.js';
import type { SuggestQuery } from '../schemas/dictionary.schema.js';

/** GET /dictionary/suggest */
export const suggest: RequestHandler = async (req, res, next) => {
  try {
    const { word, sourceLanguage, targetLanguage } = req.query as unknown as SuggestQuery;
    res.status(200).json({
      suggestion: await dictionaryService.fetchSuggestion({ word, sourceLanguage, targetLanguage }),
    });
  } catch (error) {
    next(error);
  }
};
