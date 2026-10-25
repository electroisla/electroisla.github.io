# Gestores de ventas — ElectroIsla 360

## Estado actual
Trabajo aislado en la rama GitHub `gestores-ventas-prueba` y en el proyecto Supabase de pruebas `ElectroIsla-Gestores-Pruebas` (ref `dllsojqfpyjyxgwzxpoa`, región US West). No se ha desplegado en Render/GitHub Pages, no se ha modificado `main`, ni se ha tocado la base de datos de producción.

## Reglas confirmadas
- El catálogo y los productos oficiales no se duplican en producción; la prueba usa una tabla de catálogo independiente que empieza vacía.
- Cada gestor tendrá un enlace único con identificador legible.
- El precio personalizado nunca puede ser inferior al precio oficial vigente.
- La comisión es un porcentaje general configurable por el administrador.
- El cálculo por línea es: margen = (precio del gestor - precio oficial) × cantidad; comisión = precio oficial × cantidad × porcentaje; ganancia asignada = margen + comisión.
- Cada pedido conserva instantáneas del precio oficial, precio de venta, margen, porcentaje y comisión.
- Los pedidos cancelados/reembolsados deben revertir o ajustar la ganancia; pagos al gestor se registran aparte.
- Cada gestor solo puede editar sus propios precios y ver sus propios pedidos/liquidaciones.
- Los pedidos normales de la tienda no deben atribuirse a un gestor por accidente.
- Se deben conservar checkout, inventario, zonas, métodos de pago, reportes y funciones actuales.

## Infraestructura de prueba ya aplicada
- Proyecto Supabase independiente creado con coste de creación calculado en $0/mes.
- Siete tablas aisladas: perfiles de gestor, ajustes/comisión, catálogo de prueba, precios por gestor, pedidos de gestor, líneas de pedido y libro de liquidaciones.
- RLS activada en las siete tablas; no se han creado perfiles, pedidos ni productos de prueba reales.
- Los roles de navegador no tienen permisos directos de escritura en tablas de pedidos o líneas.
- Funciones seguras de servidor/BD:
  - administración de catálogo de prueba, perfiles y comisión, restringida a `app_metadata.role = admin`;
  - cada gestor fija su precio propio, validado contra el precio oficial;
  - creación de pedidos desde IDs de productos y cantidades, con precios y comisión calculados en la BD;
  - actualización de estado del pedido/pago y reversión proporcional de ganancias por devolución, solo para administrador.
- Permisos verificados: las funciones solo pueden ejecutarse por usuarios autenticados, nunca por `anon`; las funciones administrativas validan además el rol protegido.
- Fórmula de ejemplo comprobada: precio oficial 100 USD, precio de venta 110 USD y comisión 5% = margen 10 USD, comisión 5 USD, ganancia asignada 15 USD por unidad.

## Lo que falta antes de una prueba integral
1. Crear/autorizar una cuenta de administrador de prueba con el rol protegido y una cuenta de gestor de prueba.
2. Insertar productos ficticios (no copiados de producción) en el catálogo de prueba.
3. Probar llamadas autenticadas de RPC, precio mínimo, múltiples cantidades, snapshots y reversión de ganancias.
4. Integrar el flujo con la tabla central `orders` solo después de definir una estrategia segura que no afecte pedidos normales ni producción.
5. Crear la interfaz de administración «Gestores de ventas» y el portal de gestor en una rama de prueba.
6. Verificar acceso entre gestores, suspensión, cambios futuros de precio/comisión, liquidaciones y pedidos normales sin atribución.

## Bloqueo de producción
La rama de prueba y la web oficial usaban el mismo proyecto Supabase; por eso el trabajo de base de datos se ha realizado únicamente en el nuevo proyecto independiente. No se han copiado datos reales ni se ha desplegado a producción.

## Criterios de aceptación
- Un producto oficial de 100 USD, vendido por el gestor a 110 USD con comisión del 5%, registra margen de 10 USD, comisión de 5 USD y ganancia asignada de 15 USD por unidad.
- El servidor rechaza precios inferiores al precio oficial, aunque el navegador sea manipulado.
- El precio oficial de la tienda no cambia al editar el precio del gestor.
- Los pedidos guardan instantáneas de precio y comisión.
- Los pedidos cancelados/reembolsados ajustan las ganancias sin duplicar reversos.
- Los pedidos directos de la tienda no quedan asignados accidentalmente a un gestor.
- Los informes separan monedas y no suman USD/CUP/EUR sin conversión explícita.
- No se modifica ni despliega a producción sin autorización expresa.

## Interfaz de prueba creada
- Se añadió `gestores.html`, un portal adaptable a móvil con inicio de sesión, recuperación de contraseña, enlace personal por gestor, catálogo de prueba, edición de precio, creación de pedidos ficticios, vista de pedidos y libro de liquidaciones.
- La misma página presenta paneles de administración solo cuando el usuario autenticado tiene `app_metadata.role = admin`: comisión general, alta de producto ficticio, creación de perfiles asociados a usuarios Auth ya existentes, estados de pedidos, devoluciones y registro de liquidaciones.
- Se añadió un enlace «Gestores de ventas · PRUEBA» a la navegación de `admin.html`, únicamente en la rama `gestores-ventas-prueba`.
- El JavaScript inline de `gestores.html` pasó una comprobación de sintaxis.
- No se han creado usuarios de Auth ni datos ficticios todavía; la interfaz requiere crear cuentas de prueba y asignar el rol protegido desde el panel de Supabase.

## Límites pendientes de integración
- Los pedidos creados en esta fase se guardan solo en `gestor_orders` y `gestor_order_items` del proyecto aislado. No se envían a `public.orders` de producción, no notifican clientes y no modifican inventario, pagos ni zonas.
- Falta una prueba funcional autenticada con un usuario administrador y uno gestor, incluyendo rechazo de precio inferior, pedidos, cancelación/reembolso, aislamiento entre cuentas y saldo de liquidación.
- La función de creación de pedidos no debe considerarse integración con el checkout oficial hasta que se diseñe y pruebe el puente seguro entre ambos sistemas.

## Publicación de prueba
- Se creó un sitio estático independiente en Render, vinculado a la rama `gestores-ventas-prueba`.
- Sitio: https://electroisla-gestores-prueba.onrender.com
- Portal: https://electroisla-gestores-prueba.onrender.com/gestores.html
- Despliegue inicial de Render: estado `live` para el commit `f4e8bae0138f2dc549b3c6eeae21b9aca3795aa7`.
- El portal `gestores.html` usa el proyecto Supabase de pruebas `dllsojqfpyjyxgwzxpoa`. No se debe usar `admin.html` en este nuevo host para validar gestores: ese archivo conserva la configuración de Supabase de la tienda y no forma parte del portal aislado.
- La interfaz aún no ha pasado una prueba funcional autenticada. El proyecto no contiene usuarios, perfiles, catálogo ni pedidos; para probarlo hay que crear cuentas ficticias y asignar el rol protegido de administrador en Authentication.
- El asesor de seguridad de Supabase sigue mostrando avisos genéricos sobre funciones `SECURITY DEFINER` ejecutables por usuarios autenticados. Las funciones incluyen comprobaciones internas de rol para acciones administrativas; aun así, la revisión funcional y de seguridad debe completarse antes de considerar el sistema listo.
