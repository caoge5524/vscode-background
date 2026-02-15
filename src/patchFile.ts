import { PATCH_MARKER_START, PATCH_MARKER_END, PATCH_VERSION_TAG } from './constants.js';

export enum PatchType {
    /** 未发现任何补丁 */
    None = 'None',
    /** 存在旧版本补丁 */
    Legacy = 'Legacy',
    /** 当前版本补丁 */
    Latest = 'Latest'
}

/** 检测文件中的补丁状态 */
export function getPatchType(content: string): PatchType {
    if (content.includes(PATCH_VERSION_TAG)) { return PatchType.Latest; }
    if (content.includes(PATCH_MARKER_START)) { return PatchType.Legacy; }
    return PatchType.None;
}

/** 移除文件中的所有补丁 */
export function cleanPatch(content: string): string {
    const regex = new RegExp(
        `\\n?${escapeRegex(PATCH_MARKER_START)}[\\s\\S]*?${escapeRegex(PATCH_MARKER_END)}\\n?`,
        'g'
    );
    return content.replace(regex, '').trimEnd() + '\n';
}

/** 在文件末尾追加补丁 */
export function applyPatch(content: string, patchCode: string): string {
    const cleaned = cleanPatch(content);
    return cleaned + `\n${PATCH_MARKER_START} ${PATCH_VERSION_TAG}\n${patchCode}\n${PATCH_MARKER_END}\n`;
}

function escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
