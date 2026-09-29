
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL_FRONTEND, BASE_URL_BACKEND, THRESHOLDS_SMOKE, HTTP_PARAMS } from './helpers/config.js';

const successRate = new Rate('success_rate');

export const options = {
  vus: 1,
  duration: '30s',


  insecureSkipTLSVerify: true,

  thresholds: {
    ...THRESHOLDS_SMOKE,
    success_rate: ['rate>0.99'],
  },
};

export default function () {
  const frontendRes = http.get(
    `${BASE_URL_FRONTEND}/nginx-health`,
    { ...HTTP_PARAMS, tags: { name: 'frontend_health', test_type: 'smoke' } }
  );

  const frontendOk = check(frontendRes, {
    '[Frontend] status 200': (r) => r.status === 200,
    '[Frontend] response time < 500ms': (r) => r.timings.duration < 500,
  });
  successRate.add(frontendOk);

  sleep(0.5);

  const backendRes = http.get(
    `${BASE_URL_BACKEND}/api/health`,
    { ...HTTP_PARAMS, tags: { name: 'backend_health', test_type: 'smoke' } }
  );

  const backendOk = check(backendRes, {
    '[Backend] status 200': (r) => r.status === 200,
    '[Backend] response time < 500ms': (r) => r.timings.duration < 500,
    '[Backend] body not empty': (r) => r.body && r.body.length > 0,
  });
  successRate.add(backendOk);

  sleep(1);
}

export function handleSummary(data) {
  console.log('');
  console.log('===  SMOKE TEST HOÀN THÀNH ===');
  console.log(`Total requests  : ${data.metrics.http_reqs?.values?.count ?? 'N/A'}`);
  console.log(`Failed requests : ${data.metrics.http_req_failed?.values?.rate?.toFixed(4) ?? 'N/A'}`);
  console.log(`P95 Duration    : ${data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) ?? 'N/A'} ms`);
  console.log('=================================');
  return {};
}
