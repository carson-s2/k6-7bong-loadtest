import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import exec from 'k6/execution';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.2/index.js';
import { CONFIG } from './7bongConfig.js';

// 1. LẤY CẤU HÌNH TỪ TERMINAL (KÈM GIÁ TRỊ MẶC ĐỊNH)
const MAX_VUS = __ENV.MAX_VUS ? parseInt(__ENV.MAX_VUS) : CONFIG.MAX_VUS;
const RUN_MODE = __ENV.ENV;

// 2. TỰ ĐỘNG TÍNH TOÁN THỜI GIAN THEO MỨC TẢI MAX_VUS (ĐƠN VỊ: GIÂY)
const RAMP_UP_TIME = __ENV.RAMP_UP ? parseInt(__ENV.RAMP_UP) : (() => {
    if (MAX_VUS >= 1000) return 180; // 3 phút tăng tải
    if (MAX_VUS >= 500) return 120; // 2 phút tăng tải
    if (MAX_VUS >= 100) return 60;  // 1 phút tăng tải
    if (MAX_VUS > 1) return 30;     // 30s tăng tải
    return 0;                       // Smoke Test (MAX_VUS = 1)
})();

const STAY_TIME = __ENV.STAY ? parseInt(__ENV.STAY) : (() => {
    if (MAX_VUS >= 1000) return 600; // 10 phút giữ tải đỉnh
    if (MAX_VUS >= 500) return 300;  // 5 phút giữ tải đỉnh
    if (MAX_VUS >= 100) return 180;  // 3 phút giữ tải đỉnh
    if (MAX_VUS > 1) return 60;      // 1 phút giữ tải đỉnh
    return 20;                       // Smoke Test
})();

const RAMP_DOWN_TIME = __ENV.RAMP_DOWN ? parseInt(__ENV.RAMP_DOWN) : (() => {
    if (MAX_VUS >= 1000) return 60;  // 1 phút hạ tải
    if (MAX_VUS >= 500) return 45;   // 45s hạ tải
    if (MAX_VUS >= 100) return 30;   // 30s hạ tải
    if (MAX_VUS > 1) return 15;      // 15s hạ tải
    return 0;                        // Smoke Test
})();

const BREAK_TIME = __ENV.BREAK ? parseInt(__ENV.BREAK) : (() => {
    if (MAX_VUS >= 1000) return 60; // 60s nghỉ: Dọn dẹp sạch sẽ Socket/RAM ở tải cực đại
    if (MAX_VUS >= 500) return 45;  // 45s nghỉ: Tải rất cao, cần thời gian xả Connection Pool
    if (MAX_VUS >= 100) return 30;  // 30s nghỉ: Tải trung bình lớn
    if (MAX_VUS > 1) return 20;     // 20s nghỉ: Tải nhỏ đến vừa
    return 5;                       // 5s nghỉ: Smoke Test (<= 1 VU)
})();

// Tự động điều chỉnh thời gian dọn dẹp (GRACEFUL_STOP) theo mức tải MAX_VUS
const GRACEFUL_STOP = __ENV.GRACEFUL_STOP ? __ENV.GRACEFUL_STOP : (() => {
    if (MAX_VUS >= 1000) return '120s'; // Mức tải cực lớn (>= 1000 CCU): Chờ 2 phút
    if (MAX_VUS >= 500) return '90s';   // Mức tải cao (>= 500 CCU): Chờ 1.5 phút
    if (MAX_VUS >= 100) return '60s';   // Mức tải trung bình lớn (>= 100 CCU): Chờ 1 phút
    if (MAX_VUS > 1) return '30s';      // Load Test nhỏ (11 - 99 CCU): Chờ 30 giây
    return '10s';                       // Smoke Test (<= 10 CCU): Chờ 10 giây
})();

// =========================================================================
// 🎯 XỬ LÝ GIỚI HẠN SỐ LƯỢNG PAGES TRUYỀN VÀO (Tham số -e LIMIT=...)
// =========================================================================
const ALL_PAGE_KEYS = Object.keys(CONFIG.PAGES); // Tổng 29 pages
const TOTAL_AVAILABLE_PAGES = ALL_PAGE_KEYS.length;

let rawLimit = __ENV.LIMIT || __ENV.PAGES;
let limitNumber = rawLimit ? parseInt(rawLimit) : TOTAL_AVAILABLE_PAGES;

if (limitNumber > TOTAL_AVAILABLE_PAGES) {
    console.warn(`\n⚠️  [CẢNH BÁO]: Bạn truyền LIMIT=${limitNumber}, nhưng tổng số pages hiện tại tối đa chỉ là ${TOTAL_AVAILABLE_PAGES}!`);
    console.warn(`➡️  Tự động điều chỉnh số lượng pages về tối đa: ${TOTAL_AVAILABLE_PAGES} pages.\n`);
    limitNumber = TOTAL_AVAILABLE_PAGES;
} else if (isNaN(limitNumber) || limitNumber <= 0) {
    limitNumber = TOTAL_AVAILABLE_PAGES;
}

const TARGET_PAGE_KEYS = ALL_PAGE_KEYS.slice(0, limitNumber);

let finalBaseUrl = RUN_MODE === 'server' ? CONFIG.SERVER_IP : CONFIG.BASE_URL;
let hostHeader = RUN_MODE === 'server' ? CONFIG.DOMAIN : null;

// 2. HÀM TỰ ĐỘNG TẠO CẤU HÌNH THEO TẢI TRỌNG
function generateConfig() {
    let scenarios = {};
    let thresholds = {};
    let totalStartTime = 0; // Biến tích lũy thời gian để chạy tuần tự cho CẢ Smoke Test & Load Test

    TARGET_PAGE_KEYS.forEach((pageKey) => {
        const scenarioName = `scenario_${pageKey}`;

        if (MAX_VUS <= 1) {
            // =================================================================
            // CASE 1: SMOKE TEST (MAX_VUS = 1) - CHẠY TUẦN TỰ NỐI TIẾP NHAU
            // =================================================================
            scenarios[scenarioName] = {
                executor: 'per-vu-iterations',
                vus: 1,
                iterations: 1,
                startTime: `${totalStartTime}s`, // 👈 Nối tiếp thời gian (0s, 25s, 50s...) tránh bị nã đồng thời
                maxDuration: '20s',
                tags: { page_name: pageKey },
            };

            thresholds[`http_req_failed{page_name:${pageKey}}`] = [{
                threshold: 'rate<=0.0', // Smoke Test yêu cầu 100% pass (0% lỗi)
                abortOnFail: false
            }];

            thresholds[`http_req_duration{page_name:${pageKey}}`] = [{
                threshold: 'p(95)<20000',
                abortOnFail: false
            }];

            // Tích lũy thời gian: MaxDuration (20s) + BreakTime (5s) = 25s cho mỗi trang
            totalStartTime += (20 + BREAK_TIME);

        } else {
            // =================================================================
            // CASE 2: LOAD TEST (MAX_VUS > 1) - CHẠY TUẦN TỰ RAMPING VUS
            // =================================================================
            scenarios[scenarioName] = {
                executor: 'ramping-vus',
                startVUs: 0,
                stages: [
                    { duration: `${RAMP_UP_TIME}s`, target: MAX_VUS },
                    { duration: `${STAY_TIME}s`, target: MAX_VUS },
                    { duration: `${RAMP_DOWN_TIME}s`, target: 0 },
                ],
                startTime: `${totalStartTime}s`,
                gracefulStop: GRACEFUL_STOP,
                tags: { page_name: pageKey },
            };

            thresholds[`http_req_duration{page_name:${pageKey}}`] = [{
                threshold: 'p(95)<30000',
                abortOnFail: false,
                delayAbortEval: '20s'
            }];

            thresholds[`http_req_failed{page_name:${pageKey}}`] = [{
                threshold: 'rate<0.05',
                abortOnFail: false,
                delayAbortEval: '20s'
            }];

            totalStartTime += (RAMP_UP_TIME + STAY_TIME + RAMP_DOWN_TIME + BREAK_TIME);
        }
    });

    return { scenarios, thresholds };
}

const config = generateConfig();

export const options = {
    scenarios: config.scenarios,
    thresholds: config.thresholds,
    discardResponseBodies: true,
    insecureSkipTLSVerify: true,
};

export default function () {
    const scenarioName = exec.scenario.name;
    const TARGET_PAGE_KEY = scenarioName.replace('scenario_', '');
    const rawPath = CONFIG.PAGES[TARGET_PAGE_KEY];

    if (!rawPath && rawPath !== '') fail(`❌ LỖI: Không tìm thấy path cho "${TARGET_PAGE_KEY}"`);

    // =========================================================================
    // 🛠 LOGIC ĐIỀU HƯỚNG RIÊNG CHO TRANG TRUCTIEP
    // =========================================================================
    let currentBaseUrl = finalBaseUrl;
    let currentHostHeader = hostHeader;

    if (TARGET_PAGE_KEY === 'tructiep' && RUN_MODE !== 'server') {
        currentBaseUrl = CONFIG.BASE_URL || `https://${CONFIG.DOMAIN}`;
        currentHostHeader = null;
    }

    const cleanBaseUrl = currentBaseUrl.replace(/\/+$/, '');
    const cleanPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const finalUrl = `${cleanBaseUrl}${cleanPath}`;

    const params = {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Connection': 'keep-alive',

            'Sec-Ch-Ua': '"Not;A=Brand";v="8", "Chromium";v="150", "Google Chrome";v="150"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': '"macOS"',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'same-origin',

            'Referer': `${cleanBaseUrl}/`,
            'Origin': cleanBaseUrl,
        },
        tags: { page_name: TARGET_PAGE_KEY },
        timeout: '30s',
    };

    if (currentHostHeader) {
        params.headers['Host'] = currentHostHeader;
    }

    if (exec.scenario.iterationInInstance === 0 && exec.vu.idInTest === 1) {
        console.log(`\n================================================`);
        console.log(`🎬 CHẾ ĐỘ: ${MAX_VUS <= 1 ? 'SMOKE TEST' : 'LOAD TEST'}`);
        console.log(`🚀 ĐANG TEST: ${TARGET_PAGE_KEY.toUpperCase()} | TARGET: ${MAX_VUS} CCU`);
        console.log(`📊 TỔNG SỐ PAGES CHẠY LẦN NÀY: ${limitNumber}/${TOTAL_AVAILABLE_PAGES}`);
        console.log(`⏱️ TIMING: RampUp=${RAMP_UP_TIME}s | Stay=${STAY_TIME}s | RampDown=${RAMP_DOWN_TIME}s | Break=${BREAK_TIME}s`);
        console.log(`🔗 TARGET URL: ${finalUrl}`);
        console.log(`================================================`);
    }

    // 🚀 BẮN HTTP REQUEST
    const res = http.get(finalUrl, params);

    check(res, { 'status is 200': (r) => r.status === 200 });

    if (res.status !== 200) {
        console.error(`[FAIL] Trang: ${TARGET_PAGE_KEY} | Status: ${res.status} | CCU: ${exec.instance.vusActive} | URL: ${finalUrl}`);
    }

    // 💤 SLEEP GIÃN NHỊP
    if (MAX_VUS <= 1) {
        sleep(Math.random() * 2 + 1);
    } else {
        sleep(Math.random() * 3 + 2);
    }
}

// 📊 TỰ ĐỘNG XUẤT VÀ GHI ĐÈ REPORT FILE CỐ ĐỊNH
export function handleSummary(data) {
    const filePath = './testreport/report_loadtest.txt';

    return {
        [filePath]: textSummary(data, { indent: ' ', enableColors: false }),
        'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    };
}