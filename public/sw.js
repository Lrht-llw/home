// 卸载旧的 PWA Service Worker，并清除其缓存
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // 清除所有缓存
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      // 注销自身
      await self.registration.unregister();
      // 刷新所有受控页面，避免继续显示旧内容
      const clients = await self.clients.matchAll();
      clients.forEach((client) => client.navigate(client.url));
    })()
  );
});
