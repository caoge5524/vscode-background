import { normalizeVideoUrl } from './vscodePath.js';

export interface PatchConfig {
    videos: string[];
    opacity: number;
    switchInterval: number; // 秒
    theme: 'glass' | 'matte';
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
 */
function generateThemePatch(theme: string, opacity: number): string {
    let css: string;

    if (theme === 'matte') {
        const bgAlpha = Math.max(0.4, (1 - opacity) * 0.6);
        css = [
            `.monaco-workbench{opacity:${opacity}!important;background:rgba(30,30,30,${bgAlpha})!important;backdrop-filter:blur(12px) saturate(180%);-webkit-backdrop-filter:blur(12px) saturate(180%)}`,
            `.monaco-workbench .part{background:rgba(40,40,40,0.3)!important;backdrop-filter:blur(8px)}`,
            `.monaco-workbench .editor-container{background:rgba(25,25,25,0.4)!important;backdrop-filter:blur(6px)}`,
            `body{background:transparent!important}`,
        ].join('');
    } else {
        // glass
        css = `.monaco-workbench{opacity:${opacity}!important}`;
    }

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

/**
 * 注入视频背景播放逻辑
 */
function generateVideoPatch(config: PatchConfig): string {
    const videoUrls = config.videos.map(v => normalizeVideoUrl(v));
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
