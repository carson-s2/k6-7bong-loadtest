#!/bin/bash

# =========================================================================
# LẤY THÔNG SỐ TỪ TERMINAL
# Cú pháp: ./run_loadtest.sh <ENV_MODE> <DOMAIN> [SERVER_IP] [MAX_VUS]
# =========================================================================
ENV_MODE=${1:-"local"}      # Môi trường: 'local' hoặc 'server' (Mặc định: local)
DOMAIN=$2                   # Domain (Bắt buộc): ví dụ mydomain.com
SERVER_IP=$3                 # Server IP (Chỉ bắt buộc khi ENV_MODE là 'server')
MAX_VUS=${4:-2}             # Số CCU (Mặc định: 2)

# =========================================================================
# KIỂM TRA ĐẦU VÀO VÀ BÁO LỖI NẾU THIẾU
# =========================================================================
if [ -z "$DOMAIN" ]; then
    echo "=========================================================="
    echo "❌ LỖI: THIẾU THÔNG TIN DOMAIN!"
    echo "👉 CÚ PHÁP CHUẨN:"
    echo "   1. Chạy trên LOCAL  : ./run_loadtest.sh local <DOMAIN> '' [MAX_VUS]"
    echo "   2. Chạy trên SERVER : ./run_loadtest.sh server <DOMAIN> <SERVER_IP> [MAX_VUS]"
    echo ""
    echo "📌 Ví dụ chạy LOCAL:"
    echo "   ./run_loadtest.sh local mydomain.com '' 2"
    echo ""
    echo "📌 Ví dụ chạy SERVER:"
    echo "   ./run_loadtest.sh server mydomain.com http://{SERVER IP} 2"
    echo "=========================================================="
    exit 1
fi

if [ "$ENV_MODE" == "server" ] && [ -z "$SERVER_IP" ]; then
    echo "❌ LỖI: Bạn chọn chạy chế độ 'server' nhưng chưa truyền SERVER_IP!"
    echo "👉 Ví dụ: ./run_loadtest.sh server mydomain.com http://{SERVER_IP} 2"
    exit 1
fi

# TÍNH TOÁN THỜI GIAN NGHỈ GIỮA CÁC TRANG
if [ $MAX_VUS -ge 1000 ]; then BREAK_TIME=60
elif [ $MAX_VUS -ge 500 ]; then BREAK_TIME=45
elif [ $MAX_VUS -ge 100 ]; then BREAK_TIME=30
elif [ $MAX_VUS -gt 1 ]; then BREAK_TIME=20
else BREAK_TIME=5
fi

# DANH SÁCH 29 TRANG
PAGES=(
    "homepage" "tyle" "tructiep" "nhandinh" "tipthuTongQuan" "tipthuChuyenGia" 
    "tipthuTranDau" "tipthuTip" "giaidau" "chitietgiaiTongQuan" "chitietgiaiKetQua" 
    "chitietgiaiBangXepHang" "chitietgiaiCauLacBo" "chitietgiaiCauThu" "trandauTongQuan" 
    "trandauPhanTichSoLieuThongKe" "trandauPhanTichBieuDoThongKe" "trandauTyLeKeo" 
    "trandauBangXepHang" "teamTongQuan" "teamTranDau" "teamCauThu" "teamBangXepHang" 
    "teamChuyenNhuong" "teamChanThuongTreoGio" "teamDanhHieu" "sukien" "thang22026" "thang52026"
)

mkdir -p ./testreport
TOTAL_PAGES=${#PAGES[@]}
CURRENT_INDEX=1

echo "=========================================================="
echo "🚀 BẮT ĐẦU TEST K6"
echo "🎬 MÔI TRƯỜNG : $ENV_MODE"
echo "🌐 DOMAIN     : $DOMAIN"
if [ "$ENV_MODE" == "server" ]; then
    echo "🖥️ SERVER IP  : $SERVER_IP"
fi
echo "👥 TARGET TẢI : $MAX_VUS CCU"
echo "=========================================================="

for PAGE in "${PAGES[@]}"
do
    echo ""
    echo "=========================================================="
    echo "▶️ [$CURRENT_INDEX/$TOTAL_PAGES] CHẠY TEST TRANG: $PAGE"
    echo "=========================================================="

    # Truyền đúng tham số ENV sang K6 JS
    k6 run -e ENV=$ENV_MODE \
           -e DOMAIN=$DOMAIN \
           -e SERVER_IP=$SERVER_IP \
           -e MAX_VUS=$MAX_VUS \
           -e TARGET_PAGE=$PAGE \
           7bongLoadTest.js

    echo ""
    echo "💤 Nghỉ $BREAK_TIME giây xả bộ nhớ RAM & Connection Pool..."
    sleep $BREAK_TIME

    CURRENT_INDEX=$((CURRENT_INDEX+1))
done

echo ""
echo "=========================================================="
echo "✅ HOÀN THÀNH TOÀN BỘ 29 TRANG!"
echo "📁 Báo cáo chi tiết đã lưu tại thư mục: ./testreport/"
echo "=========================================================="