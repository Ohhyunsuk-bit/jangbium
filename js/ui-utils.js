// 공용 DOM 도우미. app.js와 recall-app.js가 함께 쓴다.
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2200);
}

export async function share({ title, url }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text: title, url });
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('링크를 복사했습니다');
  } catch {
    toast('주소창의 링크를 복사해 주세요');
  }
}

export async function copyText(text, successMsg = '복사했습니다') {
  try {
    await navigator.clipboard.writeText(text);
    toast(successMsg);
  } catch {
    toast('복사에 실패했습니다. 직접 선택해 복사해 주세요.');
  }
}
