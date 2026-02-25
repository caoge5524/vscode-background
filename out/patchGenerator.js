"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePatch = generatePatch;
const vscodePath_js_1 = require("./vscodePath.js");
/**
 * 生成注入到 workbench.desktop.main.js 的完整补丁代码
 */
function generatePatch(config) {
    const parts = [];
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
function generateChecksumsPatch() {
    // 检测"损坏"通知的多语言关键字
    const corruptKeywords = [
        'corrupt', // English
        '损坏', '安装', '似乎', // Chinese
        'インストール', // Japanese
        'beschädigt', // German
        'corrompue', // French
        'dañada', // Spanish
        '손상', // Korean
        'corrompida', // Portuguese
        'danneggiata', // Italian
        'повреждена', // Russian
        'uszkodzona', // Polish
        'bozuk', // Turkish
        '損毀', // Traditional Chinese
        'sérült', // Hungarian
        'poškozená', // Czech
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
function generateThemePatch(theme, opacity) {
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
function getThemeCss(theme, opacity) {
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
/**
 * 注入视频背景播放逻辑
 */
function generateVideoPatch(config) {
    const videoUrls = config.videos.map(v => (0, vscodePath_js_1.normalizeVideoUrl)(v));
    const intervalMs = config.switchInterval * 1000;
    // 生成精简的 JS 代码
    return `(function(){
var videos=${JSON.stringify(videoUrls)};
if(!videos.length)return;
var idx=0;
var v=document.createElement('video');
v.id='vscbg-video';
v.muted=true;
v.autoplay=true;
v.loop=true;
v.setAttribute('playsinline','');
v.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;object-fit:cover;object-position:center;z-index:-100;pointer-events:none;';
function play(i){
idx=i%videos.length;
v.src=videos[idx];
v.load();
v.play().catch(function(){});
}
function init(){
document.body.insertBefore(v,document.body.firstChild);
play(0);
${intervalMs > 0 && videoUrls.length > 1
        ? `setInterval(function(){play(idx+1);},${intervalMs});`
        : ''}
}
if(document.body){init();}
else{document.addEventListener('DOMContentLoaded',init);}
})();`;
}
//# sourceMappingURL=patchGenerator.js.map