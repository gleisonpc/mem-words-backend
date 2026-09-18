/**
 * Sequência de dias seguidos com ao menos uma nota de revisão registrada.
 * Ver design.md do change `add-home-dashboard-summary` para a justificativa
 * de cada regra.
 *
 * `nextStreak` é pura: não lê nem grava nada — quem chama persiste o
 * resultado. "Dia" é o dia calendário em UTC, mesma referência de tempo
 * usada pelo resto do backend (nenhum outro ponto converte fuso horário).
 */

export interface StreakState {
  currentStreak: number;
  lastActiveOn: Date;
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Decide a sequência resultante de uma atividade registrada agora
 * (`now`), a partir da sequência e do último dia ativo persistidos.
 *
 * - `lastActiveOn` nulo (nunca houve atividade) → sequência `1`.
 * - Mesmo dia calendário que `lastActiveOn` → sequência inalterada,
 *   `lastActiveOn` mantido no valor já persistido.
 * - Exatamente um dia depois → sequência atual `+ 1`.
 * - Qualquer intervalo maior, ou `now` antes de `lastActiveOn` (desvio de
 *   relógio) → reinicia em `1`.
 */
export function nextStreak(
  currentStreak: number,
  lastActiveOn: Date | null,
  now: Date,
): StreakState {
  if (lastActiveOn === null) {
    return { currentStreak: 1, lastActiveOn: now };
  }

  const today = toUtcDateKey(now);
  const lastDay = toUtcDateKey(lastActiveOn);

  if (today === lastDay) {
    return { currentStreak, lastActiveOn };
  }

  const diffDays = Math.round((Date.parse(today) - Date.parse(lastDay)) / ONE_DAY_MS);

  if (diffDays === 1) {
    return { currentStreak: currentStreak + 1, lastActiveOn: now };
  }

  return { currentStreak: 1, lastActiveOn: now };
}
