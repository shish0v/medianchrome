async function getMedian() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return null;
  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: computeMedianOnPage
    });
    return result;
  } catch (e) {
    console.error(e);
    return null;
  }
}

function computeMedianOnPage() {
  function computeMedian(arr) {
    if (!arr.length) return null;
    const sorted = arr.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  function parseTikTok() {
    const script = document.querySelector('#SIGI_STATE, #__NEXT_DATA__');
    if (!script) return null;
    try {
      const data = JSON.parse(script.textContent);
      const items = Object.values(data.ItemModule || {});
      const filtered = items.filter(item => !item.isTop);
      const likes = filtered.slice(0, 10).map(item => item.stats?.diggCount || 0);
      return computeMedian(likes);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  function parseInstagram() {
    const scripts = Array.from(document.querySelectorAll('script'));
    let jsonText = null;
    for (const s of scripts) {
      if (s.textContent.includes('edge_owner_to_timeline_media')) {
        jsonText = s.textContent;
        break;
      }
    }
    if (!jsonText) return null;
    try {
      const match = jsonText.match(/({.*})/);
      if (!match) return null;
      const data = JSON.parse(match[1]);
      const edges = data.entry_data?.ProfilePage?.[0]?.graphql?.user?.edge_owner_to_timeline_media?.edges;
      if (!edges) return null;
      const likes = [];
      for (const edge of edges) {
        if (!edge.node.is_pinned) {
          const count = edge.node.edge_liked_by?.count ?? edge.node.edge_media_preview_like?.count ?? 0;
          likes.push(count);
          if (likes.length >= 10) break;
        }
      }
      return computeMedian(likes);
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  if (location.host.includes('tiktok.com')) {
    return parseTikTok();
  }
  if (location.host.includes('instagram.com')) {
    return parseInstagram();
  }
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  const resultDiv = document.getElementById('result');
  const median = await getMedian();
  if (median !== null && median !== undefined) {
    resultDiv.textContent = 'Median: ' + median;
  } else {
    resultDiv.textContent = 'Cannot determine median';
  }
});
