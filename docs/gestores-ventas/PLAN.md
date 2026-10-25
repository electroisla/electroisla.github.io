# Gestores de ventas — ElectroIsla 360

## Estado
Diseño en rama aislada `gestores-ventas-prueba`. No está integrado en `main`, no se ha desplegado y no se ha modificado la base de datos.

## Reglas confirmadas
- El catálogo, los productos y los pedidos siguen perteneciendo a la tienda oficial.
- Cada gestor tiene un enlace único con identificador legible.
- El precio personalizado solo puede ser igual o superior al precio oficial vigente al preparar el pedido.
- La comisión es un porcentaje general configurable por el administrador.
- El cálculo por línea es: margen = (precio del gestor - precio oficial) × cantidad; comisión = precio oficial × cantidad × porcentaje; ganancia asignada = margen + comisión.
- El pedido guarda instantáneas del precio oficial, precio vendido, margen, porcentaje y comisión para que los cambios futuros no alteren el historial.
- Los pedidos cancelados/reembolsados deben revertir o ajustar la ganancia pendiente; los pagos al gestor se registran aparte.
- El gestor solo puede editar sus precios y ver sus propios pedidos/liquidaciones. No puede acceder a datos de otros gestores.
- Los administradores actuales conservan todas las funciones existentes.

## Integración necesaria
1. Tablas protegidas para gestores, comisión general, precios por gestor y liquidaciones.
2. Autenticación individual para gestores; la identidad se vincula a una cuenta de Supabase Auth. No se guardan contraseñas en tablas propias.
3. Validación autoritativa de precio, producto, disponibilidad, comisión y cálculo de margen en el servidor/BD; nunca confiar en precios o comisiones enviados por el navegador.
4. Ampliar `orders` con los datos de atribución y las instantáneas de cálculo, sin cambiar el flujo de pedidos de clientes que llegan directamente a la tienda.
5. Añadir la sección «Gestores de ventas» al administrador y un portal de gestor independiente, con controles de acceso por rol.
6. El checkout sigue usando los métodos de pago, zonas de entrega y registro de pedidos existentes. Los totales de pago se recalculan en servidor respetando las reglas actuales de la tienda.
7. Informes separados por moneda cuando corresponda; no sumar ganancias en USD/CUP/EUR sin conversión explícita.
8. Pruebas de precio mínimo, precio oficial cambiado después, comisión cambiada después, gestor suspendido, cantidades múltiples, cancelación/reembolso, acceso entre gestores y pedidos normales.

## Bloqueo de seguridad antes de probar
La rama de prueba y la web oficial utilizan actualmente el mismo proyecto Supabase (`pdvfupvtofpzfllkjhhc`). Por ello no se deben ejecutar DDL, insertar gestores de prueba ni probar pedidos en ese proyecto. Hace falta un proyecto Supabase de prueba separado o una base local aislada antes de validar el flujo completo.

## Criterios de aceptación
- Un producto oficial de 100 USD, vendido por el enlace del gestor a 110 USD con comisión general del 5%, registra margen de 10 USD, comisión de 5 USD y ganancia asignada de 15 USD por unidad.
- No se acepta un precio personalizado inferior a 100 USD, aunque el navegador sea manipulado.
- El precio oficial de la tienda nunca cambia al editar el precio de un gestor.
- El pedido se registra en la tabla central de pedidos con gestor y cálculo desglosado.
- Los pedidos directos no quedan asignados accidentalmente a un gestor.
- La comisión y el precio aplicados a pedidos antiguos no cambian cuando se actualiza la configuración.
- No se modifica ni despliega a producción hasta autorización expresa.
