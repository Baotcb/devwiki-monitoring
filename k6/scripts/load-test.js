
import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { BASE_URL_FRONTEND, BASE_URL_BACKEND, THRESHOLDS_LOAD, HTTP_PARAMS } from './helpers/config.js';

const successRate = new Rate('success_rate');
const backendDuration = new Trend('backend_api_duration', true);
const frontendDuration = new Trend('frontend_page_duration', true);

export const options = {

  insecureSkipTLSVerify: true,

  stages: [
    { duration: '1m', target: 20 },
    { duration: '3m', target: 20 },
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],

  thresholds: {
    ...THRESHOLDS_LOAD,
    'http_req_duration{name:api_health}': ['p(95)<1000'],
    'http_req_duration{name:frontend}': ['p(95)<2000'],
    success_rate: ['rate>0.95'],
  },
};

export default function () {

  group('Backend API', function () {
    const res = http.get(
      `${BASE_URL_BACKEND}/api/health`,
      { ...HTTP_PARAMS, tags: { name: 'api_health', test_type: 'load' } }
    );

    backendDuration.add(res.timings.duration);

    const ok = check(res, {
      '[API] status 2xx': (r) => r.status >= 200 && r.status < 300,
      '[API] P95 < 1000ms': (r) => r.timings.duration < 1000,
    });
    successRate.add(ok);
  });

  sleep(0.3);

  group('Frontend', function () {
    const res = http.get(
      `${BASE_URL_FRONTEND}/`,
      { ...HTTP_PARAMS, tags: { name: 'frontend', test_type: 'load' } }
    );

    frontendDuration.add(res.timings.duration);

    const ok = check(res, {
      '[Frontend] status 200': (r) => r.status === 200,
      '[Frontend] P95 < 2000ms': (r) => r.timings.duration < 2000,
    });
    successRate.add(ok);
  });

  sleep(1);
}

export function handleSummary(data) {
  const dur = data.metrics.http_req_duration?.values;
  const fail = data.metrics.http_req_failed?.values;

  console.log('');
  console.log('===  LOAD TEST HOÀN THÀNH ===');
  console.log(`Total requests  : ${data.metrics.http_reqs?.values?.count ?? 'N/A'}`);
  console.log(`Failed rate     : ${((fail?.rate ?? 0) * 100).toFixed(2)}%`);
  console.log(`Avg Duration    : ${dur?.avg?.toFixed(2) ?? 'N/A'} ms`);
  console.log(`P90 Duration    : ${dur?.['p(90)']?.toFixed(2) ?? 'N/A'} ms`);
  console.log(`P95 Duration    : ${dur?.['p(95)']?.toFixed(2) ?? 'N/A'} ms`);
  console.log(`P99 Duration    : ${dur?.['p(99)']?.toFixed(2) ?? 'N/A'} ms`);
  console.log(`Max Duration    : ${dur?.max?.toFixed(2) ?? 'N/A'} ms`);
  console.log('================================');
  return {};
}
