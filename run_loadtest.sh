#!/bin/bash

# =========================================================================
# LẤY THÔNG SỐ TỪ TERMINAL
# Cú pháp: ./run_loadtest.sh <ENV_MODE> <DOMAIN> [SERVER_IP] [MAX_VUS] [SINGLE_PAGE]
# =========================================================================
ENV_MODE=${1:-"local"}      # 'local' hoặc 'server'
DOMAIN=$2                   # Domain
SERVER_IP=$3                 # Server IP
MAX_VUS=${4:-2}             # Số CCU
SINGLE_PAGE=$5              # Trang cụ thể cần test. Để trống = Test ALL

if [ -z "$DOMAIN" ]; then
    echo "❌ LỖI: THIẾU THÔNG TIN DOMAIN!"
    exit 1
fi

# TÍNH TOÁN BREAK TIME
if [ $MAX_VUS -ge 1000 ]; then BREAK_TIME=60
elif [ $MAX_VUS -ge 500 ]; then BREAK_TIME=45
elif [ $MAX_VUS -ge 100 ]; then BREAK_TIME=30
elif [ $MAX_VUS -gt 1 ]; then BREAK_TIME=20
else BREAK_TIME=5
fi

# DANH SÁCH PAGES
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

# FILE LOG TỔNG HỢP
SUMMARY_FILE="./testreport/00_TOTAL_SUMMARY.txt"

# Khởi tạo tiêu đề Báo cáo Tổng hợp
echo "=======================================================================" > "$SUMMARY_FILE"
echo "📊 BÁO CÁO TỔNG HỢP KẾT QUẢ LOAD TEST K6" >> "$SUMMARY_FILE"
echo "🎬 Môi trường: $ENV_MODE | Domain: $DOMAIN | Target: $MAX_VUS CCU" >> "$SUMMARY_FILE"
echo "⏰ Thời gian test: $(date '+%Y-%m-%d %H:%M:%S')" >> "$SUMMARY_FILE"
echo "=======================================================================" >> "$SUMMARY_FILE"
printf "%-30s | %-12s | %-12s | %-12s\n" "PAGE NAME" "CHECKS RATE" "HTTP FAIL" "AVG REQ TIME" >> "$SUMMARY_FILE"
echo "-----------------------------------------------------------------------" >> "$SUMMARY_FILE"

TOTAL_PAGES=${#PAGES[@]}
CURRENT_INDEX=1

echo "=========================================================="
echo "🚀 BẮT ĐẦU TEST K6 ($TOTAL_PAGES PAGES)"
echo "=========================================================="

for PAGE in "${PAGES[@]}"
do
    echo ""
    echo "▶️ [$CURRENT_INDEX/$TOTAL_PAGES] CHẠY TEST TRANG: $PAGE"

    # Chạy K6
    k6 run -e ENV=$ENV_MODE \
           -e DOMAIN=$DOMAIN \
           -e SERVER_IP=$SERVER_IP \
           -e MAX_VUS=$MAX_VUS \
           -e TARGET_PAGE=$PAGE \
           7bongLoadTest.js

    # TỰ ĐỘNG ĐỌC KẾT QUẢ TỪ REPORT RIÊNG VÀ BỔ SUNG VÀO FILE TỔNG HỢP
    REPORT_FILE="./testreport/report_${PAGE}.txt"
    if [ -f "$REPORT_FILE" ]; then
        CHECKS=$(grep "checks" "$REPORT_FILE" | awk '{print $2}' | head -n 1)
        FAIL_RATE=$(grep "http_req_failed" "$REPORT_FILE" | awk '{print $2}' | head -n 1)
        AVG_TIME=$(grep "http_req_duration" "$REPORT_FILE" | grep "avg=" | awk -F'avg=' '{print $2}' | awk '{print $1}')
        
        [ -z "$CHECKS" ] && CHECKS="ABORTED/FAIL"
        [ -z "$FAIL_RATE" ] && FAIL_RATE="100.00%"
        [ -z "$AVG_TIME" ] && AVG_TIME="N/A"

        printf "%-30s | %-12s | %-12s | %-12s\n" "$PAGE" "$CHECKS" "$FAIL_RATE" "$AVG_TIME" >> "$SUMMARY_FILE"
    else
        printf "%-30s | %-12s | %-12s | %-12s\n" "$PAGE" "NO REPORT" "100.00%" "N/A" >> "$SUMMARY_FILE"
    fi

    if [ $TOTAL_PAGES -gt 1 ]; then
        echo "💤 Nghỉ $BREAK_TIME giây..."
        sleep $BREAK_TIME
    fi

    CURRENT_INDEX=$((CURRENT_INDEX+1))
done

echo ""
echo "=========================================================="
echo "✅ HOÀN THÀNH TOÀN BỘ BÀI TEST!"
echo "📄 Đã xuất file Tổng Hợp Kết Quả tại: $SUMMARY_FILE"
echo "=========================================================="