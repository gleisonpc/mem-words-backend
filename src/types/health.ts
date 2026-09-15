/** Corpo de resposta do health-check de vida. */
export interface HealthResponse {
  status: 'ok';
}

/** Corpo de resposta do endpoint de prontidão. */
export interface ReadinessResponse {
  status: 'ready' | 'unavailable';
  database: 'up' | 'down';
}
