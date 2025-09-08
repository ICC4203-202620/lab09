export function installMapsAuthListener(onAuthFail) {
  // Se dispara cuando hay fallo de autenticación de Maps (key/referrer/billing)
  window.gm_authFailure = function () {
    onAuthFail?.({
      kind: 'AUTH',
      code: 'gm_authFailure',
      message: 'Authentication failed (key/referrer/billing).',
    });
  };
}

export function watchScriptTagErrors(onErr) {
  window.addEventListener(
    'error',
    (ev) => {
      const t = ev?.target;
      if (t && t.tagName === 'SCRIPT' && /maps\.googleapis\.com\/maps\/api\/js/.test(t.src)) {
        onErr?.({
          kind: 'SCRIPT',
          code: 'SCRIPT_LOAD_ERROR',
          message: 'Maps JS script failed to load',
          src: t.src,
        });
      }
    },
    true
  );
}

export async function preflightMapsLibraries() {
  if (!window.google?.maps?.importLibrary) {
    return { ok: false, kind: 'LOAD', code: 'NO_IMPORTLIB', message: 'importLibrary not available' };
  }

  const core = await window.google.maps.importLibrary('core');
  const { MapsNetworkError, MapsRequestError, MapsServerError } = core;

  try {
    await window.google.maps.importLibrary('marker');
    return { ok: true };
  } catch (err) {
    let kind = 'UNKNOWN', code = 'UNKNOWN';
    if (err instanceof window.google.maps.MapsNetworkError) {
      kind = 'NETWORK'; code = err.code || 'NETWORK';
    } else if (err instanceof window.google.maps.MapsRequestError) {
      kind = 'REQUEST'; code = err.code || 'REQUEST';
    } else if (err instanceof window.google.maps.MapsServerError) {
      kind = 'SERVER'; code = err.code || 'SERVER';
    }
    return { ok: false, kind, code, message: String(err?.message || err) };
  }
}
