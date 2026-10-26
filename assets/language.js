(() => {
  const key = 'repuchat-site-language';
  const params = new URLSearchParams(location.search);
  const requested = params.get('lang');
  const browserLanguage = (navigator.language || 'en').toLowerCase().startsWith('ru') ? 'ru' : 'en';
  let language = requested === 'ru' || requested === 'en' ? requested : null;

  try {
    if (language) localStorage.setItem(key, language);
    else language = localStorage.getItem(key);
  } catch (_) {}

  if (language !== 'ru' && language !== 'en') language = browserLanguage;
  window.REP_SITE_LANG = language;
  document.documentElement.lang = document.documentElement.dataset.languageFixed || language;

  // Carry the active language between the site's HTML pages as a fallback when
  // browser storage is unavailable (for example, some local file previews).
  for (const link of document.querySelectorAll('a[href]')) {
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin || url.searchParams.has('lang')) continue;
      if (url.pathname.split('/').includes('app')) continue;
      url.searchParams.set('lang', language);
      link.href = `${url.pathname}${url.search}${url.hash}`;
    } catch (_) {}
  }
})();
