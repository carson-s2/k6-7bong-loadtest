import http from 'k6/http';
import { check, sleep, fail } from 'k6';
import execution from 'k6/execution';
import { CONFIG } from './7bongConfig.js';

// 1. LẤY CẤU HÌNH TỪ TERMINAL
// Lệnh chạy mẫu: k6 run -e MAX_VUS=100 script.js
const MAX_VUS = __ENV.MAX_VUS ? parseInt(__ENV.MAX_VUS) : CONFIG.MAX_VUS;
const RUN_MODE = __ENV.ENV; 

let finalBaseUrl = RUN_MODE === 'server' ? CONFIG.SERVER_IP : CONFIG.BASE_URL;
let hostHeader = RUN_MODE === 'server' ? CONFIG.DOMAIN : null;

// 2. HÀM TỰ ĐỘNG TẠO CẤU HÌNH THEO TẢI TRỌNG
function generateConfig() {
    let scenarios = {};
    let thresholds = {};
    let totalStartTime = 0; // Biến tích lũy thời gian để chạy tuần tự
    const pageKeys = Object.keys(CONFIG.PAGES);

    // PHÂN BỔ THỜI GIAN CHO 10 PHÚT (600 GIÂY)
    const RAMP_UP_TIME = 120;   // 2 phút: Tăng dần từ 0 lên MAX_VUS
    const STAY_TIME = 420;      // 7 phút: Duy trì mức tải cao nhất để xem độ ổn định
    const RAMP_DOWN_TIME = 60;   // 1 phút: Hạ tải dần dần
    const BREAK_TIME = 5;       // 5 giây nghỉ giữa các trang để server giải phóng connection

    pageKeys.forEach((pageKey) => {
        const scenarioName = `scenario_${pageKey}`;

        if (MAX_VUS <= 10) {
            // CASE 1: SMOKE TEST
            scenarios[scenarioName] = {
                executor: 'per-vu-iterations',
                vus: MAX_VUS,
                iterations: 1,
                startTime: `${totalStartTime}s`,
                maxDuration: '30s',
                tags: { page_name: pageKey },
            };
            totalStartTime += (30 + BREAK_TIME);
        } else {
            // CASE 2: LOAD TEST - Chạy tuần tự 10 phút/trang
            scenarios[scenarioName] = {
                executor: 'ramping-vus',
                startVUs: 0,
                stages: [
                    { duration: `${RAMP_UP_TIME}s`, target: MAX_VUS }, // 2 phút đầu tăng tải
                    { duration: `${STAY_TIME}s`, target: MAX_VUS },    // 7 phút tiếp theo giữ tải đỉnh
                    { duration: `${RAMP_DOWN_TIME}s`, target: 0 },     // 1 phút cuối hạ tải
                ],
                startTime: `${totalStartTime}s`,
                tags: { page_name: pageKey },
            };
            
            // Cập nhật startTime cho trang kế tiếp
            // Tổng cộng: 120s + 420s + 60s = 600s (10 phút)
            totalStartTime += (RAMP_UP_TIME + STAY_TIME + RAMP_DOWN_TIME + BREAK_TIME);
        }

        // --- THRESHOLDS  ---
        thresholds[`http_req_duration{page_name:${pageKey}}`] = [{ 
            threshold: 'p(95)<10000', // Tăng ngưỡng lên 10s (hoặc chỉnh tùy nhu cầu)
            abortOnFail: true,       // Đổi thành false để k6 KHÔNG dừng ngang khi bị vi phạm
            delayAbortEval: '20s'
        }];

        thresholds[`http_req_failed{page_name:${pageKey}}`] = [{ 
            threshold: 'rate<0.05',  
            abortOnFail: true,       // // Đổi thành false để k6 KHÔNG dừng ngang khi bị vi phạm
            delayAbortEval: '20s' 
        }];

    });

    return { scenarios, thresholds };
}

const config = generateConfig();

export const options = {
    scenarios: config.scenarios,
    thresholds: config.thresholds,
    // QUAN TRỌNG: Không tải body về để tránh nghẽn băng thông và tốn RAM máy test
    discardResponseBodies: true,
};

export default function () {
    const scenarioName = execution.scenario.name;
    const TARGET_PAGE_KEY = scenarioName.replace('scenario_', '');
    const path = CONFIG.PAGES[TARGET_PAGE_KEY];

    if (!path) fail(`❌ LỖI: Không tìm thấy path cho "${TARGET_PAGE_KEY}"`);

    // ĐÃ REMOVE RANDOM QUERY PARAMS để tận dụng Cache của Server (mô phỏng người dùng thật)
     const finalUrl = `${finalBaseUrl}${path}`;
     
    const params = {
        headers: { 'User-Agent': 'K6-Performance-Test/1.0', 'Connection': 'keep-alive' },
        tags: { page_name: TARGET_PAGE_KEY },
        timeout: '30s',
    };

    if (hostHeader) params.headers['Host'] = hostHeader;

    // Log thông tin khi bắt đầu mỗi trang
    if (execution.scenario.iterationInTest === 0) {
        console.log(`\n================================================`);
        console.log(`🎬 CHẾ ĐỘ: ${MAX_VUS <= 10 ? 'SMOKE TEST' : 'LOAD TEST'}`);
        console.log(`🚀 ĐANG TEST: ${TARGET_PAGE_KEY.toUpperCase()} | TARGET: ${MAX_VUS} CCU`);
        console.log(`================================================`);
    }

    // Nếu chạy tải cao, thêm sleep để mô phỏng người dùng thật đọc nội dung
    if (MAX_VUS > 10) {
        sleep(Math.random() * 2 + 1);
    }

    const res = http.get(finalUrl, params);

    // Kiểm tra status code
    check(res, { 'status is 200': (r) => r.status === 200 });

    if (res.status !== 200) {
        console.error(`[FAIL] Trang: ${TARGET_PAGE_KEY} | Status: ${res.status} | CCU: ${execution.instance.vusActive}`);
    }
}