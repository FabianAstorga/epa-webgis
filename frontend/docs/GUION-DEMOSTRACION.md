# Guion de demostración · Tres artefactos UI

Este recorrido está pensado para presentar el avance del proyecto EPA/ZEAP en 5–7 minutos.
Todos los datos son simulados y el prototipo no requiere backend.

## Preparación

```bash
cd C:\Users\fabia\Desktop\EPA-WebGIS-Frontend
npm install
npm run dev
```

Abrir `http://localhost:5173/login`.

---

## 1. Acceso institucional (`/login`)

**Qué mostrar**

1. Mostrar la portada: carrusel a pantalla completa de cinco sectores, marca **EPA WebGIS**,
   título del proyecto, sector visible y reloj con fecha y hora en vivo.
2. Presionar **Acceder** en el extremo superior derecho. El panel de acceso se desliza y
   ocupa toda la pantalla; el mismo botón cambia a **Cerrar**.
3. El formulario es deliberadamente mínimo: correo, contraseña, **Ingresar** y
   **¿Olvidaste tu contraseña?**. Ingresar cualquier correo válido y una contraseña de 4+
   caracteres.
4. Mostrar el flujo de recuperación → código de demostración `482913` → nueva contraseña.
5. Cerrar el panel para volver al carrusel.

**Mensaje para la presentación**

> La portada mantiene solo la identidad EPA WebGIS, el título, el sector en pantalla y la
> fecha/hora. El acceso se resuelve con un panel lateral de pantalla completa y un
> formulario mínimo. En la versión con backend, el JWT y el rol provendrán de ASP.NET Core;
> hoy la sesión se simula en `localStorage` con perfil Operador.

**Trazabilidad:** RF-10, CU-01.

> La selección de perfil se retiró de la interfaz para aligerar la pantalla. Los permisos
> finos de RF-10 se aplicarán con la autorización del backend.

---

## 2. Comparador temporal (`/comparador`)

**Qué mostrar**

1. La portada del comparador tiene el carrusel de capturas como fondo, el título y una
   explicación breve.
2. En **01 · Escoge lugar y fecha**, abrir la lista de **Lugar** y seleccionar, por ejemplo,
   **Patio Norte**. Elegir un rango, por ejemplo **01-06-2026** a **30-09-2026**.
3. En los espacios **A (fecha anterior)** y **B (fecha posterior)**, seleccionar
   **14 JUN 2026** y **14 SEP 2026**. El visor aparece cuando existen dos fechas
   comparables y A es anterior a B.
4. En el visor, arrastrar la cortina con el ratón o el dedo. También funciona con
   teclado (`←`/`→`, `Shift` para pasos grandes, `Home`/`End`).
5. Activar **Retícula** para revisar alineación y **Reiniciar** para volver al 50 %.
6. Mostrar las tres acciones finales: **Ingresar en reporte**, **Exportar incidencia a
   PDF** e **Ir a reportes**.

**Mensaje para la presentación**

> La cortina se resuelve en el navegador con dos imágenes superpuestas y `clip-path`.
> El flujo obliga a escoger lugar, rango de fechas y una captura anterior/posterior; la
> interfaz no muestra metadatos técnicos ni información que pertenece al backend.

**Trazabilidad:** RAN-04, RF-06, CU-05.

---

## 3. Reporte ejecutivo (`/reportes/nuevo`)

**Qué mostrar**

1. Al volver desde el comparador aparece el aviso **Comparación importada** y el par A/B
   queda incluido en el reporte.
2. En **Paso 01**, revisar título, tipo, sector, período y destinatario. El formulario
   guarda un borrador automático en `localStorage`.
3. En **Paso 02**, filtrar por sector, estado o categoría; seleccionar o quitar hallazgos.
   Mostrar la evidencia y el resumen lateral (composición, severidades y estados).
4. En **Paso 03**, recorrer la vista A4: resumen ejecutivo, indicadores, comparación
   temporal, cartografía con pines, catastro, observaciones y firmas.
5. Presionar **Generar reporte PDF**. Se muestran las etapas de compilación y luego el
   documento generado con número, sector, cantidad de hallazgos y tamaño.
6. Presionar **Descargar PDF**. El navegador abre la impresión del área A4; se puede
   guardar como PDF sin encabezados ni pies del navegador.

**Mensaje para la presentación**

> El reporte reutiliza la comparación y el catastro del sistema, y se compone como un
> documento formal para jefatura. En la versión definitiva, el backend ASP.NET Core
> generará el PDF con QuestPDF y devolverá el archivo descargable.

**Trazabilidad:** RAN-03, RF-09, CU-08; integra RF-06/RAN-04.

---

## 4. Cierre técnico

- **Frontend:** React 19 + TypeScript + Vite + Tailwind 4.
- **Estética:** azul marino, acento azul, amarillo de énfasis, títulos compactos en
  mayúsculas, tarjetas rectas, Framer Motion y Lucide.
- **Datos:** cinco sectores, diez capturas simuladas y doce incidencias; las imágenes se
  generan con `scripts/generate-mock-aerials.mjs`.
- **Backend:** aún no implementado. `src/services` conserva los contratos y el modo
  `VITE_USE_MOCK`; al cambiar a `false`, las pantallas consumirán la API ASP.NET Core.
- **Persistencia local:** sesión, comparación seleccionada, borrador e historial de
  reportes. No se envía información a ningún servidor.
