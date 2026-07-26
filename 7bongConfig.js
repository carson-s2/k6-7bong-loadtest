// CHẠY TUẦN TỰ CÁC PAGES
export const CONFIG = {
    // 1. THÔNG TIN SERVER (Bắt buộc truyền từ Terminal: -e SERVER_IP=... -e DOMAIN=...)
    SERVER_IP: __ENV.SERVER_IP || '', 
    DOMAIN: __ENV.DOMAIN || '',

    // 2. CẤU HÌNH MẶC ĐỊNH
    // Tự động ghép DOMAIN nếu không truyền BASE_URL riêng (-e BASE_URL=...)
    BASE_URL: __ENV.BASE_URL || (__ENV.DOMAIN ? `https://${__ENV.DOMAIN}` : ''), 

    // Số lượng VUs (Nó sẽ lấy từ -e MAX_VUS=..., nếu không truyền sẽ mặc định là 1)
    MAX_VUS: (__ENV.MAX_VUS && parseInt(__ENV.MAX_VUS)) ? parseInt(__ENV.MAX_VUS) : 1,

    // 3. DANH SÁCH CÁC TRANG (Script sẽ tự động quét hết danh sách này)
    PAGES: {
        homepage: '/',
        tyle: '/ty-le-bong-da',
        tructiep: '/truc-tiep-bong-da',
        nhandinh: '/nhan-dinh-bong-da',
        tipthuTongQuan: '/du-doan-bong-da?tab=overview',
        tipthuChuyenGia: '/du-doan-bong-da?tab=expert',
        tipthuTranDau: '/du-doan-bong-da?tab=match',
        tipthuTip: '/du-doan-bong-da?tab=tips',
        giaidau: '/giai-dau',

        chitietgiaiTongQuan: '/giai-dau/world-cup-e4wyrn4hgjzq86p',
        chitietgiaiKQ: '/giai-dau/world-cup-e4wyrn4hgjzq86p?tab=ket-qua-thi-dau',
        chitietgiaiBXH: '/giai-dau/world-cup-e4wyrn4hgjzq86p?tab=bxh',
        chitietgiaiCLB: '/giai-dau/world-cup-e4wyrn4hgjzq86p?tab=cac-doi-bong',
        chitietgiaiCT: '/giai-dau/world-cup-e4wyrn4hgjzq86p?tab=danh-sach-cau-thu',

        trandauTQ: '/tran-dau/burnley-wolverhampton-wanderers-2y8m4zh5j88pql0?tab=thong-tin',
        trandauPTSLTK:'/tran-dau/burnley-wolverhampton-wanderers-2y8m4zh5j88pql0?tab=doi-dau&filter=so-lieu-thong-ke',
        trandauPTBDTK:'/tran-dau/burnley-wolverhampton-wanderers-2y8m4zh5j88pql0?tab=doi-dau&filter=bieu-do-thong-ke',
        trandauTLK:'/tran-dau/burnley-wolverhampton-wanderers-2y8m4zh5j88pql0?tab=ty-le-keo',
        trandauBXH:'/tran-dau/burnley-wolverhampton-wanderers-2y8m4zh5j88pql0?tab=bxh',

        teamTQ:'/doi-bong/burnley-l965mkyh954r1ge',
        teamTD:'/doi-bong/burnley-l965mkyh954r1ge?tab=match',
        teamCT:'/doi-bong/burnley-l965mkyh954r1ge?tab=doi-hinh',
        teamBXH:'/doi-bong/burnley-l965mkyh954r1ge?tab=standings',
        teamCN:'/doi-bong/burnley-l965mkyh954r1ge?tab=transfers',
        teamCTTG:'/doi-bong/burnley-l965mkyh954r1ge?tab=injuries_suspensions',
        teamDH:'/doi-bong/burnley-l965mkyh954r1ge?tab=titles',

        sukien: '/su-kien',
        thang22026: '/su-kien/than-co-dieu-toan-khai-xuan-ruoc-loc-thang-22026', 
        thang52026: '/su-kien/dau-truong-xung-vuong-than-tip-thang-052026', 
    },

    // 4. LOGIC THỜI GIAN NGHỈ (BREAK TIME)
    // Có thể tùy chỉnh qua -e BREAK_SMOKE=... hoặc -e BREAK_LOAD=..., mặc định là 5s và 20s
    BREAK_SMOKE: (__ENV.BREAK_SMOKE && parseInt(__ENV.BREAK_SMOKE)) ? parseInt(__ENV.BREAK_SMOKE) : 5, 
    BREAK_LOAD: (__ENV.BREAK_LOAD && parseInt(__ENV.BREAK_LOAD)) ? parseInt(__ENV.BREAK_LOAD) : 20, 
};