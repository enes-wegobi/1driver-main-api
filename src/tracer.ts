import tracer from 'dd-trace';

// Initialize DataDog tracer
tracer.init({
  service: process.env.DATADOG_SERVICE || 'customer-api-gateway',
  env: process.env.DATADOG_ENV || process.env.NODE_ENV || 'development',
  version: process.env.DATADOG_VERSION || '1.0.0',
  logInjection: true, // Inject trace IDs into logs
  runtimeMetrics: true, // Enable runtime metrics
  profiling: process.env.DATADOG_PROFILING === 'true',
  appsec: false, // Application Security Monitoring
  plugins: true, // Enable automatic instrumentation
});

export default tracer;
