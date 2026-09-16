/**
 * Converte "15m", "7d", "3600s" em milissegundos.
 *
 * Extraído para cá porque tanto a emissão de tokens quanto o cookie que
 * carrega o token de renovação precisam da mesma conversão — o cookie deve
 * expirar junto com o token que ele transporta.
 */
export function durationToMs(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());

  if (match === null) {
    throw new Error(`Duração inválida: "${duration}". Use algo como 15m, 24h ou 7d.`);
  }

  const amount = Number(match[1]);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

  return amount * multipliers[unit];
}
