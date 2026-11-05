// Shared by the permanent launcher and the runtime for existing launcher copies.
(function () {
  'use strict';
  if (window.UmutUpdateTransport && window.UmutUpdateTransport.protocol === 1 &&
      window.fetch === window.UmutUpdateTransport.fetch) return;
  var nativeFetch = window.fetch.bind(window);
  var API = 'https://api.github.com/repos/ExpectR/masa-karti-temalari/contents/';
  var RAW = 'https://raw.githubusercontent.com/ExpectR/masa-karti-temalari/main/';
  var state = { protocol: 1, source: '', checkedAt: 0, fetch: null };
  var versionPattern = /^\d{1,6}\.\d{1,6}\.\d{1,6}$/;
  function newer(a, b) {
    if (!versionPattern.test(a) || !versionPattern.test(b)) return false;
    var x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  }
  function status(text) { var el = document.getElementById('appUpdateStatus'); if (el) el.textContent = text; }
  async function resource(url, limit, options, api) {
    var controller = new AbortController(), parent = options && options.signal;
    var abort = function () { controller.abort(); };
    var timer = setTimeout(abort, 18000);
    if (parent) { if (parent.aborted) abort(); else parent.addEventListener('abort', abort, { once: true }); }
    try {
      var response = await nativeFetch(url, {
        method: 'GET', cache: 'no-store', credentials: 'omit', signal: controller.signal,
        headers: { Accept: api ? 'application/vnd.github.raw+json' : '*/*' }
      });
      if (!response.ok) {
        var error = new Error('Güncelleme kaynağına ulaşılamadı (' + response.status + ').');
        error.status = response.status; throw error;
      }
      if (Number(response.headers.get('Content-Length')) > limit) throw new Error('Güncelleme paketi çok büyük.');
      var bytes = await response.arrayBuffer();
      if (bytes.byteLength > limit) throw new Error('Güncelleme paketi çok büyük.');
      return new Response(bytes, { status: 200, headers: { 'Content-Type': api ? 'application/octet-stream' : 'text/plain', 'Content-Length': String(bytes.byteLength) } });
    } finally {
      clearTimeout(timer); if (parent) parent.removeEventListener('abort', abort);
    }
  }
  async function updateFile(path, options) {
    var manifest = path === 'app-update.json', limit = manifest ? 12000 : 8 * 1024 * 1024;
    // The unique API URL avoids the five-minute raw main-branch cache.
    var nonce = Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    if (manifest) status('Depodaki son sürüm doğrudan kontrol ediliyor…');
    try {
      var direct = await resource(API + path + '?ref=main&check=' + nonce, limit, options, true);
      state.source = 'github-api'; state.checkedAt = Date.now(); return direct;
    } catch (primaryError) {
      if (options && options.signal && options.signal.aborted) throw primaryError;
      if (manifest) status('Doğrudan bağlantı kurulamadı; yedek kaynak deneniyor…');
      var fallback;
      try { fallback = await resource(RAW + path + '?check=' + nonce, limit, options, false); }
      catch (fallbackError) {
        throw new Error(primaryError.status === 403 || primaryError.status === 429 ?
          'GitHub kontrol sınırına ulaşıldı. Mevcut sürüm korunuyor; biraz sonra yeniden dene.' :
          'Güncelleme kontrol edilemedi. Mevcut sürüm korunuyor; bağlantını kontrol edip yeniden dene.');
      }
      // A stale fallback must never report the current version as freshly verified.
      if (manifest) {
        var data; try { data = await fallback.clone().json(); } catch (e) { throw new Error('Yedek güncelleme bilgisi okunamadı.'); }
        var meta = document.querySelector('meta[name="umutcan-app-version"]');
        if (!meta || !data || !newer(data.version, meta.content)) {
          throw new Error(primaryError.status === 403 || primaryError.status === 429 ?
            'GitHub kontrol sınırına ulaşıldı. En yeni sürüm doğrulanamadı; biraz sonra yeniden dene.' :
            'En yeni sürüm doğrudan doğrulanamadı. Yedek kaynak gecikmeli olabilir; yeniden dene.');
        }
      }
      state.source = 'raw-fallback'; state.checkedAt = Date.now(); return fallback;
    }
  }
  state.fetch = function (input, options) {
    var url; try { url = new URL(typeof input === 'string' || input instanceof URL ? String(input) : input.url); }
    catch (e) { return nativeFetch(input, options); }
    var method = (options && options.method) || (input && input.method) || 'GET';
    if (method.toUpperCase() === 'GET' && url.origin === 'https://raw.githubusercontent.com' &&
        url.pathname.indexOf('/ExpectR/masa-karti-temalari/main/') === 0) {
      var path = url.pathname.slice('/ExpectR/masa-karti-temalari/main/'.length);
      if (path === 'app-update.json' || /^releases\/umutcan-\d{1,6}\.\d{1,6}\.\d{1,6}\.html$/.test(path)) {
        return updateFile(path, options || (typeof Request !== 'undefined' && input instanceof Request ? { signal: input.signal } : {}));
      }
    }
    return nativeFetch(input, options);
  };
  window.UmutUpdateTransport = state;
  window.fetch = state.fetch;
})();
