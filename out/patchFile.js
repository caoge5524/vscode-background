"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchType = void 0;
exports.getPatchType = getPatchType;
exports.cleanPatch = cleanPatch;
exports.applyPatch = applyPatch;
const constants_js_1 = require("./constants.js");
var PatchType;
(function (PatchType) {
    /** 未发现任何补丁 */
    PatchType["None"] = "None";
    /** 存在旧版本补丁 */
    PatchType["Legacy"] = "Legacy";
    /** 当前版本补丁 */
    PatchType["Latest"] = "Latest";
})(PatchType || (exports.PatchType = PatchType = {}));
/** 检测文件中的补丁状态 */
function getPatchType(content) {
    if (content.includes(constants_js_1.PATCH_VERSION_TAG)) {
        return PatchType.Latest;
    }
    if (content.includes(constants_js_1.PATCH_MARKER_START)) {
        return PatchType.Legacy;
    }
    return PatchType.None;
}
/** 移除文件中的所有补丁 */
function cleanPatch(content) {
    const regex = new RegExp(`\\n?${escapeRegex(constants_js_1.PATCH_MARKER_START)}[\\s\\S]*?${escapeRegex(constants_js_1.PATCH_MARKER_END)}\\n?`, 'g');
    return content.replace(regex, '').trimEnd() + '\n';
}
/** 在文件末尾追加补丁 */
function applyPatch(content, patchCode) {
    const cleaned = cleanPatch(content);
    return cleaned + `\n${constants_js_1.PATCH_MARKER_START} ${constants_js_1.PATCH_VERSION_TAG}\n${patchCode}\n${constants_js_1.PATCH_MARKER_END}\n`;
}
function escapeRegex(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=patchFile.js.map