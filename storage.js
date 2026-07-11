// Remplace window.storage (fourni par Claude dans un artefact) par une version
// qui utilise le localStorage du navigateur, pour que l'appli fonctionne seule,
// hébergée sur son propre site.
//
// Limite : ce stockage reste propre à cet appareil et à ce navigateur (il n'est
// pas synchronisé entre le téléphone et l'ordinateur). Utilisez le bouton
// « Sauvegarde & export » dans l'appli pour faire des copies de sécurité.

function nsKey(key, shared) {
  return `nid:${shared ? "shared" : "local"}:${key}`;
}

window.storage = {
  async get(key, shared = false) {
    const raw = localStorage.getItem(nsKey(key, shared));
    if (raw === null) throw new Error("not found");
    return { key, value: raw, shared };
  },

  async set(key, value, shared = false) {
    localStorage.setItem(nsKey(key, shared), value);
    return { key, value, shared };
  },

  async delete(key, shared = false) {
    localStorage.removeItem(nsKey(key, shared));
    return { key, deleted: true, shared };
  },

  async list(prefix = "", shared = false) {
    const fullPrefix = nsKey(prefix, shared);
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(fullPrefix)) {
        keys.push(k.slice(`nid:${shared ? "shared" : "local"}:`.length));
      }
    }
    return { keys, prefix, shared };
  },
};
