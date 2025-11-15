/*
 * Service Worker para Caching Offline
 */

// v2 - Incrementamos a versão para forçar a atualização
const CACHE_NAME = 'birthday-cache-v2';

// Arquivos para fazer cache.
// Usamos caminhos relativos.
const PRECACHE_ASSETS = [
    './', // O index.html
    './manifest.json', // O novo arquivo de manifesto
    'https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css'
];

// Evento 'install': Salva os arquivos estáticos no Cache Storage.
self.addEventListener('install', (event) => {
    console.log('[SW] Evento de Instalação');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Fazendo pré-cache dos arquivos estáticos.');
                return cache.addAll(PRECACHE_ASSETS);
            })
            .then(() => {
                // Força o novo Service Worker a ativar imediatamente.
                return self.skipWaiting();
            })
    );
});

// Evento 'activate': Limpa caches antigos, se houver.
self.addEventListener('activate', (event) => {
    console.log('[SW] Evento de Ativação');
    // Remove caches antigos que não sejam o CACHE_NAME atual.
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Limpando cache antigo:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            // Assume o controle da página imediatamente.
            return self.clients.claim();
        })
    );
});

// Evento 'fetch': Intercepta requisições de rede.
// Estratégia: Cache-First (Tenta o cache, se falhar, vai para a rede).
self.addEventListener('fetch', (event) => {
    // Só aplica a estratégia para requisições GET
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // 1. Se encontrar no cache, retorna a resposta do cache.
                if (cachedResponse) {
                    return cachedResponse;
                }

                // 2. Se não, busca na rede.
                return fetch(event.request)
                    .then((networkResponse) => {
                        if (!networkResponse || networkResponse.status !== 200) {
                            return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    })
                    .catch((error) => {
                        console.error('[SW] Erro no Fetch:', error);
                    });
            })
    );
});