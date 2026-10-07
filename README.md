# ElectroIsla v9.8.0 — corrección de actualización de la app

Esta versión mantiene la tienda y la lógica de v9.7.2, pero cambia la estrategia de actualización de la PWA/TWA:

- `manifest.webmanifest` usa `start_url` con `?app_version=9.8.0` para que una nueva versión de la aplicación arranque en una URL nueva.
- El registro del service worker usa `sw.js?v=9.8.0`.
- El service worker usa una caché nueva y elimina las cachés anteriores al activarse.
- HTML y recursos principales se solicitan primero por red.
- Se mantienen el selector nuevo de zona, productos, Supabase, pagos y pedidos de la versión anterior.

## Importante

Para que el cambio de `start_url` llegue a la aplicación Android instalada, hay que generar una nueva versión del APK/TWA. Debe reutilizarse el mismo `signing.keystore` de ElectroIsla para que Android acepte la actualización como la misma aplicación.

No borrar los iconos existentes del repositorio si ya están presentes.
