# Tauri 配置文件说明

本项目使用 JSON5 格式的配置文件，支持注释和更灵活的语法。

## 📁 配置文件结构

```
src-tauri/
├── tauri.conf.json5           # 基础配置（所有平台共享）
├── tauri.linux.conf.json5     # Linux 平台特定配置
├── tauri.macos.conf.json5     # macOS 平台特定配置
├── tauri.windows.conf.json5   # Windows 平台特定配置
└── tauri.conf.json            # 旧配置文件（已弃用）
```

## 🔧 配置文件优先级

Tauri 会按以下顺序合并配置文件：

1. **tauri.conf.json5** - 基础配置
2. **tauri.{platform}.conf.json5** - 平台特定配置（根据当前构建平台）

平台特定配置会覆盖基础配置中的同名字段。

## 🚀 使用方法

### 开发环境

```bash
# 运行开发环境（自动使用对应平台配置）
pnpm tauri dev
```

### 构建打包

```bash
# 构建当前平台
pnpm tauri build

# 构建指定平台
pnpm tauri build --target x86_64-pc-windows-msvc    # Windows
pnpm tauri build --target x86_64-apple-darwin        # macOS Intel
pnpm tauri build --target aarch64-apple-darwin       # macOS Apple Silicon
pnpm tauri build --target x86_64-unknown-linux-gnu   # Linux
```

## 📋 配置文件说明

### tauri.conf.json5（基础配置）
- 应用基本信息（名称、版本、标识符）
- 开发服务器配置
- 窗口基础配置
- 插件配置
- 通用打包配置

### tauri.linux.conf.json5（Linux 配置）
- Debian/Ubuntu (.deb) 打包配置
- RedHat/Fedora (.rpm) 打包配置
- AppImage 打包配置
- Linux 特定图标

### tauri.macos.conf.json5（macOS 配置）
- DMG 打包配置
- macOS 最低系统版本
- 代码签名配置
- macOS 特定图标

### tauri.windows.conf.json5（Windows 配置）
- MSI 安装程序配置（WiX）
- NSIS 安装程序配置
- WebView2 运行时配置
- 数字签名配置
- Windows 特定图标

## ⚙️ 常用配置项

### 修改应用名称和版本

编辑 `tauri.conf.json5`：

```json5
{
  productName: "你的应用名称",
  version: "1.0.0",
  identifier: "com.yourcompany.appname"
}
```

### 修改窗口大小

编辑 `tauri.conf.json5`：

```json5
{
  app: {
    windows: [
      {
        width: 1280,
        height: 720,
        resizable: true
      }
    ]
  }
}
```

### 修改开发服务器端口

编辑 `tauri.conf.json5`：

```json5
{
  build: {
    devUrl: "http://localhost:你的端口"
  }
}
```

## 📚 更多文档

- [Tauri 配置文件官方文档](https://tauri.app/zh-cn/develop/configuration-files/)
- [完整配置项参考](https://tauri.app/reference/config/)

## 🔄 迁移说明

旧的 `tauri.conf.json` 文件已被拆分为多个 JSON5 配置文件。JSON5 支持：
- ✅ 单行和多行注释
- ✅ 尾随逗号
- ✅ 更灵活的语法
- ✅ 更好的可读性

建议删除旧的 `tauri.conf.json` 文件，使用新的 JSON5 配置文件。
