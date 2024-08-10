// ==UserScript==
// @name         SVG2PNG
// @namespace    https://www.processon.com/
// @version      0.1
// @description  svg转png
// @author       Aasee
// @match        https://www.processon.com/diagraming/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=https://www.processon.com/
// @license      MIT
// @require      https://cdn.jsdelivr.net/npm/canvg@3.0.10/lib/umd.js
// @downloadURL https://update.greasyfork.org/scripts/503160/SVG2PNG.user.js
// @updateURL https://update.greasyfork.org/scripts/503160/SVG2PNG.meta.js
// @connect      cdn.jsdelivr.net
// ==/UserScript==

(function() {
    'use strict';


    // 确保 canvg 已加载
    if (typeof canvg === 'undefined') {
        console.error('canvg is not loaded');
        return;
    }

    // 创建可拖动按钮
    const button = document.createElement('button');
    button.textContent = '转换 SVG 为 PNG';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.width = '150px';  // 固定宽度
    button.style.height = '50px';   // 固定高度
    button.style.padding = '10px';
    button.style.backgroundColor = '#007bff';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '1000'; // 确保按钮位于其他内容之上

    // 拖动状态和位置偏移
    let offsetX, offsetY, startX, startY, isDragging = false;

    // 记录拖动状态和鼠标起始位置
    button.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startY = e.clientY;
        isDragging = false;
        offsetX = e.clientX - button.getBoundingClientRect().left;
        offsetY = e.clientY - button.getBoundingClientRect().top;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        // 阻止默认点击事件
        e.preventDefault();
    });

    function onMouseMove(e) {
        if (isDragging || Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
            isDragging = true;
            button.style.left = (e.clientX - offsetX) + 'px';
            button.style.top = (e.clientY - offsetY) + 'px';
        }
    }

    function onMouseUp(e) {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    // 按钮点击事件处理函数
    button.addEventListener('click', function() {
        if (isDragging) {
            // 如果正在拖动，则不触发点击事件
            return;
        }
        try {
            const divElement = document.querySelector('.water_perview');

            if (!divElement) {
                alert('No SVG element found.');
                return;
            }

            const svgContent = divElement.querySelector('svg').outerHTML;
            // 创建 Canvas
            const parser = new DOMParser();
            const svgDoc = parser.parseFromString(svgContent, 'image/svg+xml');
            const svgElement = svgDoc.documentElement;
            // 查找所有的 <text> 元素
            const textElements = svgDoc.querySelectorAll('text');

            // 打印所有 <text> 元素以帮助调试
            textElements.forEach((textElement, index) => {
                console.log(`Text element ${index}:`, textElement.textContent);
            });

            // 查找并删除指定内容的文字
            textElements.forEach(textElement => {
                if (textElement.textContent.includes('ProcessOn.com免费流程图')) {
                    // 删除文字内容
                    textElement.textContent = '';
                }
            });
            // 获取修改后的 SVG 字符串
            const modifiedSvgString = new XMLSerializer().serializeToString(svgDoc.documentElement);
            const canvas = document.createElement('canvas');
            let width = svgElement.getAttribute('width');
            canvas.width = width;
            let height = svgElement.getAttribute('height');
            canvas.height = height;
            console.log(width)
            console.log(height)
            const ctx = canvas.getContext('2d');

            // 使用 canvg 将 SVG 渲染到 Canvas
            canvg.Canvg.fromString(ctx, modifiedSvgString).start();

            // 将 Canvas 导出为 PNG 图像
            const pngData = canvas.toDataURL('image/png');

            // 创建一个下载链接
            const link = document.createElement('a');
            link.href = pngData;
            link.download = 'image.png';
            link.click();


        } catch (error) {
            console.error('Error converting SVG to PNG:', error);
            alert('An error occurred while converting SVG to PNG.');
        }
    });

    // 将按钮添加到页面
    document.body.appendChild(button);
})();
