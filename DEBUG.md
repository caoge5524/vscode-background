# VSCode Background - 调试指南

本文档说明如何调试 VSCode Background 扩展。

## 调试配置

### 可用的调试配置

通过按 `F5` 或选择"运行和调试"（`Ctrl+Shift+D`），可以选择以下配置之一：

#### 1. **Run Extension** (推荐首次调试)
- **用途**：执行单次完整编译后启动扩展主机进行调试
- **特点**：
  - 每次启动前执行 `npm run compile`
  - 较快的启动速度
  - 适合一次性调试
- **使用场景**：进行重大代码更改后，需要完整重新编译

#### 2. **Watch & Run Extension** (推荐开发过程)
- **用途**：启动文件监视模式，在代码改变时自动重新编译，然后启动扩展主机
- **特点**：
  - 启动 `npm run watch` 监视任务
  - 代码更改时自动编译
  - 需要在调试器外推荐重新加载窗口
- **使用场景**：长时间开发，频繁修改代码

#### 3. **Extension Tests**
- **用途**：运行扩展测试套件
- **特点**：
  - 编译并运行 `out/test/extension.test.js`
  - 适合单元测试和集成测试
- **使用场景**：验证自动化测试

## 开始调试

### 快速开始

1. **打开此项目** - 在 VS Code 中打开 `vscode-background` 文件夹
2. **打开运行视图** - 按 `Ctrl+Shift+D` 或点击左侧活动栏的"运行和调试"
3. **选择配置** - 从下拉列表选择：
   - "Run Extension" (单次编译)
   - 或 "Watch & Run Extension" (监视模式)
4. **开始调试** - 按 `F5` 或点击绿色"启动"按钮
5. **等待启动** - 编译和启动会花费 5-15 秒
6. **测试扩展** - 将开启带加载的新 VS Code 窗口

### 设置断点

- **在编辑器中点击行号左侧** 设置/移除断点
- **条件断点** - 右击行号，选择"添加条件断点"
- **观察表达式** - 在调试器的"观察"面板中输入变量名

## 调试工作流

### 开发工作流（推荐）

```bash
# 终端 1: 启动监视编译
npm run watch

# 终端 2 或调试器:
# 选择 "Watch & Run Extension" 并按 F5
```

此工作流优势：
- 代码更改后自动编译
- 在调试器中设置断点
- 每次更改扩展代码后，点击调试工具栏中的"重新加载"按钮（两个箭头）

### 单次调试工作流

```bash
# 直接按 F5，选择 "Run Extension"
# 调试器会：
# 1. 运行 npm run compile
# 2. 启动扩展主机
# 3. 在断点处暂停
```

## 源映射

**源映射已配置**并会自动生成（`.js.map` 文件）。

- TypeScript 编译时自动创建 `*.js.map` 文件
- 调试器使用源映射将调试操作映射回原始 TypeScript 代码
- 在编辑器中直接看到 TypeScript 代码，而不是编译后的 JavaScript

如果源映射不工作：
1. 确保 `tsconfig.json` 中 `"sourceMap": true`
2. 检查 `out/` 目录中是否存在 `*.js.map` 文件
3. 在 launch.json 中确认 `"sourceMaps": true`

## 调试技巧

### 查看变量值

在调试过程中暂停时：

1. **变量面板** - 左侧"变量"中自动显示本地和全局变量
2. **悬停提示** - 在编辑器中悬停变量名查看值
3. **监视表达式** - 在"监视"面板中输入任何表达式
4. **调试控制台** - 在底部"调试控制台"中输入表达式

### 步进调试

使用调试工具栏：
- **Step Over** (`F10`) - 执行当前行，不进入函数
- **Step Into** (`F11`) - 进入函数调用
- **Step Out** (`Shift+F11`) - 执行直到返回当前函数
- **Continue** (`F5`) - 运行直到下一断点

### 条件断点

右击行号设置条件：
```javascript
// 示例：仅在 count > 10 时中断
count > 10

// 示例：仅在特定对象时中断
filePath.includes('workbench')
```

### 日志点 (Logpoint)

右击行号，选择"添加日志点"，输入消息（支持表达式）：
```javascript
Patch applying: ${fileName}
Error: ${error.message}
```

不会暂停执行，在控制台输出消息。

## 新 VSCode 窗口中的测试

调试启动的新 VS Code 窗口：

- **支持自己的设置** - 可配置 `settings.json` 进行测试
- **加载此扩展** - vscode-background 自动加载
- **其他扩展禁用** - 使用 `--disable-extensions` 减少干扰
- **运行命令** - 按 `Ctrl+Shift+P` 测试扩展命令

### 常见任务

测试"安装"命令：
```
1. 打开 settings.json (Ctrl+,)
2. 搜索 "VSCode Background"
3. 添加测试视频路径
4. 按 Ctrl+Shift+P，运行 "VSCode Background: Install / Update"
5. 观察调试器的断点和输出
```

## 调试输出

扩展在"输出"面板中输出信息：

1. 打开"输出"面板（`Ctrl+Shift+U`）
2. 从下拉列表选择 "VSCode Background"
3. 查看日志消息

## 常见问题

### 调试器不暂停在断点处

**解决方案**：
1. 确保编译产生源映射 (`out/*.js.map` 存在)
2. 确认 launch.json 中 `"sourceMaps": true`
3. 尝试编译 (`npm run compile`)
4. 完全重启调试器

### "preLaunchTask not found" 错误

**解决方案**：
1. 检查 `tasks.json` 是否存在 "npm: compile" 或 "npm: watch" 任务
2. 确保任务名完全匹配 launch.json 中的 `preLaunchTask`
3. 重新加载窗口 (`Ctrl+Shift+P`, "Developer: Reload Window")

### 代码更改后断点不工作

**解决方案**：
1. 在调试工具栏单击"重新启动"按钮（或按 `Ctrl+Shift+F5`）
2. 或停止调试 (`Shift+F5`)，然后再次按 `F5` 启动

### 新窗口无法连接

**解决方案**：
1. 确保端口 9333（调试器通常使用）未被占用
2. 检查防火墙设置是否允许 VS Code 通信
3. 查看主窗口的"调试控制台"了解连接问题

## 性能调试

### 测量启动时间

在调试控制台运行：
```javascript
console.time('initialization');
// ... 代码 ...
console.timeEnd('initialization');
```

### 内存使用

在新 VS Code 窗口中：
1. 按 `Ctrl+Shift+I` 打开开发人员工具
2. 切换到"性能"或"内存"标签
3. 记录会话并分析

## 清理

### 停止调试

- 按 `Shift+F5` 或点击调试工具栏中的停止按钮
- 新 VS Code 窗口会关闭

### 清理编译产物

```bash
npm run clean  # 如果配置了 clean 脚本
# 或手动删除 out/ 目录
rm -r out/
```

## 参考资源

- [VS Code 扩展调试文档](https://code.visualstudio.com/api/working-with-extensions/debugging-extensions)
- [调试配置文档](https://code.visualstudio.com/docs/editor/debugging#_launch-configurations)
- [源映射支持](https://code.visualstudio.com/docs/languages/typescript#_source-maps)

---

如有问题，请查看以下位置的日志：
- **扩展宿主输出** - "输出"面板中的"Extension Host"
- **VSCode 调试控制台** - 主窗口底部的"调试控制台"
- **新窗口开发工具** - `Ctrl+Shift+I` (如适用)

祝调试顺利！
