#!/usr/bin/env node

/**
 * 清理和验证脚本
 * 这个脚本将：
 * 1. 清理所有旧的编译输出
 * 2. 清理 VSCode 缓存
 * 3. 测试新的补丁生成器
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const projectRoot = process.cwd();
const outDir = path.join(projectRoot, 'out');
const appDataDir = process.env.APPDATA || process.env.HOME;

console.log('='.repeat(60));
console.log('VSCode Background - 深度清理和验证脚本');
console.log('='.repeat(60));

// 步骤 1：删除编译输出
console.log('\n[步骤 1] 删除旧编译输出...');
try {
    if (fs.existsSync(outDir)) {
        fs.rmSync(outDir, { recursive: true, force: true });
        console.log('✅ 已删除 out/ 目录');
    }
} catch (err) {
    console.warn('⚠️  无法删除 out/ 目录:', err.message);
}

// 步骤 2：重新编译
console.log('\n[步骤 2] 重新编译项目...');
try {
    execSync('npm run compile', { stdio: 'inherit', cwd: projectRoot });
    console.log('✅ 编译成功');
} catch (err) {
    console.error('❌ 编译失败:', err.message);
    process.exit(1);
}

// 步骤 3：验证补丁生成器
console.log('\n[步骤 3] 验证补丁生成器...');
try {
    const { generatePatch } = require('./out/patchGenerator.js');

    const testConfig = {
        videos: ['C:\\Videos\\test.mp4'],
        opacity: 0.8,
        switchInterval: 180,
        theme: 'glass'
    };

    const patch = generatePatch(testConfig);

    // 验证语法
    new Function(patch);
    console.log('✅ 补丁生成器工作正常');
    console.log('   - 生成代码长度:', patch.length, '字符');
    console.log('   - JavaScript 语法:', '✅ 正确');

    // 检查关键内容
    if (patch.includes('hideCorruptNotifications')) {
        console.log('   - 通知隐藏逻辑:', '✅ 包含');
    } else {
        console.log('   - 通知隐藏逻辑:', '❌ 缺失');
    }

    if (patch.includes('keywords=')) {
        console.log('   - 关键字数组:', '✅ 包含');
    } else {
        console.log('   - 关键字数组:', '❌ 缺失');
    }

} catch (err) {
    console.error('❌ 补丁验证失败:', err.message);
    process.exit(1);
}

// 步骤 4：清理 VSCode 缓存（Windows）
console.log('\n[步骤 4] 清理 VSCode 缓存...');
try {
    const cacheDir = path.join(appDataDir, 'Code', 'Cache');
    const cacheDirData = path.join(appDataDir, 'Code', 'CachedData');

    let cleaned = 0;

    if (fs.existsSync(cacheDir)) {
        fs.rmSync(cacheDir, { recursive: true, force: true });
        cleaned++;
        console.log('✅ 已清空 Code/Cache');
    }

    if (fs.existsSync(cacheDirData)) {
        fs.rmSync(cacheDirData, { recursive: true, force: true });
        cleaned++;
        console.log('✅ 已清空 Code/CachedData');
    }

    if (cleaned === 0) {
        console.log('ℹ️  缓存目录不存在或已清空');
    }

} catch (err) {
    console.warn('⚠️  无法清理 VSCode 缓存:', err.message);
    console.log('   手动操作: 删除 %APPDATA%\\Code\\Cache 和 %APPDATA%\\Code\\CachedData');
}

// 步骤 5：总结
console.log('\n' + '='.repeat(60));
console.log('✅ 清理和验证完成！');
console.log('='.repeat(60));

console.log('\n下一步操作：');
console.log('1️⃣  完全关闭所有 VSCode 窗口（包括调试器）');
console.log('2️⃣  按 F5 启动新的调试会话');
console.log('3️⃣  选择 "Run Extension"');
console.log('4️⃣  等待新 VSCode 窗口启动（15-20秒）');
console.log('5️⃣  按 Ctrl+Shift+I 打开开发者工具，检查 Console');
console.log('6️⃣  不应该再看到 "SyntaxError: Unexpected identifier" 错误');

console.log('\n注意：');
console.log('⚠️  如果问题仍然存在，可能是系统 VSCode 文件被污染。');
console.log('   解决方案: 检查 C:\\Program Files\\Microsoft VS Code\\resources');
console.log('         或运行 VSCode 的修复安装/验证安装功能。');
