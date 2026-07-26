//CHẠY TUẦN TỰ 2 PAGES: Home page và Tip thủ
export const CONFIG = {
    // 1. THÔNG TIN SERVER (Sửa IP ở đây khi đổi server test)
    SERVER_IP: 'http://43.198.116.11', 
    DOMAIN: '7bongvn.co',

    // 2. CẤU HÌNH MẶC ĐỊNH
    BASE_URL: 'https://7bongvn.co', 
    // Ưu tiên lấy giá trị từ Terminal thông qua biến môi trường -e MAX_VUS=xxx
    // Nếu không nhập, mặc định sẽ là 1 (Smoke test an toàn)
    MAX_VUS: (__ENV.MAX_VUS && parseInt(__ENV.MAX_VUS)) ? parseInt(__ENV.MAX_VUS) : 1,

    // 3. DANH SÁCH CÁC TRANG (Script sẽ tự động quét hết danh sách này)
    PAGES: {
        homepage: '/',
        //tintuc: '/tin-bong-da',
        tyle: '/ty-le-bong-da',
        tructiep: '/truc-tiep-bong-da',
        //xemlai: '/video-bong-da',
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
    // Thay vì một con số cố định, ta để 2 mức để script chính tự chọn
    BREAK_SMOKE: 5,  // Nghỉ 5 giây giữa các trang khi test 10 CCU
    BREAK_LOAD: 20,  // Nghỉ 20 giây giữa các trang khi test 100 CCU (để server hồi phục)
};