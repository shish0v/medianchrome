async function fetchMedian() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const resultEl = document.getElementById('result');

  if (!tab) {
    resultEl.textContent = 'No tab';
    return;
  }

  let url;
  try {
    url = new URL(tab.url);
  } catch (e) {
    resultEl.textContent = 'Invalid URL';
    return;
  }

  if (!/tiktok\.com|instagram\.com/.test(url.hostname)) {
    resultEl.textContent = 'Open a profile on TikTok or Instagram';
    return;
  }

  const code = () => {
    const parseNum = (str) => {
      str = str.replace(/,/g, '').toLowerCase();
      if (str.endsWith('k')) return parseFloat(str) * 1000;
      if (str.endsWith('m')) return parseFloat(str) * 1000000;
      const n = parseInt(str, 10);
      return isNaN(n) ? null : n;
    };

    const getTikTok = () => {
      const items = document.querySelectorAll('[data-e2e="user-post-item"]');
      const views = [];
      for (const item of items) {
        if (item.querySelector('[data-e2e="user-post-item-pin"]')) continue;
        const viewEl = item.querySelector('[data-e2e="video-views"]');
        if (viewEl) {
          const n = parseNum(viewEl.innerText.trim());
          if (n !== null) views.push(n);
        }
        if (views.length >= 10) break;
      }
      return views;
    };

    const getInstagram = () => {
      const anchors = document.querySelectorAll('article a[href*="/p/"]');
      const views = [];
      for (const a of anchors) {
        if (/pinned/i.test(a.innerText)) continue;
        const span = a.querySelector('span');
        if (span && /[0-9]/.test(span.textContent)) {
          const n = parseNum(span.textContent.trim());
          if (n !== null) views.push(n);
        }
        if (views.length >= 10) break;
      }
      return views;
    };

    let views = [];
    if (location.hostname.includes('tiktok.com')) {
      views = getTikTok();
    } else if (location.hostname.includes('instagram.com')) {
      views = getInstagram();
    }
    return views;
  };

  chrome.scripting.executeScript({ target: { tabId: tab.id }, func: code }, (res) => {
    if (chrome.runtime.lastError || !res || !res[0]) {
      resultEl.textContent = 'Error';
      return;
    }
    const views = res[0].result || [];
    if (!views.length) {
      resultEl.textContent = 'No data';
      return;
    }
    views.sort((a, b) => a - b);
    const mid = Math.floor(views.length / 2);
    const median = views.length % 2 ? views[mid] : (views[mid - 1] + views[mid]) / 2;
    resultEl.textContent = median.toLocaleString();
  });
}

document.addEventListener('DOMContentLoaded', fetchMedian);
