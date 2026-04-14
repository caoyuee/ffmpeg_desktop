#!/bin/bash

REPORT_DIR="test-reports"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

mkdir -p $REPORT_DIR

echo "正在生成测试报告..."

FRONTEND_COVERAGE="N/A"
BACKEND_COVERAGE="N/A"

if [ -f "$REPORT_DIR/frontend/coverage/coverage-summary.json" ]; then
  FRONTEND_COVERAGE=$(cat $REPORT_DIR/frontend/coverage/coverage-summary.json | grep -o '"lines":{[^}]*}' | grep -o '"pct":[0-9.]*' | grep -o '[0-9.]*')
fi

if [ -f "$REPORT_DIR/backend/tarpaulin-report.json" ]; then
  BACKEND_COVERAGE=$(cat $REPORT_DIR/backend/tarpaulin-report.json | grep -o '"coverage":[0-9.]*' | grep -o '[0-9.]*')
fi

cat > $REPORT_DIR/TEST_REPORT.md << EOF
# 测试报告 - FFmpeg Desktop

## 📊 测试概览

- **测试时间**: $DATE
- **前端覆盖率**: ${FRONTEND_COVERAGE}%
- **后端覆盖率**: ${BACKEND_COVERAGE}%

## 🎯 前端测试结果

### 测试统计

$(if [ -f "$REPORT_DIR/frontend/coverage/coverage-summary.json" ]; then
  cat $REPORT_DIR/frontend/coverage/coverage-summary.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
print(f\"- 总文件数: {data.get('total', {}).get('lines', {}).get('total', 'N/A')}\")
print(f\"- 行覆盖率: {data.get('total', {}).get('lines', {}).get('pct', 'N/A')}%\")
print(f\"- 分支覆盖率: {data.get('total', {}).get('branches', {}).get('pct', 'N/A')}%\")
print(f\"- 函数覆盖率: {data.get('total', {}).get('functions', {}).get('pct', 'N/A')}%\")
print(f\"- 语句覆盖率: {data.get('total', {}).get('statements', {}).get('pct', 'N/A')}%\")
" 2>/dev/null || echo "详细数据暂不可用"
else
  echo "前端测试报告未生成"
fi)

### 覆盖率详情

详细报告请查看: \`test-reports/frontend/coverage/index.html\`

## 🎯 后端测试结果

### 测试统计

$(if [ -f "$REPORT_DIR/backend/tarpaulin-report.json" ]; then
  echo "- 覆盖率: ${BACKEND_COVERAGE}%"
else
  echo "后端测试报告未生成"
fi)

### 覆盖率详情

详细报告请查看: \`test-reports/backend/tarpaulin-report.html\`

## 📈 测试执行建议

$(if [ "$FRONTEND_COVERAGE" != "N/A" ] && [ $(echo "$FRONTEND_COVERAGE < 85" | bc) -eq 1 ]; then
  echo "⚠️ 前端覆盖率低于目标值 85%，建议增加测试用例"
else
  echo "✅ 前端覆盖率达标"
fi)

$(if [ "$BACKEND_COVERAGE" != "N/A" ] && [ $(echo "$BACKEND_COVERAGE < 80" | bc) -eq 1 ]; then
  echo "⚠️ 后端覆盖率低于目标值 80%，建议增加测试用例"
else
  echo "✅ 后端覆盖率达标"
fi)

---

*报告由自动化测试系统生成于 $DATE*
EOF

echo "测试报告已生成: $REPORT_DIR/TEST_REPORT.md"
