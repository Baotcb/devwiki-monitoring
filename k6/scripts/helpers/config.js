
export const BASE_URL_FRONTEND = __ENV.FRONTEND_URL || 'https://devwiki-nginx:443';
export const BASE_URL_BACKEND = __ENV.BACKEND_URL || 'http://devwiki-api:3000';


export const THRESHOLDS_SMOKE = {
  http_req_failed: ['rate<0.01'],
  http_req_duration: ['p(95)<500'],
};

export const THRESHOLDS_LOAD = {
  http_req_failed: ['rate<0.05'],
  http_req_duration: ['p(95)<1000', 'p(99)<2000'],
};

export const THRESHOLDS_STRESS = {

  http_req_failed: ['rate<0.30'],
  http_req_duration: ['p(95)<5000'],
};

export const HTTP_PARAMS = {
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  insecureSkipTLSVerify: true,
};


export function makeTag(scenarioName) {
  return { scenario: scenarioName };
}
