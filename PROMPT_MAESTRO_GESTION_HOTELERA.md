# Prompt maestro replicable para una aplicación de gestión hotelera

## Propósito del documento

Este archivo reúne los requisitos funcionales y reglas de negocio definidos para la aplicación interna de gestión de habitaciones del Hotel ASAEL. También puede utilizarse como prompt maestro para diseñar o reconstruir un sistema equivalente en otro hotel.

Los valores escritos entre corchetes, como `[NOMBRE_DEL_HOTEL]`, son variables que deben adaptarse en una nueva implementación.

---

# Prompt maestro

## Rol y objetivo

Actúa como arquitecto de producto, analista de negocio, diseñador UX/UI y desarrollador full-stack. Diseña y construye una aplicación web interna, adaptable a computadora, tablet y celular, destinada a administrar habitaciones, huéspedes, estadías, inventarios, inspecciones, documentos, evidencias, limpieza, mantenimiento y personal de un hotel.

La aplicación se llamará `[NOMBRE_DEL_HOTEL] · Gestión hotelera`.

No desarrolles todavía el módulo de pagos. Prepara las relaciones necesarias para añadir posteriormente cargos, garantías, cuotas, daños cobrables y saldos, pero mantén esta primera etapa enfocada en el control operativo y documental.

El sistema será utilizado solamente por trabajadores del hotel. Los huéspedes no tendrán cuentas ni acceso a la aplicación. Las firmas se realizarán en papel después de imprimir las actas. Luego, el personal tomará una fotografía o escaneará el documento firmado y lo guardará como evidencia.

## Principios obligatorios

1. No eliminar registros que tengan valor histórico. Utilizar desactivación, anulación, corrección auditada o archivado.
2. Toda operación sensible debe registrar usuario, fecha, hora y motivo.
3. Los documentos y fotografías deben almacenarse en almacenamiento persistente para archivos; sus metadatos deben guardarse en una base de datos estructurada.
4. Los permisos deben validarse también en el servidor, no solamente ocultando botones en la interfaz.
5. Ninguna cuenta desconocida debe recibir acceso automáticamente.
6. Cada trabajador debe utilizar una cuenta individual.
7. Diseñar primero el flujo real del hotel y evitar funciones genéricas que no aporten a la operación.

---

## 1. Configuración del hotel

La estructura del hotel debe ser completamente configurable.

### Pisos

Permitir:

- Crear pisos.
- Cambiar su nombre.
- Modificar su orden o posición.
- Activarlos y desactivarlos.
- Consultar pisos inactivos desde administración.

Un piso con habitaciones o historial no debe eliminarse físicamente. Debe desactivarse.

No permitir desactivar un piso mientras contenga habitaciones activas. El administrador deberá moverlas o desactivarlas primero.

### Habitaciones

Permitir:

- Crear habitaciones.
- Editar número o nombre.
- Editar piso asignado.
- Editar tipo, capacidad y observaciones.
- Cambiar una habitación de piso cuando no esté ocupada.
- Activar o desactivar habitaciones.
- Consultar su historial completo.

El número o nombre de habitación debe ser único dentro del hotel.

Una habitación con estadías, actas o documentos no se elimina; se desactiva. Una habitación ocupada no puede cambiarse de piso ni desactivarse.

Al crear una habitación, ofrecer tres opciones:

1. Aplicar inventario base.
2. Copiar inventario desde otra habitación.
3. Comenzar sin inventario.

### Configuración inicial de referencia

- Hotel: `[NOMBRE_DEL_HOTEL]`.
- Cantidad inicial de pisos: `[CANTIDAD_DE_PISOS]`.
- Cantidad inicial de habitaciones: `[CANTIDAD_DE_HABITACIONES]`.
- Numeración inicial: `[RANGO_O_FORMATO]`.

Para Hotel ASAEL, la referencia inicial es de 3 pisos y 24 habitaciones numeradas del 1 al 24. Estos valores no deben quedar programados de forma rígida.

---

## 2. Estados de habitación

Implementar como mínimo:

- Disponible.
- Ingreso en proceso.
- Ocupada.
- Salida en revisión.
- Pendiente de limpieza.
- Limpieza realizada.
- Pendiente de inspección final.
- Mantenimiento.
- Fuera de servicio.
- Inactiva.

Flujo normal de salida:

```text
Ocupada
→ Salida en revisión
→ Pendiente de limpieza
→ Limpieza realizada
→ Inspección final
→ Disponible
```

La habitación no debe quedar disponible inmediatamente después de la salida del huésped.

---

## 3. Roles y trabajadores

### Roles

#### Propietario

- Acceso completo.
- Administración de usuarios y permisos.
- Configuración del hotel.
- Aprobación de excepciones.
- Consulta de auditoría e historial.

#### Administrador

- Gestión operativa completa.
- Configuración de pisos, habitaciones e inventarios.
- Aprobación de cambios y salidas observadas.
- Activación y desactivación de personal, salvo restricciones del propietario.

#### Recepción

- Registro de huéspedes, ingresos y salidas.
- Registro de acompañantes.
- Actas, fotografías y documentos.
- Registro y seguimiento de limpieza y mantenimiento.
- No puede modificar configuración estructural ni aprobar sus propias excepciones.

Recepción absorbe operativamente limpieza y mantenimiento. Las personas que realicen físicamente esos trabajos pueden registrarse como texto sin tener necesariamente una cuenta.

### Personal rotativo

- El propietario o administrador registra previamente el correo del trabajador.
- Se asigna un rol antes de permitir el acceso.
- Al retirarse, el trabajador se desactiva en vez de eliminarse.
- Si regresa, se reactiva la misma cuenta.
- Sus acciones históricas deben conservarse siempre.
- Un usuario no debe poder desactivar su propia cuenta.

---

## 4. Ficha del huésped

### Datos del titular adulto

- Nombres y apellidos.
- Tipo de documento.
- Número de CI, pasaporte u otro documento.
- Celular o WhatsApp.
- Dirección, opcional.
- Contacto de emergencia, opcional.
- Fotografía del documento, recomendable.
- Observaciones.

### Acompañantes

Registrar individualmente a todos los acompañantes.

Para adultos:

- Nombre completo.
- Documento, si está disponible.
- Teléfono, opcional.

Para menores:

- Nombre completo.
- Edad o fecha de nacimiento.
- Adulto responsable.
- Documento, si está disponible.

### Identificación pendiente

Permitir registros sin documento en casos excepcionales, marcándolos como `Identificación pendiente` hasta completar la información.

### Prevención de duplicados

El número de documento es el identificador principal. Cuando se introduzca un documento existente, mostrar la ficha correspondiente y permitir reutilizarla.

El teléfono sirve para buscar coincidencias, pero no debe ser único porque varias personas pueden compartirlo.

### Titularidad

Toda estadía activa debe tener un titular.

Permitir el traspaso de titularidad únicamente mediante una operación auditada que registre:

- Titular anterior.
- Nuevo titular.
- Motivo.
- Fecha y hora.
- Usuario responsable.

---

## 5. Estadías

No implementar reservas futuras en esta etapa. Registrar al huésped cuando llega.

### Modalidades

- Por día.
- Por semana.
- Por mes.
- Arrendamiento mediante contrato.

### Datos

- Titular.
- Acompañantes.
- Habitación.
- Fecha y hora de ingreso.
- Fecha prevista de salida.
- Fecha real de salida.
- Modalidad.
- Estado.
- Observaciones.
- Contrato, cuando corresponda.

### Fecha prevista de salida

- Obligatoria para día y semana.
- Obligatoria y modificable para mes.
- En arrendamiento puede depender de la vigencia del contrato.

No finalizar automáticamente una estadía vencida. Marcarla como `Vencida` y mostrar alertas.

### Capacidad

Bloquear normalmente una ocupación superior a la capacidad. Permitir excepción únicamente a administrador o propietario, exigiendo motivo.

### Movimientos de ocupantes

Permitir añadir o retirar acompañantes durante la estadía, registrando fecha y hora de inicio y fin de su permanencia.

---

## 6. Ingreso

Estados sugeridos:

1. Ingreso en proceso.
2. Pendiente de firma.
3. Estadía activa.
4. Acta firmada pendiente de carga.

La estadía puede activarse aunque la fotografía del acta firmada todavía no haya sido cargada. Debe existir un plazo máximo configurable de 24 horas.

Durante ese plazo mostrar una alerta persistente. Después del vencimiento, mantener la estadía activa, pero marcar el incumplimiento visiblemente para administración.

---

## 7. Inventario

### Inventario base de referencia

- 1 cama.
- 2 almohadas.
- 1 juego de sábanas.
- 1 cubrecama.
- 1 mesa.
- 1 cómoda.
- 1 silla.

Agregar individualmente, según cada habitación:

- Televisión.
- Control remoto.
- Poltrona.
- Ventilador.
- Muebles adicionales.
- Llaves.
- Otros objetos.

### Clasificación

- Permanentes: cama, televisión, mesa, cómoda, silla, poltrona, ventilador.
- Reutilizables entregables: almohadas, sábanas, cubrecama, controles y llaves.
- Consumibles: dejarlos fuera del control inicial o manejarlos en un módulo posterior.

### Estado por elemento

- Bueno.
- Observado.
- Dañado.
- Faltante.
- No aplica.

### Estado físico de la habitación

Controlar también, separado del inventario:

- Paredes.
- Piso.
- Techo.
- Baño.
- Puertas y cerraduras.
- Ventanas y cortinas.
- Iluminación.
- Enchufes.

### Movimientos durante la estadía

Cuando se entregue o retire un objeto, registrar:

- Elemento.
- Cantidad.
- Tipo de movimiento.
- Motivo.
- Fecha y hora.
- Responsable.
- Evidencias.

El objeto debe reflejarse en el inventario final de devolución sin borrar el inventario original.

---

## 8. Evidencias y documentos

Crear un módulo práctico llamado `Evidencias`, optimizado para captura desde celular.

### Etapas

- Entrega.
- Durante la estadía.
- Devolución.
- Limpieza.
- Mantenimiento.
- General.

### Categorías

- Vista general.
- Cama y ropa de cama.
- Muebles.
- Baño.
- Paredes, piso y techo.
- Puertas y ventanas.
- Televisión y equipos.
- Inventario adicional.
- Daño u observación.
- Acta firmada.
- Contrato.
- Documento de identidad.
- Otra evidencia.

### Interacción

Permitir:

- Tomar fotografías directamente.
- Seleccionar imágenes existentes.
- Cargar varias imágenes por categoría.
- Cargar PDF.
- Añadir descripción.
- Relacionar evidencia con habitación, estadía, inspección, evento o movimiento de inventario.
- Mostrar progreso de evidencias requeridas.

Ejemplo:

```text
✓ Vista general
✓ Cama
○ Muebles pendientes
✓ Baño
○ Acta firmada pendiente
```

Las categorías obligatorias deben adaptarse al inventario real. Una habitación sin televisión no debe pedir evidencia de televisión.

Una evidencia perteneciente a un acta cerrada no puede reemplazarse silenciosamente. Debe anularse con motivo y conservarse junto con la nueva versión.

---

## 9. Actas

Generar actas imprimibles con identidad del hotel, datos del huésped, habitación, fechas, inventario, infraestructura, observaciones y espacios para firmas.

### Acta de entrega

- Checklist de inventario.
- Checklist de infraestructura.
- Estado y observaciones por elemento.
- Referencia a evidencias.
- Firma del huésped en papel.
- Firma del encargado en papel.
- Fotografía o escaneo posterior.

La fotografía firmada puede quedar pendiente hasta 24 horas después del ingreso.

### Acta de devolución

- Comparación con la entrega.
- Estado final por elemento.
- Daños y faltantes.
- Evidencias finales.
- Firma del huésped y encargado.

La fotografía del acta firmada debe ser obligatoria para cerrar una salida normal.

### Salida sin firma

Permitir excepcionalmente:

- Motivo obligatorio.
- Fotografías obligatorias.
- Autorización administrativa.
- Registro de testigos, si existen.
- Documento marcado como `Salida sin firma del huésped`.

---

## 10. Cambio de habitación

Mantener una sola estadía general y crear segmentos de ocupación.

Ejemplo:

```text
Estadía de Juan Pérez
├── Habitación 4: 1 al 5 de agosto
└── Habitación 10: 5 al 20 de agosto
```

Cada segmento debe tener:

- Habitación.
- Fechas.
- Acta de entrega.
- Acta de devolución.
- Inventario.
- Evidencias.
- Motivo del traslado.

El cambio exige devolución de la habitación anterior y entrega de la nueva.

---

## 11. Salida

Antes de finalizar normalmente exigir:

- Inspección de devolución.
- Comparación con el ingreso.
- Inventario final.
- Fotografías requeridas.
- Acta firmada cargada.
- Confirmación de llaves.

Si existen daños o faltantes:

- Recepción los registra.
- Administrador o propietario autoriza la salida observada.
- La estadía termina operativamente.
- El incidente queda abierto para el futuro módulo de cobros.

---

## 12. Limpieza y mantenimiento

### Eventos

- Limpieza.
- Reparación.
- Mantenimiento preventivo.
- Traslado o acomodo de muebles.
- Inspección.
- Reporte de daño.
- Otro.

### Gravedad

- Leve: no bloquea la habitación.
- Moderada: requiere seguimiento.
- Crítica: bloquea la habitación.
- Preventiva: trabajo programado.

Registrar:

- Título y descripción.
- Habitación y estadía, si corresponde.
- Prioridad.
- Estado.
- Fecha.
- Usuario que registró.
- Persona que realizó físicamente el trabajo.
- Evidencias.
- Resolución.

Recepción puede registrar y cerrar estas tareas dentro de sus funciones operativas.

---

## 13. Correcciones y aprobaciones

Recepción puede corregir directamente durante los primeros 30 minutos desde el registro únicamente si todavía no se generó un acta relacionada.

Después de 30 minutos, o inmediatamente después de generar un acta, cualquier modificación debe convertirse en solicitud pendiente.

### Flujo

1. Recepción selecciona el dato que desea cambiar.
2. Indica el nuevo valor y motivo.
3. El valor original continúa vigente.
4. Administrador o propietario aprueba o rechaza.
5. Si aprueba, se aplica el nuevo valor.
6. El sistema conserva valor anterior, valor propuesto, solicitante, aprobador, fechas y resultado.

### Motivo obligatorio

Exigir motivo para:

- Desactivar pisos o habitaciones.
- Cambiar una habitación de piso.
- Cambiar titular.
- Exceder capacidad.
- Anular documentos o evidencias.
- Reabrir estadías.
- Salidas sin firma.
- Modificar actas cerradas.
- Desactivar trabajadores.

---

## 14. Excepciones

### Reapertura de estadía

Solamente propietario o administrador. No permitir si la habitación fue asignada nuevamente.

### Estadía vencida

Mantener activa y mostrar cantidad de días de retraso. No finalizar automáticamente.

### Fusión o división de habitaciones

Función administrativa opcional. Desactivar las habitaciones originales y crear las nuevas, conservando relaciones históricas.

### Salida con daños

Finalizar operativamente con autorización y mantener incidente abierto.

---

## 15. Auditoría

Registrar como mínimo:

- Usuario.
- Acción.
- Entidad afectada.
- Valor anterior.
- Valor nuevo.
- Motivo.
- Fecha y hora.
- Dispositivo o información de sesión disponible.
- Aprobación relacionada.

No permitir eliminación física de actas, estadías, huéspedes con historial, evidencias, usuarios con actividad ni habitaciones utilizadas.

---

## 16. Pantallas mínimas

- Inicio y estado general del hotel.
- Habitaciones por piso.
- Detalle e historial de habitación.
- Configuración de pisos.
- Configuración de habitaciones.
- Inventario por habitación.
- Registro de ingreso.
- Ficha del huésped.
- Historial del huésped.
- Estadía activa.
- Acompañantes.
- Acta de entrega.
- Acta de devolución.
- Evidencias y galería.
- Eventos de limpieza y mantenimiento.
- Personal, roles y accesos.
- Solicitudes pendientes de aprobación.
- Auditoría.

---

## 17. Modelo de datos orientativo

Entidades principales:

- Usuarios.
- Roles y permisos.
- Pisos.
- Habitaciones.
- Tipos de habitación.
- Inventario.
- Huéspedes.
- Estadías.
- Ocupantes de estadía.
- Segmentos de habitación.
- Inspecciones.
- Elementos inspeccionados.
- Movimientos de inventario.
- Eventos operativos.
- Documentos.
- Evidencias.
- Solicitudes de modificación.
- Incidentes.
- Auditoría.

Utilizar identificadores internos estables. Los números de habitación y documentos de identidad son datos de negocio, no claves primarias.

---

## 18. Criterios de aceptación

La primera versión operativa se considera lista cuando:

1. Se pueden crear, editar, ordenar y desactivar pisos.
2. Se pueden crear, mover, configurar y desactivar habitaciones sin perder historial.
3. No se puede mover ni desactivar una habitación ocupada.
4. Se pueden registrar titular y acompañantes evitando duplicados por documento.
5. Se puede registrar identificación pendiente.
6. Se pueden crear estadías por día, semana, mes y arrendamiento.
7. La capacidad solo se excede con autorización.
8. Cada habitación tiene inventario e infraestructura configurables.
9. Entrega y devolución poseen checklist, evidencias y documentos imprimibles.
10. El módulo de evidencias guía al trabajador por categorías.
11. La entrega firmada genera alerta y plazo máximo de 24 horas.
12. Una salida normal no se cierra sin devolución y acta firmada.
13. Un cambio de habitación conserva segmentos y documentos separados.
14. La habitación pasa por limpieza e inspección antes de volver a disponible.
15. El personal rotativo se desactiva sin perder historial.
16. Las correcciones tardías requieren aprobación.
17. Todas las excepciones quedan auditadas.
18. El sistema funciona correctamente en computadora, tablet y celular.

---

## 19. Orden recomendado de construcción

### Fase 1: base operativa

- Pisos y habitaciones configurables.
- Estados de habitación.
- Huéspedes y acompañantes.
- Estadías.
- Inventario.

### Fase 2: documentación

- Inspecciones.
- Actas de entrega y devolución.
- Evidencias guiadas.
- Galería de documentos.

### Fase 3: control interno

- Limpieza y mantenimiento.
- Trabajadores y roles.
- Aprobaciones.
- Auditoría.
- Alertas.

### Fase 4: pruebas

- Piloto con 2 o 3 habitaciones.
- Prueba de ingreso, traslado y salida.
- Verificación de documentos y recuperación de archivos.
- Ajustes de usabilidad con recepción.

### Fase posterior

- Pagos.
- Garantías.
- Cargos por daños.
- Cuotas y saldos.
- Reportes financieros.

---

## 20. Mini POS y almacén comercial

El sistema incorporará un mini POS relacionado con huéspedes, estadías y habitaciones, además de un almacén comercial separado del inventario físico entregado con las habitaciones. El módulo completo de pagos, cuentas, caja y facturación seguirá siendo una fase posterior, pero el POS podrá distinguir ventas pagadas y cargos pendientes.

### Reglas confirmadas de ventas

1. Permitir ventas a huéspedes y ventas directas a personas externas o trabajadores.
2. Toda venta a un huésped debe relacionarse obligatoriamente con una estadía activa. Las operaciones sin estadía se registran como venta directa.
3. Cuando compre un acompañante, registrar quién realizó el consumo, pero mantener la responsabilidad económica en el titular de la estadía.
4. No implementar minibar ni consumos automáticos detectados en habitación.
5. Estados iniciales de venta: pagada, pendiente o cargada a habitación, anulada y devuelta. El pago parcial queda para el módulo financiero posterior.
6. Una venta pendiente bloquea el cierre normal de la estadía. La salida excepcional requiere autorización de Administrador o Propietario y debe quedar auditada.
7. Recepción puede cargar ventas pendientes a la habitación. Debe visualizar siempre el total acumulado. El sistema quedará preparado para exigir autorización al superar un límite configurable.
8. Si el huésped cambia de habitación, los consumos permanecen relacionados con la misma estadía y el mismo titular, conservando la habitación donde se originó cada uno.

### Productos y servicios

- Catálogo inicial de referencia: agua, gaseosas, jugos, café, snacks, papel higiénico, jabón y otros productos configurables.
- No incluir champú, detergente ni cepillos de dientes en el catálogo inicial.
- Los productos descuentan existencias.
- Los servicios sin existencias físicas serán un módulo opcional, desactivado inicialmente y habilitable únicamente desde una configuración administrativa protegida.
- Cada producto tendrá un precio de venta único.
- Recepción no puede modificar el precio durante una venta.
- Manejar unidad de compra o almacenamiento y unidad de venta con conversión. Ejemplo: una caja de 12 botellas ingresa 12 unidades vendibles.

### Ubicaciones y entradas de almacén

- Manejar dos ubicaciones: Almacén principal y Stock de recepción.
- Permitir transferencias auditadas entre ambas ubicaciones.
- Al ingresar mercadería registrar obligatoriamente producto, cantidad, costo, fecha y responsable.
- Proveedor, número de comprobante y fotografía del comprobante pueden ser opcionales inicialmente.
- Registrar costo unitario y precio de venta para calcular margen y ganancia aproximada por producto.
- Los costos, márgenes, ganancias y gráficos financieros solo serán visibles para Propietario y Administrador.
- Controlar lotes y fechas de vencimiento para los productos correspondientes.
- Cada producto tendrá un stock mínimo configurable y generará una alerta al alcanzarlo.

### Permisos de existencias

- Recepción consulta existencias y registra ventas.
- Administrador registra entradas, transferencias, pérdidas y ajustes.
- Propietario tiene acceso completo.
- Todo ajuste exige motivo, responsable, fecha y hora.
- Los motivos pueden incluir vencimiento, daño, consumo interno, cortesía, error de conteo, pérdida o corrección.
- Ningún movimiento de existencias se elimina físicamente.

### Anulación y evidencia

- Recepción puede anular una venta en cualquier momento, siempre con motivo obligatorio. No se aplicará una ventana máxima de anulación.
- La venta anulada permanece visible como evidencia y conserva productos, cantidades, total, vendedor, responsable de anulación, fecha, hora y motivo.
- La anulación no devolverá automáticamente los productos al stock. Si corresponde corregir existencias, deberá registrarse expresamente mediante un movimiento auditado, manteniendo visible la evidencia de la operación original.

### Devoluciones

- Permitir devoluciones parciales.
- Registrar producto, cantidad devuelta, motivo, responsable, estado físico y si puede regresar al stock.
- Si un producto vuelve al stock, generar un movimiento de entrada identificado expresamente como devolución.
- Toda devolución o anulación exige un motivo obligatorio. Ofrecer motivos rápidos y un campo adicional de observación.
- Recepción puede consultar las anulaciones de su turno. Administrador y Propietario pueden consultar el historial completo.

### Comprobante interno

Generar un comprobante interno con:

- Identidad del Hotel ASAEL.
- Número de venta.
- Fecha y hora.
- Habitación y estadía, cuando corresponda.
- Huésped titular.
- Acompañante que realizó el consumo, cuando corresponda.
- Productos o servicios, cantidades y precios.
- Total.
- Estado pagado o pendiente.
- Forma de pago.
- Trabajador que atendió.
- Espacio opcional para firma.

Preparar formato térmico y formato PDF o tamaño carta para no depender de un modelo específico de impresora.

No implementar facturación fiscal en esta etapa. El documento será únicamente un comprobante interno.

Permitir reimpresiones. Cada nueva copia debe mostrar la palabra `REIMPRESIÓN` y registrar usuario, fecha, hora y cantidad de reimpresiones.

### Caja, turnos y formas de pago

- Preparar desde el POS la relación entre cada venta y su forma de pago.
- El control financiero completo continuará siendo un bloque posterior, pero el modelo debe admitir caja y turnos desde el inicio.
- Cada trabajador realiza apertura y cierre de caja, registrando responsable, hora, monto inicial, monto final y observaciones.
- Utilizar una caja compartida por recepción con cierre y entrega formal entre turnos. Cada venta conserva al trabajador que la realizó.
- Registrar diferencias de caja con monto esperado, monto contado, diferencia, motivo, responsable y administrador que revisó.
- Formas de pago iniciales: efectivo, transferencia bancaria, QR, pendiente o cargado a habitación, cortesía y otro.
- Mantener QR y transferencia como formas separadas.
- Permitir adjuntar opcionalmente una captura o documento como evidencia del pago digital.

### Permisos comerciales

Recepción puede:

- Registrar ventas y cargarlas a una estadía.
- Consultar existencias del Stock de recepción.
- Imprimir y reimprimir comprobantes.
- Anular ventas con motivo obligatorio.
- Consultar ventas del turno actual, incluidas las realizadas por otra recepcionista del mismo turno.
- Consultar consumos pendientes de una habitación.

Recepción no puede modificar productos, precios, costos ni existencias manualmente, ni consultar el historial financiero completo.

Administrador y Propietario pueden:

- Crear, editar y desactivar productos.
- Cambiar precios.
- Consultar costos, márgenes y ganancias.
- Registrar compras y entradas.
- Transferir productos entre Almacén principal y Stock de recepción.
- Ajustar existencias y registrar pérdidas.
- Revisar anulaciones y devoluciones.
- Configurar stock mínimo.
- Consultar reportes completos.
- Activar o desactivar el módulo opcional de servicios.

Solamente el Propietario puede modificar configuraciones comerciales críticas o desactivar definitivamente el módulo.

Cuando un trabajador sea desactivado, conservar permanentemente todas sus ventas, anulaciones, devoluciones y movimientos con su identidad histórica.

### Reportes comerciales

Implementar inicialmente:

- Ventas diarias, semanales y mensuales.
- Ventas por trabajador.
- Ventas por huésped y habitación.
- Ventas por producto y productos más vendidos.
- Ventas pagadas y pendientes.
- Anulaciones y devoluciones.
- Entradas, salidas y transferencias de almacén.
- Existencias por ubicación.
- Productos con stock bajo.
- Productos próximos a vencer.
- Diferencias de inventario.
- Cortesías y consumos internos.

Para Administrador y Propietario, incluir costos, margen, ganancia aproximada por producto y gráficos de rentabilidad. Recepción no debe visualizar costos ni ganancias.

### Controles finales del POS

- No permitir ventas con existencias insuficientes ni stock negativo. Administración deberá registrar primero una entrada, transferencia o corrección auditada.
- Cada estadía tendrá un límite configurable para consumos pendientes. El valor inicial será Bs 200 y podrá editarse desde Administración.
- Cuando el nuevo consumo supere el límite pendiente, exigir autorización de Administrador o Propietario antes de confirmar la venta.
- En ventas directas, permitir una operación rápida sin identificación obligatoria. Nombre, CI, teléfono y observación serán opcionales; Administración podrá configurar reglas adicionales para ventas de monto elevado.
- Toda venta del POS descuenta exclusivamente del Stock de recepción. La existencia del Almacén principal no se considera disponible para venta hasta realizar una transferencia.
- Recepción puede solicitar reposición. Administrador o Propietario confirma la transferencia, registrando quién entregó, quién recibió, cantidades, fecha y hora.
- Calcular costos y ganancias mediante costo promedio ponderado cuando existan compras del mismo producto a precios diferentes.
- Mostrar alertas de vencimiento con 30, 15 y 7 días de anticipación.
- Aplicar rotación por vencimiento, utilizando primero el lote que vence antes.
- Bloquear la venta de productos vencidos. Su retiro requiere un movimiento por vencimiento con motivo y responsable.
- Recepción puede solicitar cortesías, pero solamente Administrador o Propietario puede autorizarlas. La cortesía descuenta stock y conserva su valor económico en los reportes.
- Numerar ventas con el formato `V-AAAA-000001`, reiniciando la secuencia cada año.
- Los números de ventas anuladas no se eliminan ni reutilizan.
- Permitir anular una venta pendiente incluso después de un traslado o una salida excepcional, conservando la estadía, habitación de origen, habitación final, trabajador, fecha y motivo.
- Una anulación posterior no modifica automáticamente las existencias. Cualquier corrección de stock debe registrarse por separado.

### Flujo comercial resumido

```text
Venta a huésped
→ Seleccionar estadía y persona que consume
→ Agregar productos disponibles en Stock de recepción
→ Validar precios, existencias, vencimientos y límite pendiente
→ Registrar forma de pago o cargo a habitación
→ Descontar stock
→ Generar comprobante interno
→ Conservar venta y movimientos en auditoría
```

```text
Reposición
→ Recepción solicita productos
→ Administración autoriza
→ Salida del Almacén principal
→ Entrada al Stock de recepción
→ Confirmación de entrega y recepción
```

---

## 21. Instrucción final para el equipo o agente desarrollador

Antes de implementar una función, valida que respete los estados, permisos, historial y excepciones descritos. Si aparece una ambigüedad que pueda cambiar el resultado operativo, formula una pregunta de negocio con un ejemplo concreto y una recomendación. No inventes reglas financieras ni legales.

Implementa por fases, prueba cada transición de estado y conserva compatibilidad con los datos existentes. Prioriza una interfaz clara para personal no técnico, botones grandes para celular, captura directa de fotografías, mensajes comprensibles y prevención de errores antes que configuraciones excesivamente técnicas.

---

## 22. Estado consolidado del bloque comercial

Además del diseño anterior, el sistema ya incorpora caja compartida, cobros parciales, devoluciones, reposiciones aprobadas, ajustes de inventario, respaldos de pagos digitales y límite configurable de consumos pendientes.

El cierre funcional del mini POS aplica estas reglas adicionales confirmadas:

- El catálogo distingue `PRODUCTO` y `SERVICIO`.
- Los servicios no tienen existencias ni generan movimientos físicos.
- El módulo de servicios inicia desactivado y solamente el Propietario puede activarlo o desactivarlo.
- Recepción puede solicitar una cortesía indicando el motivo. Mientras esté pendiente no descuenta existencias, no se imprime como venta confirmada y bloquea la salida normal de la estadía.
- Administrador o Propietario aprueban o rechazan la cortesía. La aprobación vuelve a validar existencias y recién entonces descuenta el stock; el rechazo conserva la solicitud como evidencia.
- Los ingresos de almacén pueden registrar proveedor, número de comprobante y una fotografía o PDF privado.
- Las ventas directas admiten nombre, CI y celular opcionales.
- Los comprobantes internos ofrecen formato carta y térmico, con espacios de firma.
- Administración puede exportar ventas y movimientos de almacén en CSV compatible con Excel.
- Los reportes comerciales incluyen ventas por huésped, habitación, trabajador, producto, forma de pago y estado.
- Las alertas de vencimiento distinguen los rangos de 30, 15 y 7 días.
