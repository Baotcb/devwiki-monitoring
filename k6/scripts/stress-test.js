

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Counter, Trend } from 'k6/metrics';
import { BASE_URL_FRONTEND, BASE_URL_BACKEND, THRESHOLDS_STRESS, HTTP_PARAMS } from './helpers/config.js';

const successRate = new Rate('success_rate');
const errorCount = new Counter('error_count');
const apiLatency = new Trend('api_latency_ms', true);

export const options = {

  insecureSkipTLSVerify: true,

  stages: [
    { duration: '2m', target: 50 },
    { duration: '2m', target: 50 },
    { duration: '2m', target: 150 },
    { duration: '3m', target: 150 },
    { duration: '2m', target: 300 },
    { duration: '3m', target: 300 },
    { duration: '2m', target: 0 },
  ],

  thresholds: {
    ...THRESHOLDS_STRESS,
    success_rate: ['rate>0.50'],
    'http_req_duration{name:api_health}': ['p(95)<10000'],
    'http_req_duration{name:frontend}': ['p(95)<10000'],
  },
};
export default function () {
  group('Backend API Stress', function () {
    const res = http.get(
      `${BASE_URL_BACKEND}/api/health`,
      {
        ...HTTP_PARAMS,
        timeout: '30s',
        tags: { name: 'api_health', test_type: 'stress' },
      }
    );

    apiLatency.add(res.timings.duration);

    const ok = check(res, {
      '[API] status 2xx': (r) => r.status >= 200 && r.status < 300,
    });

    successRate.add(ok);
    if (!ok) {
      errorCount.add(1, { endpoint: 'api_health', status: String(res.status) });
    }
  });

  sleep(Math.random() * 0.5 + 0.1);

  group('Frontend Stress', function () {
    const res = http.get(
      `${BASE_URL_FRONTEND}/`,
      {
        ...HTTP_PARAMS,
        timeout: '30s',
        tags: { name: 'frontend', test_type: 'stress' },
      }
    );

    const ok = check(res, {
      '[Frontend] status 200': (r) => r.status === 200,
    });

    successRate.add(ok);
    if (!ok) {
      errorCount.add(1, { endpoint: 'frontend', status: String(res.status) });
    }
  });

  sleep(Math.random() * 0.3 + 0.1);
}

export function teardown() {
  console.log('');
  console.log(' Stress test kết thúc — Kiểm tra Grafana để phân tích kết quả');
  console.log('');
}

export function handleSummary(data) {
  const dur = data.metrics.http_req_duration?.values;
  const fail = data.metrics.http_req_failed?.values;
  const reqs = data.metrics.http_reqs?.values;
  const rps = reqs?.rate ?? 0;

  console.log('');
  console.log('╔══════════════════════════════════════╗');
  console.log('║       STRESS TEST HOÀN THÀNH         ║');
  console.log('╠══════════════════════════════════════╣');
  console.log(`║ Total requests  : ${String(reqs?.count ?? 'N/A').padEnd(17)}║`);
  console.log(`║ RPS (peak)      : ${String(rps.toFixed(2)).padEnd(17)}║`);
  console.log(`║ Failed rate     : ${String(((fail?.rate ?? 0) * 100).toFixed(2) + '%').padEnd(17)}║`);
  console.log(`║ Avg Duration    : ${String((dur?.avg ?? 0).toFixed(0) + 'ms').padEnd(17)}║`);
  console.log(`║ P90 Duration    : ${String((dur?.['p(90)'] ?? 0).toFixed(0) + 'ms').padEnd(17)}║`);
  console.log(`║ P95 Duration    : ${String((dur?.['p(95)'] ?? 0).toFixed(0) + 'ms').padEnd(17)}║`);
  console.log(`║ P99 Duration    : ${String((dur?.['p(99)'] ?? 0).toFixed(0) + 'ms').padEnd(17)}║`);
  console.log(`║ Max Duration    : ${String((dur?.max ?? 0).toFixed(0) + 'ms').padEnd(17)}║`);
  console.log('╚══════════════════════════════════════╝');
  return {};
}
