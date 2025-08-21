const { chromium } = require('playwright');
const fs = require('fs');

async function getAndSaveBingCookie() {
    console.log('🚀 Launching browser to fetch a fresh Bing cookie...');
    const browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();
    try {
        // 尝试多个 Bing 域名
        const bingUrls = [
            'https://www.bing.com',
            'https://cn.bing.com',
            'https://bing.com'
        ];

        let success = false;
        let currentUrl = '';

        for (const url of bingUrls) {
            try {
                console.log(`正在尝试访问 ${url}...`);
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                await page.waitForTimeout(3000); // 等待页面稳定

                const title = await page.title();
                console.log(`页面标题: ${title}`);

                if (title && title.includes('Bing')) {
                    success = true;
                    currentUrl = url;
                    console.log(`✅ 成功访问 ${url}`);
                    break;
                }
            } catch (e) {
                console.log(`访问 ${url} 失败: ${e.message}`);
            }
        }

        if (!success) {
            throw new Error('无法访问任何 Bing 网址');
        }

        // 关键步骤: 处理 Cookie 同意弹窗
        const acceptButtonSelectors = [
            '#bnp_btn_accept',
            '#onetrust-accept-btn-handler',
            '[aria-label="Accept"]',
            'button:has-text("Accept")'
        ];

        for (const selector of acceptButtonSelectors) {
            try {
                const button = await page.$(selector);
                if (button) {
                    await button.click();
                    console.log(`✅ 已点击同意按钮: ${selector}`);
                    await page.waitForTimeout(1000);
                    break;
                }
            } catch (e) {
                console.log(`尝试点击 ${selector} 失败: ${e.message}`);
            }
        }

        // 等待网络稳定，确保初始 Cookie 已设置
        await page.waitForLoadState('networkidle').catch(() => console.log('等待网络稳定超时，继续执行'));
        await page.waitForTimeout(2000);

        // 获取初始 Cookie
        let cookies = await context.cookies();
        console.log(`初始获取到 ${cookies.length} 个 cookies`);

        // 尝试通过直接访问搜索URL获取更多 Cookie
        console.log('直接访问搜索页面获取更多 Cookie...');
        const searchTerm = 'hello world';
        const searchUrl = currentUrl.includes('cn.bing.com') ?
            `https://cn.bing.com/search?q=${encodeURIComponent(searchTerm)}` :
            `https://www.bing.com/search?q=${encodeURIComponent(searchTerm)}`;

        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(5000); // 给页面足够时间加载

        // 获取最终 Cookie
        cookies = await context.cookies();
        console.log(`🍪 总共获取到 ${cookies.length} 个 cookies`);

        // 只保留指定的重要Cookie
        const importantCookieNames = [
            'MUID', 'MUIDB', '_EDGE_S', '_EDGE_V', 'SRCHD', 'SRCHUID', '_Rwho',
            '_SS', '_C_ETH', '_RwBf', 'SRCHUSR', 'SRCHHPGUSR'
        ];

        const importantCookies = cookies.filter(c => importantCookieNames.includes(c.name));
        console.log(`🔑 筛选出 ${importantCookies.length} 个重要 cookies`);
        console.log('重要Cookie名称:', importantCookies.map(c => c.name).join(', '));

        // 缺失的重要Cookie
        const missingCookies = importantCookieNames.filter(
            name => !importantCookies.some(c => c.name === name)
        );
        if (missingCookies.length > 0) {
            console.log(`⚠️ 缺少的重要Cookie: ${missingCookies.join(', ')}`);
        }

        const cookieString = importantCookies.map(c => `${c.name}=${c.value}`).join('; ');

        if (!cookieString || importantCookies.length < 2) {
            throw new Error(`未能获取足够的重要cookies。数量: ${importantCookies.length}`);
        }

        // 准备要存入 Gist 的最终 JSON 内容
        const output = {
            cookie: cookieString,
            timestamp: new Date().toISOString(),
            cookieCount: importantCookies.length,
            hasMuid: importantCookies.some(c => c.name === 'MUID'),
            source: searchUrl,
            cookies: importantCookies.map(c => ({ name: c.name, value: c.value }))
        };

        // 写入文件，供下一步使用
        fs.writeFileSync('bing_cookies.json', JSON.stringify(output, null, 2));
        console.log('✅ Cookie 数据已保存到 bing_cookies.json');

    } catch (error) {
        console.error('❌ 脚本执行过程中发生错误:', error);
        // 即使失败，也创建一个错误文件，以便调试
        fs.writeFileSync('bing_cookies.json', JSON.stringify({
            error: error.message,
            timestamp: new Date().toISOString(),
            source: 'error'
        }, null, 2));
        process.exit(1); // 失败退出
    } finally {
        await browser.close();
    }
}

// 执行函数
getAndSaveBingCookie().catch(error => {
    console.error('❌ Error executing the script:', error);
    process.exit(1);
});
