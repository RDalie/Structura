export type HealthIndicatorResult = {
  status: string;
  message?: string;
  [key: string]: unknown;
};

export type HealthResponse = {
  status: string;
  info?: Record<string, HealthIndicatorResult>;
  error?: Record<string, HealthIndicatorResult>;
  details?: Record<string, HealthIndicatorResult>;
};

export type HealthCheck = {
  name: string;
  status: string;
  message: string;
  raw: HealthIndicatorResult;
};
