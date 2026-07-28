import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import exec from 'k6/execution';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { CONFIG } from './7bongConfig.js';

// 1. ĐỌC THAM SỐ TỪ TERMINAL
const MAX_VUS = __ENV.MAX_VUS ? parseInt(__ENV.MAX_VUS) : CONFIG.MAX_VUS;
const RUN_MODE = __ENV.ENV;
const TARGET_PAGE_KEY = __ENV.TARGET_PAGE || 'homepage';

// KIỂM TRA BẮT BUỘC TRUYỀN THÔNG TIN TỪ TERMINAL
if (RUN_MODE === 'server' && !CONFIG.SERVER_IP) {
    fail('❌ LỖI BẢO MẬT: Bạn chưa truyền tham số -e SERVER_IP=... từ terminal!');
}
if (!CONFIG.DOMAIN) {
    fail('❌ LỖI BẢO MẬT: Bạn chưa truyền tham số -e DOMAIN=... từ terminal!');
}

// 2. TÍNH TOÁN TIMING DỰA TRÊN MAX_VUS
const RAMP_UP_TIME = __ENV.RAMP_UP ? parseInt(__ENV.RAMP_UP) : (() => {
    if (MAX_VUS >= 1000) return 180;
    if (MAX_VUS >= 500) return 120;
    if (MAX_VUS >= 100) return 60;
    if (MAX_VUS > 1) return 30;
    return 0; // Smoke Test
})();

const STAY_TIME = __ENV.STAY ? parseInt(__ENV.STAY) : (() => {
    if (MAX_VUS >= 1000) return 600;
    if (MAX_VUS >= 500) return 300;
    if (MAX_VUS >= 100) return 180;
    if (MAX_VUS > 1) return 60;
    return 20; // Smoke Test
})();

const RAMP_DOWN_TIME = __ENV.RAMP_DOWN ? parseInt(__ENV.RAMP_DOWN) : (() => {
    if (MAX_VUS >= 1000) return 60;
    if (MAX_VUS >= 500) return 45;
    if (MAX_VUS >= 100) return 30;
    if (MAX_VUS > 1) return 15;
    return 0; // Smoke Test
})();

const GRACEFUL_STOP = __ENV.GRACEFUL_STOP ? __ENV.GRACEFUL_STOP : (() => {
    if (MAX_VUS >= 1000) return '120s';
    if (MAX_VUS >= 500) return '90s';
    if (MAX_VUS >= 100) return '60s';
    if (MAX_VUS > 1) return '30s';
    return '10s';
})();

// 3. TẠO SCENARIO DUY NHẤT CHO TRANG ĐƯỢC TRUYỀN VÀO
function generateOptions() {
    let scenarios = {};
    let thresholds = {};

    const scenarioName = `scenario_${TARGET_PAGE_KEY}`;

    if (MAX_VUS <= 1) {
        scenarios[scenarioName] = {
            executor: 'per-vu-iterations',
            vus: 1,
            iterations: 1,
            maxDuration: '30s',
            tags: { page_name: TARGET_PAGE_KEY },
        };

        thresholds[`http_req_failed{page_name:${TARGET_PAGE_KEY}}`] = [{ threshold: 'rate<=0.0', abortOnFail: false }];
        thresholds[`http_req_duration{page_name:${TARGET_PAGE_KEY}}`] = [{ threshold: 'p(95)<20000', abortOnFail: false }];
    } else {
        scenarios[scenarioName] = {
            executor: 'ramping-vus',
            startVUs: 0,
            stages: [
                { duration: `${RAMP_UP_TIME}s`, target: MAX_VUS },
                { duration: `${STAY_TIME}s`, target: MAX_VUS },
                { duration: `${RAMP_DOWN_TIME}s`, target: 0 },
            ],
            gracefulStop: GRACEFUL_STOP,
            tags: { page_name: TARGET_PAGE_KEY },
        };

        thresholds[`http_req_duration{page_name:${TARGET_PAGE_KEY}}`] = [{ threshold: 'p(95)<30000', abortOnFail: false }];
        thresholds[`http_req_failed{page_name:${TARGET_PAGE_KEY}}`] = [{ threshold: 'rate<0.05', abortOnFail: false }];
    }

    return { scenarios, thresholds };
}

const config = generateOptions();

export const options = {
    scenarios: config.scenarios,
    thresholds: config.thresholds,
    discardResponseBodies: true,
    insecureSkipTLSVerify: true,
};

export default function () {
    const rawPath = CONFIG.PAGES[TARGET_PAGE_KEY];
    if (!rawPath && rawPath !== '') fail(`❌ LỖI: Không tìm thấy path trong config cho page_key: "${TARGET_PAGE_KEY}"`);

    let finalBaseUrl = RUN_MODE === 'server' ? CONFIG.SERVER_IP : CONFIG.BASE_URL;
    let hostHeader = RUN_MODE === 'server' ? CONFIG.DOMAIN : null;

    // RIÊNG TRANG TRUCTIEP: Bắn qua Domain https
    if (TARGET_PAGE_KEY === 'tructiep') {
        finalBaseUrl = `https://${CONFIG.DOMAIN}`;
        hostHeader = null;
    }

    const cleanBaseUrl = finalBaseUrl.replace(/\/+$/, '');
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const finalUrl = `${cleanBaseUrl}${cleanPath}`;

    // HEADERS GIẢ LẬP BROWSER
    let customHeaders = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Connection': 'keep-alive',
        'Referer': `${cleanBaseUrl}/`,
    };

    if (TARGET_PAGE_KEY === 'tructiep') {
        customHeaders['Sec-Ch-Ua'] = '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"';
        customHeaders['Sec-Ch-Ua-Mobile'] = '?0';
        customHeaders['Sec-Ch-Ua-Platform'] = '"macOS"';
        customHeaders['Sec-Fetch-Dest'] = 'document';
        customHeaders['Sec-Fetch-Mode'] = 'navigate';
        customHeaders['Sec-Fetch-Site'] = 'none';
        customHeaders['Sec-Fetch-User'] = '?1';
        customHeaders['Upgrade-Insecure-Requests'] = '1';
    }

    if (hostHeader) {
        customHeaders['Host'] = hostHeader;
    }

    const params = {
        headers: customHeaders,
        tags: { page_name: TARGET_PAGE_KEY },
        timeout: '30s',
    };

    if (exec.scenario.iterationInInstance === 0 && exec.vu.idInTest === 1) {
        console.log(`\n================================================`);
        console.log(`🎬 CHẾ ĐỘ: ${MAX_VUS <= 1 ? 'SMOKE TEST' : 'LOAD TEST'}`);
        console.log(`🚀 BẮT ĐẦU TEST TRANG: [ ${TARGET_PAGE_KEY.toUpperCase()} ] | TARGET: ${MAX_VUS} CCU`);
        console.log(`⏱️ TIMING: RampUp=${RAMP_UP_TIME}s | Stay=${STAY_TIME}s | RampDown=${RAMP_DOWN_TIME}s`);
        console.log(`🔗 TARGET URL: ${finalUrl}`);
        console.log(`================================================`);
    }

    const res = http.get(finalUrl, params);

    const isSuccess = check(res, { 'status is 200': (r) => r.status === 200 });

    // 🛠️ BỔ SUNG LOGIC: NẾU TRẢ VỀ LỖI (ĐẶC BIỆT LÀ 403 HOẶC 404), DỪNG BÀI TEST TRANG NÀY NGAY LẬP TỨC
    if (!isSuccess) {
        console.error(`\n❌ [FAIL CRITICAL] Trang: "${TARGET_PAGE_KEY}" bị lỗi Status: ${res.status} | URL: ${finalUrl}`);
        console.warn(`🛑 Bỏ qua trang này và chuyển sang trang kế tiếp để tiết kiệm thời gian...`);
        
        // Dừng ngay lập tức k6 test instance hiện tại
        exec.test.abort(`Phát hiện lỗi Status ${res.status} trên trang ${TARGET_PAGE_KEY}`);
    }

    if (MAX_VUS <= 1) {
        sleep(Math.random() * 2 + 1);
    } else {
        sleep(Math.random() * 3 + 2);
    }
}

export function handleSummary(data) {
    const folderPath = './testreport';
    const filePath = `${folderPath}/report_${TARGET_PAGE_KEY}.txt`;

    return {
        [filePath]: textSummary(data, { indent: ' ', enableColors: false }),
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}