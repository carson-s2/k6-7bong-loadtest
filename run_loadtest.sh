#!/bin/bash

# =========================================================================
# LẤY THÔNG SỐ TỪ TERMINAL
# Cú pháp: ./run_loadtest.sh <ENV_MODE> <DOMAIN> <SERVER_IP> [MAX_VUS] [SINGLE_PAGE]
# =========================================================================
ENV_MODE=${1:-"local"}      # 'local' hoặc 'server'
DOMAIN=$2                   # Domain
SERVER_IP=$3                 # Server IP
MAX_VUS=${4:-2}             # Số CCU
SINGLE_PAGE=$5              # Trang cụ thể cần test (Ví dụ: tructiep). Để trống = Test ALL

# Kiểm tra thiếu DOMAIN
if [ -z "$DOMAIN" ]; then
    echo "=========================================================="
    echo "❌ LỖI: THIẾU THÔNG TIN DOMAIN!"
    echo "=========================================================="
    exit 1
fi

# TÍNH TOÁN BREAK TIME
if [ $MAX_VUS -ge 1000 ]; then BREAK_TIME=60
elif [ $MAX_VUS -ge 500 ]; then BREAK_TIME=45
elif [ $MAX_VUS -ge 100 ]; then BREAK_TIME=30
elif [ $MAX_VUS -gt 1 ]; then BREAK_TIME=20
else BREAK_TIME=5
fi

# NẾU CÓ TRUYỀN SINGLE_PAGE THÌ CHỈ TEST TRANG ĐÓ, NẾU KHÔNG THÌ TEST CẢ 29 TRANG
if [ -n "$SINGLE_PAGE" ]; then
    PAGES=("$SINGLE_PAGE")
else
    PAGES=(
        "homepage" "tyle" "tructiep" "nhandinh" "tipthuTongQuan" "tipthuChuyenGia" 
        "tipthuTranDau" "tipthuTip" "giaidau" "chitietgiaiTongQuan" "chitietgiaiKetQua" 
        "chitietgiaiBangXepHang" "chitietgiaiCauLacBo" "chitietgiaiCauThu" "trandauTongQuan" 
        "trandauPhanTichSoLieuThongKe" "trandauPhanTichBieuDoThongKe" "trandauTyLeKeo" 
        "trandauBangXepHang" "teamTongQuan" "teamTranDau" "teamCauThu" "teamBangXepHang" 
        "teamChuyenNhuong" "teamChanThuongTreoGio" "teamDanhHieu" "sukien" "thang22026" "thang52026"
    )
fi

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
echo "🎯 TỔNG PAGES : $TOTAL_PAGES page(s)"
echo "=========================================================="

for PAGE in "${PAGES[@]}"
do
    echo ""
    echo "=========================================================="
    echo "▶️ [$CURRENT_INDEX/$TOTAL_PAGES] CHẠY TEST TRANG: $PAGE"
    echo "=========================================================="

    k6 run -e ENV=$ENV_MODE \
           -e DOMAIN=$DOMAIN \
           -e SERVER_IP=$SERVER_IP \
           -e MAX_VUS=$MAX_VUS \
           -e TARGET_PAGE=$PAGE \
           7bongLoadTest.js

    # Nếu chạy nhiều trang thì mới nghỉ xả RAM, nếu test 1 trang thì bỏ qua sleep
    if [ $TOTAL_PAGES -gt 1 ]; then
        echo ""
        echo "💤 Nghỉ $BREAK_TIME giây xả bộ nhớ RAM & Connection Pool..."
        sleep $BREAK_TIME
    fi

    CURRENT_INDEX=$((CURRENT_INDEX+1))
done

echo ""
echo "=========================================================="
echo "✅ HOÀN THÀNH!"
echo "=========================================================="