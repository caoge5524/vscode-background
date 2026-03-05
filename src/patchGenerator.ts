import { normalizeVideoUrl } from './vscodePath.js';

export type ThemeType = 'glass' | 'matte' | 'neon' | 'cinema' | 'aurora' | 'minimal' | 'retro';

export interface PatchConfig {
    videos: string[];
    opacity: number;
    switchInterval: number; // 秒
    theme: ThemeType;
    transitions: string[]; // 每对媒体间的切换特效，长度 = videos.length - 1
    extensionPath?: string; // 用于背景跳转 IPC：注入 JS 会轮询此目录下的 vscbg-jump.json
}

/**
 * 生成注入到 workbench.desktop.main.js 的完整补丁代码
 */
export function generatePatch(config: PatchConfig): string {
    const parts: string[] = [];

    // 1. 隐藏"安装似乎损坏"通知
    parts.push(generateChecksumsPatch());

    // 2. 主题 CSS
    parts.push(generateThemePatch(config.theme, config.opacity));

    // 3. 视频背景
    if (config.videos.length > 0) {
        parts.push(generateVideoPatch(config));
    }

    return parts.join('\n');
}

/**
 * 注入 JavaScript 隐藏校验和失败的通知弹窗
 * 使用 MutationObserver 动态查找并隐藏所有包含"corrupt/损坏"等关键字的通知
 * 这种方式避免了复杂 CSS 选择器和国际化文本转义的问题
 */
function generateChecksumsPatch(): string {
    // 检测"损坏"通知的多语言关键字
    const corruptKeywords = [
        'corrupt',           // English
        '损坏', '安装', '似乎',      // Chinese
        'インストール',      // Japanese
        'beschädigt',        // German
        'corrompue',         // French
        'dañada',            // Spanish
        '손상',              // Korean
        'corrompida',        // Portuguese
        'danneggiata',       // Italian
        'повреждена',        // Russian
        'uszkodzona',        // Polish
        'bozuk',             // Turkish
        '損毀',              // Traditional Chinese
        'sérült',            // Hungarian
        'poškozená',         // Czech
    ];

    return `(function(){
var hideCorruptNotifications=function(){
var keywords=${JSON.stringify(corruptKeywords)};
var selectors=['.notification-toast','.notification-container','.notificationToast','[role="alert"]','[aria-live="polite"]','.message'];
var allElements=[];
for(var s=0;s<selectors.length;s++){
var els=document.querySelectorAll(selectors[s]);
for(var i=0;i<els.length;i++){
allElements.push(els[i]);
}
}
for(var i=0;i<allElements.length;i++){
var el=allElements[i];
var text=(el.textContent||el.innerText||el.getAttribute('aria-label')||'').toLowerCase();
var ariaLabel=(el.getAttribute('aria-label')||'').toLowerCase();
var title=(el.getAttribute('title')||'').toLowerCase();
var dataLabel=(el.getAttribute('data-label')||'').toLowerCase();
var fullText=text+' '+ariaLabel+' '+title+' '+dataLabel;
var found=false;
for(var j=0;j<keywords.length;j++){
if(fullText.indexOf(keywords[j].toLowerCase())>-1){
found=true;
break;
}
}
if(found){
el.style.display='none!important';
el.remove();
}
}
};
if(document.readyState==='loading'){
document.addEventListener('DOMContentLoaded',function(){
setTimeout(hideCorruptNotifications,100);
});
}else{
setTimeout(hideCorruptNotifications,100);
}
var observer=new MutationObserver(function(){
setTimeout(hideCorruptNotifications,50);
});
observer.observe(document.documentElement,{childList:true,subtree:true});
})();`;
}

/**
 * 注入主题 CSS（透明度和模糊效果）
 * 支持 7 种主题：glass, matte, neon, cinema, aurora, minimal, retro
 */
function generateThemePatch(theme: string, opacity: number): string {
    const css = getThemeCss(theme, opacity);

    // 对 CSS 文本进行转义
    const escapedCss = css
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'")
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r');

    return `(function(){
var s=document.createElement('style');
s.textContent='${escapedCss}';
document.head.appendChild(s);
})();`;
}

/** 各主题的 CSS 生成 */
function getThemeCss(theme: string, opacity: number): string {
    switch (theme) {
        case 'matte': {
            // 移除磨砂效果，改为普通深色背景，避免遮挡
            return [
                `.monaco-workbench{opacity:${opacity}!important;background:#232323!important;}`,
                `.monaco-workbench .part{background:#232323!important;}`,
                `.monaco-workbench .editor-container{background:#232323!important;}`,
                `body{background:transparent!important}`,
            ].join('');
        }
        case 'neon': {
            // 霓虹 — 赛博朋克风格发光边框
            return [
                `.monaco-workbench{opacity:${opacity}!important;background:rgba(10,0,20,0.6)!important;backdrop-filter:blur(4px) saturate(200%);-webkit-backdrop-filter:blur(4px) saturate(200%)}`,
                `.monaco-workbench .part{background:rgba(20,0,40,0.25)!important;border:1px solid rgba(0,255,255,0.15)!important;box-shadow:inset 0 0 30px rgba(0,255,255,0.03)}`,
                `.monaco-workbench .part.sidebar{box-shadow:inset -1px 0 20px rgba(255,0,255,0.05)}`,
                `.monaco-workbench .part.panel{box-shadow:inset 0 1px 20px rgba(0,255,128,0.05)}`,
                `.monaco-workbench .editor-container{background:rgba(5,0,15,0.35)!important}`,
                `.monaco-workbench .title.tabs{background:rgba(10,0,25,0.3)!important}`,
                `body{background:transparent!important}`,
            ].join('');
        }
        case 'cinema': {
            // 影院 — 宽屏电影观感，顶底黑边
            return [
                `.monaco-workbench{opacity:${opacity}!important;background:rgba(0,0,0,0.5)!important}`,
                `.monaco-workbench .part.titlebar{background:rgba(0,0,0,0.85)!important;box-shadow:0 2px 20px rgba(0,0,0,0.6)}`,
                `.monaco-workbench .part.statusbar{background:rgba(0,0,0,0.85)!important;box-shadow:0 -2px 20px rgba(0,0,0,0.6)}`,
                `.monaco-workbench .part.sidebar{background:rgba(0,0,0,0.5)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}`,
                `.monaco-workbench .part.panel{background:rgba(0,0,0,0.55)!important;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}`,
                `.monaco-workbench .editor-container{background:rgba(0,0,0,0.3)!important}`,
                `body{background:transparent!important}`,
            ].join('');
        }
        case 'aurora': {
            // 极光 — 彩色渐变光晕叠加
            return [
                `.monaco-workbench{opacity:${opacity}!important;background:linear-gradient(135deg,rgba(20,0,40,0.5),rgba(0,20,40,0.5),rgba(0,40,20,0.5))!important;backdrop-filter:blur(8px) saturate(150%);-webkit-backdrop-filter:blur(8px) saturate(150%)}`,
                `.monaco-workbench .part{background:rgba(10,10,30,0.2)!important}`,
                `.monaco-workbench .part.sidebar{background:linear-gradient(180deg,rgba(40,0,80,0.15),rgba(0,40,80,0.15))!important}`,
                `.monaco-workbench .part.panel{background:linear-gradient(0deg,rgba(0,60,40,0.15),rgba(0,20,60,0.15))!important}`,
                `.monaco-workbench .editor-container{background:rgba(5,5,20,0.25)!important}`,
                `body{background:transparent!important}`,
            ].join('');
        }
        case 'minimal': {
            // 极简 — 仅降低不透明度，无额外效果
            return [
                `.monaco-workbench{opacity:${opacity}!important;background:transparent!important}`,
                `.monaco-workbench .part{background:transparent!important}`,
                `.monaco-workbench .editor-container{background:transparent!important}`,
                `body{background:transparent!important}`,
            ].join('');
        }
        case 'retro': {
            // 复古 — 暖色调做旧效果
            return [
                `.monaco-workbench{opacity:${opacity}!important;background:rgba(40,30,20,0.55)!important;backdrop-filter:blur(3px) sepia(30%) saturate(120%);-webkit-backdrop-filter:blur(3px) sepia(30%) saturate(120%)}`,
                `.monaco-workbench .part{background:rgba(50,35,20,0.25)!important}`,
                `.monaco-workbench .part.sidebar{background:rgba(45,30,15,0.3)!important}`,
                `.monaco-workbench .part.panel{background:rgba(40,28,15,0.35)!important}`,
                `.monaco-workbench .editor-container{background:rgba(35,25,15,0.3)!important}`,
                `.monaco-workbench .title.tabs{background:rgba(50,35,20,0.3)!important}`,
                `body{background:transparent!important}`,
            ].join('');
        }
        case 'glass':
        default:
            // 玻璃 — 完全透明，清晰看到视频
            return `.monaco-workbench{opacity:${opacity}!important}`;
    }
}

// ─────────────────────────────────────────────────────────────
//  切换特效系统（类比主题系统 getThemeCss / generateThemePatch）
// ─────────────────────────────────────────────────────────────

/** 单个切换特效的参数（对应注入 JS 的 TD 表条目） */
interface TransitionDef {
    d: string;   // CSS transition 时长+缓动
    oi: string;  // 进入：初始 opacity
    ti: string;  // 进入：初始 transform
    fi: string;  // 进入：初始 filter
    of: string;  // 进入：最终 opacity
    tf: string;  // 进入：最终 transform
    ff: string;  // 进入：最终 filter
    xo: string;  // 退出：opacity
    xt: string;  // 退出：transform
    xf: string;  // 退出：filter
    rm: number;  // 退出元素移除延迟 ms
}

/**
 * 获取单个切换特效的参数定义（类比 getThemeCss）
 * 支持 10 种特效：zoom, fade, slide-left, slide-right,
 *               wipe-up, wipe-down, spiral, flip, blur, instant
 */
function getTransitionDef(name: string): TransitionDef {
    switch (name) {
        case 'fade':
            // 纯淡入淡出，无缩放
            return {
                d: '1s ease', oi: '0', ti: 'scale(1)', fi: 'blur(0px)',
                of: '1', tf: 'scale(1)', ff: 'blur(0px)',
                xo: '0', xt: 'scale(1)', xf: 'blur(0px)', rm: 1050
            };

        case 'slide-left':
            // 从右侧滑入，旧媒体向左退出
            return {
                d: '0.6s ease', oi: '1', ti: 'translateX(100%)', fi: 'blur(0px)',
                of: '1', tf: 'translateX(0)', ff: 'blur(0px)',
                xo: '0', xt: 'translateX(-30%)', xf: 'blur(0px)', rm: 700
            };

        case 'slide-right':
            // 从左侧滑入，旧媒体向右退出
            return {
                d: '0.6s ease', oi: '1', ti: 'translateX(-100%)', fi: 'blur(0px)',
                of: '1', tf: 'translateX(0)', ff: 'blur(0px)',
                xo: '0', xt: 'translateX(30%)', xf: 'blur(0px)', rm: 700
            };

        case 'wipe-up':
            // 从底部上滑进入，旧媒体向上退出
            return {
                d: '0.6s ease', oi: '1', ti: 'translateY(100%)', fi: 'blur(0px)',
                of: '1', tf: 'translateY(0)', ff: 'blur(0px)',
                xo: '0', xt: 'translateY(-30%)', xf: 'blur(0px)', rm: 700
            };

        case 'wipe-down':
            // 从顶部下滑进入，旧媒体向下退出
            return {
                d: '0.6s ease', oi: '1', ti: 'translateY(-100%)', fi: 'blur(0px)',
                of: '1', tf: 'translateY(0)', ff: 'blur(0px)',
                xo: '0', xt: 'translateY(30%)', xf: 'blur(0px)', rm: 700
            };

        case 'spiral':
            // 螺旋进入：缩小+旋转弹入，退出放大+反旋
            return {
                d: '0.9s cubic-bezier(0.34,1.56,0.64,1)',
                oi: '0', ti: 'scale(0.8) rotate(-12deg)', fi: 'blur(0px)',
                of: '1', tf: 'scale(1) rotate(0deg)', ff: 'blur(0px)',
                xo: '0', xt: 'scale(1.1) rotate(8deg)', xf: 'blur(0px)', rm: 1000
            };

        case 'flip':
            // 3D 水平翻转：从 -90° 翻入，退出向 +90° 翻出
            return {
                d: '0.5s ease-in-out', oi: '1', ti: 'perspective(1200px) rotateY(-90deg)', fi: 'blur(0px)',
                of: '1', tf: 'perspective(1200px) rotateY(0deg)', ff: 'blur(0px)',
                xo: '0', xt: 'perspective(1200px) rotateY(90deg)', xf: 'blur(0px)', rm: 600
            };

        case 'blur':
            // 模糊淡入：进入从模糊到清晰，退出从清晰到模糊
            return {
                d: '0.8s ease', oi: '0', ti: 'scale(1.02)', fi: 'blur(12px)',
                of: '1', tf: 'scale(1)', ff: 'blur(0px)',
                xo: '0', xt: 'scale(0.98)', xf: 'blur(12px)', rm: 900
            };

        case 'instant':
            // 瞬间切换，无动画
            return {
                d: '50ms', oi: '1', ti: 'scale(1)', fi: 'blur(0px)',
                of: '1', tf: 'scale(1)', ff: 'blur(0px)',
                xo: '0', xt: 'scale(1)', xf: 'blur(0px)', rm: 100
            };

        case 'zoom':
        default:
            // 缩放淡化（默认）：放大淡入，缩小淡出
            return {
                d: '1s ease', oi: '0', ti: 'scale(1.04)', fi: 'blur(0px)',
                of: '1', tf: 'scale(1)', ff: 'blur(0px)',
                xo: '0', xt: 'scale(0.96)', xf: 'blur(0px)', rm: 1050
            };
    }
}

/** 将所有已知特效序列化为注入 JS 中的 TD 对象字面量字符串 */
function buildTDTableJs(): string {
    const names = ['zoom', 'fade', 'slide-left', 'slide-right', 'wipe-up', 'wipe-down', 'spiral', 'flip', 'blur', 'instant'];
    const rows = names.map(name => {
        const d = getTransitionDef(name);
        return `'${name}':{d:'${d.d}',oi:'${d.oi}',ti:'${d.ti}',fi:'${d.fi}',of:'${d.of}',tf:'${d.tf}',ff:'${d.ff}',xo:'${d.xo}',xt:'${d.xt}',xf:'${d.xf}',rm:${d.rm}}`;
    });
    return `{\n${rows.join(',\n')}\n}`;
}

/**
 * 注入视频/图片背景切换逻辑
 * 切换特效由 getTransitionDef / buildTDTableJs 提供，支持 10 种效果。
 * transitions[i] 表示从 media[i] 切换到 media[(i+1)%n] 时的特效，
 * 包含最后一个媒体回到第一个的回环切换（长度 = videos.length）。
 */
function generateVideoPatch(config: PatchConfig): string {
    const mediaUrls = config.videos.map(v => normalizeVideoUrl(v));
    const transitions = config.transitions || [];
    const intervalMs = config.switchInterval * 1000;
    const tdTable = buildTDTableJs();

    const switchCode = intervalMs > 0 && mediaUrls.length > 1
        ? `setInterval(function(){play((idx+1)%media.length);},${intervalMs});`
        : '';

    // 跳转 IPC：轮询扩展目录下的 vscbg-jump.json，实现从管理面板立即切换背景
    let jumpCode = '';
    if (config.extensionPath) {
        let p = config.extensionPath.replace(/\\/g, '/').replace(/ /g, '%20');
        if (!/^\//.test(p)) { p = '/' + p; }
        const jumpFileUrl = `vscode-file://vscode-app${p}/vscbg-jump.json`;
        // 用短变量名减少注入代码体积；500ms 轮询，cache:'no-store' 防止浏览器缓存旧内容
        // 新增：时间戳新鲜度检查（Date.now()-d.ts<15000），防止重启后旧文件被误读取
        jumpCode = `var _vjTs=0;setInterval(function(){fetch(${JSON.stringify(jumpFileUrl)}+'?_='+Date.now(),{cache:'no-store'}).then(function(r){if(!r.ok)return null;return r.json();}).then(function(d){if(d&&typeof d.ts==='number'&&d.ts!==_vjTs&&Date.now()-d.ts<15000){_vjTs=d.ts;play((d.idx||0)%media.length);}}).catch(function(){});},500);`;
    }

    return `(function(){
var media=${JSON.stringify(mediaUrls)};
if(!media.length)return;
var transitions=${JSON.stringify(transitions)};
var idx=0;
var current=null;
var wrap=document.createElement('div');
wrap.id='vscbg-wrap';
wrap.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:-100;pointer-events:none;overflow:hidden;';
var TD=${tdTable};
function getTD(name){return TD[name]||TD['zoom'];}
function isImage(u){return/\\.(jpe?g|png|gif|webp|bmp|svg)(\\?|#|$)/i.test(u)||u.startsWith('data:image');}
function makeEl(u,td){
var el;
if(isImage(u)){el=document.createElement('img');el.src=u;}
else{el=document.createElement('video');el.src=u;el.muted=true;el.autoplay=true;el.loop=true;el.setAttribute('playsinline','');el.load();el.play().catch(function(){});}
el.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;';
el.style.transition='opacity '+td.d+',transform '+td.d+',filter '+td.d;
el.style.opacity=td.oi;el.style.transform=td.ti;el.style.filter=td.fi;
return el;
}
function play(i){
var slot=idx%media.length;
var tname=(transitions.length>slot)?transitions[slot]:'zoom';
var td=getTD(tname);
idx=i%media.length;
var el=makeEl(media[idx],td);
wrap.appendChild(el);
var raf=window.requestAnimationFrame||function(fn){setTimeout(fn,16);};
raf(function(){raf(function(){el.style.opacity=td.of;el.style.transform=td.tf;el.style.filter=td.ff;});});
if(current){var old=current;
old.style.transition='opacity '+td.d+',transform '+td.d+',filter '+td.d;
old.style.opacity=td.xo;old.style.transform=td.xt;old.style.filter=td.xf;
setTimeout(function(){if(old.parentNode)old.parentNode.removeChild(old);},td.rm);}
current=el;
}
function init(){
document.body.insertBefore(wrap,document.body.firstChild);
play(0);
${switchCode}
${jumpCode}
}
if(document.body){init();}
else{document.addEventListener('DOMContentLoaded',init);}
})();`;
}
