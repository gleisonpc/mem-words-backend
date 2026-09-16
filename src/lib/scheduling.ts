/**
 * Motor de repetição espaçada — variante fixa e simplificada do SM-2
 * (estilo Anki). Ver design.md do change `add-review-scheduling` para a
 * justificativa de cada constante e de cada transição.
 *
 * `computeNextSchedule` é pura: não lê nem grava nada. Isso permite que a
 * fila de revisão calcule a prévia das quatro notas de um card sem gravar
 * nada, e que `POST /cards/:id/reviews` persista exatamente o que essa
 * mesma função devolveu — nenhuma duplicação de regra entre "aplicar" e
 * "prever".
 */

export type CardState = 'new' | 'learning' | 'review';
export type ReviewGrade = 'again' | 'hard' | 'good' | 'easy';

export interface SchedulableCard {
  state: CardState;
  learningStep: number;
  easeFactor: number;
  intervalDays: number;
}

export interface Schedule {
  state: CardState;
  learningStep: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: Date;
}

/** Passos de aprendizado, em minutos — os mesmos dois passos padrão do Anki. */
export const LEARNING_STEPS_MINUTES = [1, 10];

/** Intervalo ao graduar de `learning` para `review` via `good`. */
export const GRADUATING_INTERVAL_DAYS = 1;

/** Intervalo ao graduar direto para `review` via `easy`. */
export const EASY_INTERVAL_DAYS = 4;

/** Fator de facilidade inicial — também o valor ao (re)graduar. */
export const DEFAULT_EASE = 2.5;

/** Piso do fator de facilidade: notas ruins repetidas não colapsam a zero. */
export const MIN_EASE = 1.3;

/** Teto do intervalo em `review`, em dias. */
export const MAX_INTERVAL_DAYS = 180;

function addMinutes(now: Date, minutes: number): Date {
  return new Date(now.getTime() + minutes * 60_000);
}

function addDays(now: Date, days: number): Date {
  return new Date(now.getTime() + days * 86_400_000);
}

/** Primeiro passo de aprendizado — usado sempre que um card (re)inicia o aprendizado. */
function firstLearningStep(now: Date, easeFactor: number): Schedule {
  return {
    state: 'learning',
    learningStep: 0,
    easeFactor,
    intervalDays: 0,
    dueAt: addMinutes(now, LEARNING_STEPS_MINUTES[0] as number),
  };
}

function graduate(now: Date, intervalDays: number): Schedule {
  return {
    state: 'review',
    learningStep: 0,
    easeFactor: DEFAULT_EASE,
    intervalDays,
    dueAt: addDays(now, intervalDays),
  };
}

function fromLearning(card: SchedulableCard, grade: ReviewGrade, now: Date): Schedule {
  if (grade === 'again') {
    return firstLearningStep(now, card.easeFactor);
  }

  if (grade === 'hard') {
    return {
      state: 'learning',
      learningStep: card.learningStep,
      easeFactor: card.easeFactor,
      intervalDays: 0,
      dueAt: addMinutes(now, LEARNING_STEPS_MINUTES[card.learningStep] as number),
    };
  }

  if (grade === 'easy') {
    return graduate(now, EASY_INTERVAL_DAYS);
  }

  // good: avança ao próximo passo, ou gradua se não houver próximo.
  const nextStep = card.learningStep + 1;

  if (nextStep < LEARNING_STEPS_MINUTES.length) {
    return {
      state: 'learning',
      learningStep: nextStep,
      easeFactor: card.easeFactor,
      intervalDays: 0,
      dueAt: addMinutes(now, LEARNING_STEPS_MINUTES[nextStep] as number),
    };
  }

  return graduate(now, GRADUATING_INTERVAL_DAYS);
}

function fromReview(card: SchedulableCard, grade: ReviewGrade, now: Date): Schedule {
  if (grade === 'again') {
    return firstLearningStep(now, Math.max(MIN_EASE, card.easeFactor - 0.2));
  }

  if (grade === 'hard') {
    const easeFactor = Math.max(MIN_EASE, card.easeFactor - 0.15);
    const intervalDays = Math.min(MAX_INTERVAL_DAYS, card.intervalDays * 1.2);
    return { state: 'review', learningStep: 0, easeFactor, intervalDays, dueAt: addDays(now, intervalDays) };
  }

  if (grade === 'easy') {
    const easeFactor = card.easeFactor + 0.15;
    const intervalDays = Math.min(MAX_INTERVAL_DAYS, card.intervalDays * card.easeFactor * 1.3);
    return { state: 'review', learningStep: 0, easeFactor, intervalDays, dueAt: addDays(now, intervalDays) };
  }

  // good: mantém o fator de facilidade.
  const intervalDays = Math.min(MAX_INTERVAL_DAYS, card.intervalDays * card.easeFactor);
  return {
    state: 'review',
    learningStep: 0,
    easeFactor: card.easeFactor,
    intervalDays,
    dueAt: addDays(now, intervalDays),
  };
}

/**
 * Calcula o próximo agendamento de um card a partir do estado atual e da
 * nota recebida. Um card `new` sempre entra em `learning` no primeiro
 * passo, qualquer que seja a nota — não há intervalo anterior para basear
 * `hard`/`good`/`easy` num card nunca visto.
 */
export function computeNextSchedule(card: SchedulableCard, grade: ReviewGrade, now: Date): Schedule {
  if (card.state === 'new') {
    return firstLearningStep(now, card.easeFactor);
  }

  if (card.state === 'learning') {
    return fromLearning(card, grade, now);
  }

  return fromReview(card, grade, now);
}
