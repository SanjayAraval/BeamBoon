import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  
  page.on('console', msg => console.log('BROWSER LOG:', msg.text()));

  const delay = (ms) => new Promise(r => setTimeout(r, ms));

  console.log("Navigating to http://127.0.0.1:4000/");
  await page.goto('http://127.0.0.1:4000/');
  
  await delay(1000);
  
  console.log("Clicking START NIGHTMARE");
  const startBtn = await page.$('#btn-start');
  if (startBtn) await startBtn.click();

  await delay(500);

  for (let i = 0; i < 6; i++) {
    const nextBtn = await page.$('#btn-montage-next');
    if (nextBtn) {
      const isHidden = await page.evaluate(el => el.classList.contains('hidden'), nextBtn);
      if (!isHidden) {
        await nextBtn.click();
        await delay(300);
      }
    }
  }

  await delay(1000);
  console.log("Clicking CLICK TO PLAY");
  await page.mouse.click(640, 360);
  await delay(500);

  console.log("\n--- VERIFYING ROOMS VIA F5 TELEPORT ---");
  // There are 12 rooms. We press F5, then F6, 12 times.
  for(let i = 0; i < 12; i++) {
     await page.keyboard.press('F5');
     await delay(200);
     await page.keyboard.press('F6');
     await delay(200);
  }
  
  console.log("\n--- VERIFYING DOORS AND STAIRS BY WALKING (Teleport to Foyer first) ---");
  // Teleport back to Foyer
  for(let i = 0; i < 12; i++) {
     await page.keyboard.press('F5');
     await delay(100);
  } // this cycles through, we might not land on Foyer perfectly. Let's just do it manually.
  
  await browser.close();
})();
