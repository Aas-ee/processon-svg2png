const { chromium } = require('playwright');
const fs = require('fs');
async function getAndSaveBingCookie() {
    console.log('🚀 Launching browser to fetch a fresh Bing cookie...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();
    try {
        await page.goto('https://www.bing.com', { waitUntil: 'domcontentloaded' });
        console.log('✅ Navigated to Bing.com');

        // 关键步骤: 处理 Cookie 同意弹窗
        const acceptButtonSelector = '#bnp_btn_accept';
        try {
            // 等待按钮出现，如果3秒内没出现就认为它不存在
            await page.waitForSelector(acceptButtonSelector, { timeout: 3000 });
            await page.click(acceptButtonSelector);
            console.log('✅ Cookie consent banner accepted.');
        } catch (error) {
            console.log('ℹ️ Cookie consent banner not found, continuing...');
        }

        // 等待网络稳定，确保初始 Cookie 已设置
        await page.waitForLoadState('networkidle');

        // 执行一次搜索来获取更完整的 Cookie
        console.log('Performing a search to get all necessary cookies...');
        await page.fill('input[name="q"]', 'hello world');
        await page.press('input[name="q"]', 'Enter');

        // 等待搜索结果页面加载
        await page.waitForSelector('.b_algo', { timeout: 10000 });
        console.log('✅ Search results loaded.');

        const cookies = await context.cookies();
        const cookieString = cookies.map(c => `${c.name}=${c.value}`).join('; ');

        if (!cookieString || cookies.length < 5) {
            throw new Error(`Failed to get a sufficient number of cookies. Found: ${cookies.length}`);
        }

        console.log(`🍪 Successfully fetched ${cookies.length} cookies.`);

        // 准备要存入 Gist 的最终 JSON 内容
        const output = {
            cookie: cookieString,
            // 保留一些有用的元数据
            timestamp: new Date().toISOString(),
            cookieCount: cookies.length,
            // 检查是否包含关键的 MUID cookie
            hasMuid: cookies.some(c => c.name === 'MUID'),
        };

        // 写入文件，供下一步使用
        fs.writeFileSync('bing_cookies.json', JSON.stringify(output, null, 2));
        console.log('✅ Cookie data saved to bing_cookies.json');

    } catch (error) {
        console.error('❌ An error occurred during the Playwright script execution:', error);
        // 即使失败，也创建一个错误文件，以便调试
        fs.writeFileSync('bing_cookies.json', JSON.stringify({ error: error.message, timestamp: new Date().toISOString() }, null, 2));
        process.exit(1); // 失败退出
    } finally {
        await browser.close();
    }
}
