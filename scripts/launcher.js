(function () {
  'use strict';
  var BASE = 'https://raw.githubusercontent.com/ExpectR/masa-karti-temalari/main/';
  var APP_ID = 'masa-karti-atolyesi', PROTOCOL = 1, MAX_BYTES = 8 * 1024 * 1024;
  var KEY = 'umutcan.app.current.v1', PREVIOUS = 'umutcan.app.previous.v1';
  var BACKUP = 'umutcan.app.settings-backup.v1';
  var bundled = JSON.parse(document.getElementById('umutcan-bundled-app').textContent);
  var running = null, timer = null, busy = false, ready = false, notice = '', recoveries = 0;
  var versionPattern = /^\d{1,6}\.\d{1,6}\.\d{1,6}$/;
  function read(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
  function write(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function remove(key) { try { localStorage.removeItem(key); } catch (e) {} }
  function newer(a, b) {
    var x = a.split('.').map(Number), y = b.split('.').map(Number);
    for (var i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  }
  function status(message) {
    var el = document.getElementById('appUpdateStatus');
    if (el) el.textContent = message;
  }
  function button() {
    var el = document.getElementById('appUpdate');
    if (el) { el.disabled = busy; el.textContent = busy ? '⟳ Güncelleniyor…' : '↻ Update'; }
  }
  function checkHTML(record) {
    if (!record || record.appId !== APP_ID || record.launcherProtocol !== PROTOCOL ||
        !versionPattern.test(record.version) || typeof record.html !== 'string' ||
        record.html.length > MAX_BYTES || !/^[0-9a-f]{64}$/.test(record.sha256)) throw new Error('Güncelleme paketi geçersiz.');
    var doc = new DOMParser().parseFromString(record.html, 'text/html');
    var id = doc.querySelector('meta[name="umutcan-app-id"]');
    var version = doc.querySelector('meta[name="umutcan-app-version"]');
    var protocol = doc.querySelector('meta[name="umutcan-launcher-protocol"]');
    if (!id || id.content !== APP_ID || !version || version.content !== record.version ||
        !protocol || protocol.content !== String(PROTOCOL)) throw new Error('Sürüm bilgisi paketle eşleşmiyor.');
  }
  async function verify(record) {
    checkHTML(record);
    if (!window.crypto || !crypto.subtle) throw new Error('Bu tarayıcı güncelleme doğrulamasını desteklemiyor.');
    var bytes = new TextEncoder().encode(record.html);
    if (bytes.byteLength !== record.size || bytes.byteLength > MAX_BYTES) throw new Error('Güncelleme eksik indirildi.');
    var digest = await crypto.subtle.digest('SHA-256', bytes);
    var hex = Array.from(new Uint8Array(digest)).map(function (v) { return v.toString(16).padStart(2, '0'); }).join('');
    if (hex !== record.sha256) throw new Error('Güncelleme doğrulanamadı; mevcut sürüm korunuyor.');
    return record;
  }
  function settings() {
    var data = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('mk3') === 0) data[key] = localStorage.getItem(key);
    }
    return data;
  }
  function restoreSettings() {
    var backup = read(BACKUP);
    if (!backup || !backup.settings || typeof backup.settings !== 'object') return;
    var keys = [];
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (key && key.indexOf('mk3') === 0) keys.push(key);
    }
    keys.forEach(function (key) { if (!Object.prototype.hasOwnProperty.call(backup.settings, key)) localStorage.removeItem(key); });
    Object.keys(backup.settings).forEach(function (key) {
      if (key.indexOf('mk3') === 0 && typeof backup.settings[key] === 'string') localStorage.setItem(key, backup.settings[key]);
    });
  }
  function show(record) {
    clearTimeout(timer); ready = false; busy = false; running = record;
    timer = setTimeout(rollback, 8000);
    document.open(); document.write(record.html); document.close();
  }
  async function rollback() {
    if (ready) return;
    clearTimeout(timer);
    if (++recoveries > 1) {
      document.body.textContent = 'Uygulama başlatılamadı. Dosyayı kapatıp yeniden açın.';
      return;
    }
    var target = read(PREVIOUS);
    try { if (!target || target.version === running.version) throw new Error(); await verify(target); }
    catch (e) { target = bundled; }
    var wasPending = running && running.pending;
    remove(KEY);
    if (wasPending) { try { restoreSettings(); } catch (e) {} }
    remove(BACKUP);
    target = Object.assign({}, target, { pending: false });
    if (target.version !== bundled.version) { try { write(KEY, target); } catch (e) {} }
    notice = 'Yeni sürüm açılamadı. Önceki çalışan sürüme dönüldü; ayarların korundu.';
    show(target);
  }
  async function download(url, limit) {
    var controller = new AbortController(), timeout = setTimeout(function () { controller.abort(); }, 20000);
    try {
      var response = await fetch(url, { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error('Güncelleme alınamadı (' + response.status + ').');
      var length = Number(response.headers.get('Content-Length'));
      if (length > limit) throw new Error('Güncelleme paketi çok büyük.');
      var bytes = await response.arrayBuffer();
      if (bytes.byteLength > limit) throw new Error('Güncelleme paketi çok büyük.');
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } finally { clearTimeout(timeout); }
  }
  async function update() {
    if (busy || !ready) return;
    busy = true; button(); status('Yeni sürüm kontrol ediliyor…');
    try {
      var manifest = JSON.parse(await download(BASE + 'app-update.json?check=' + Date.now(), 12000));
      if (!manifest || manifest.schemaVersion !== 1 || manifest.appId !== APP_ID || manifest.launcherProtocol !== PROTOCOL ||
          !versionPattern.test(manifest.version) || manifest.file !== 'releases/umutcan-' + manifest.version + '.html' ||
          !/^[0-9a-f]{64}$/.test(manifest.sha256) || !Number.isSafeInteger(manifest.size) || manifest.size < 1 || manifest.size > MAX_BYTES)
        throw new Error('Güncelleme bilgisi geçersiz.');
      if (!newer(manifest.version, running.version)) { status('Zaten güncelsin · v' + running.version); return; }
      status('v' + manifest.version + ' indiriliyor…');
      var html = await download(BASE + manifest.file, MAX_BYTES);
      var next = { appId: APP_ID, launcherProtocol: PROTOCOL, version: manifest.version, html: html,
        size: manifest.size, sha256: manifest.sha256, pending: true, installedAt: new Date().toISOString() };
      await verify(next);
      if (typeof window.render === 'function') window.render();
      var old = [KEY, PREVIOUS, BACKUP].map(function (key) { return localStorage.getItem(key); });
      try {
        write(BACKUP, { settings: settings() });
        write(PREVIOUS, Object.assign({}, running, { pending: false }));
        write(KEY, next);
      } catch (e) {
        [KEY, PREVIOUS, BACKUP].forEach(function (key, i) {
          try { if (old[i] === null) localStorage.removeItem(key); else localStorage.setItem(key, old[i]); } catch (ignore) {}
        });
        throw new Error('Yeni sürüm tarayıcıya kaydedilemedi. Depolama alanını kontrol et; mevcut sürüm devam ediyor.');
      }
      status('Güncelleme hazır, uygulama yeniden açılıyor…');
      window.location.reload();
    } catch (e) {
      status(e.name === 'AbortError' ? 'Bağlantı zaman aşımına uğradı. Update ile yeniden dene.' :
        e instanceof TypeError ? 'Bağlantı kurulamadı. İnternetini kontrol edip Update ile yeniden dene.' : e.message);
    } finally { busy = false; button(); }
  }
  window.UmutShell = {
    protocol: PROTOCOL,
    update: update,
    watch: function () { clearTimeout(timer); timer = setTimeout(rollback, 8000); },
    ready: function (version) {
      if (!running || version !== running.version) return;
      clearTimeout(timer); ready = true;
      var pending = running.pending;
      if (pending) {
        running.pending = false;
        try { write(KEY, running); remove(BACKUP); } catch (e) {}
        notice = 'v' + running.version + ' sürümüne güncellendi. Ayarların korundu.';
      }
      var el = document.getElementById('appUpdate');
      if (el) el.onclick = update;
      var label = document.getElementById('appVersion');
      if (label) label.textContent = 'v' + running.version;
      button(); status(notice || 'Program güncellemelerini buradan alabilirsin.');
    }
  };
  async function boot() {
    var cached = read(KEY);
    if (cached && !newer(bundled.version, cached.version || '0.0.0')) {
      try { await verify(cached); show(cached); return; }
      catch (e) { remove(KEY); notice = 'Kayıtlı güncelleme okunamadı; dosyadaki çalışan sürüm açıldı.'; }
    }
    show(bundled);
  }
  function start(){boot().catch(function(){show(bundled)})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
