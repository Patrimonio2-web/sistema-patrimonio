# Auditoría de mantenimiento — 17/11/2026

## Alcance y estado

- Repositorio: monorepo Next.js 15.5, React 18 y Flask 2.2, con PostgreSQL. Al iniciar la revisión, `main` estaba limpio y un commit por delante de `origin/main` (`aaadaea`). Por tanto, el último retiro de plantillas y personal aún no estaba reflejado en la rama remota observada.
- Esta intervención no hizo commit, push, despliegue, cambios de variables productivas, migraciones ni escrituras en la base productiva.
- Una comprobación pública puntual devolvió HTTP 200 para la portada Vercel y HTTP 401 para `/api/me` anónimo en Railway. Es una prueba de disponibilidad y rechazo anónimo, no una prueba de los flujos autenticados.

## Revisión de cambios anteriores

Los 44 tests Python existentes pasaban antes de esta intervención; lint, TypeScript y el build de Next 15.5.21 también pasaban en este equipo. Las rutas HTML antiguas de Flask ahora redirigen a Next y no quedan plantillas Jinja en el repositorio. Las rutas JSON principales siguen declaradas. La eliminación del módulo de personal fue solicitada en la conversación anterior y su respaldo de código quedó fuera del repositorio en `Desktop/sistema-personal-respaldo`.

No hay evidencia suficiente para afirmar equivalencia completa de todos los flujos productivos. Se detectó una incompatibilidad concreta: `/altas/exportar_pdf` antes devolvía HTML con el formato oficial de una plantilla del backend y ahora responde con un 302 hacia `/altas/imprimir` de Next. El resultado ya no es la misma respuesta HTTP y no se comparó visualmente el documento. También se retiraron los POST de los formularios HTML heredados `/altas` y `/altas/editar/<id>`, y `/altas/eliminar/<id>`; la interfaz Next actual utiliza las API JSON. Antes de publicar el commit `aaadaea`, hace falta validar si algún usuario o integración utiliza esas rutas antiguas y comparar impresiones/PDF con muestras representativas. Esta revisión no reintroduce escrituras heredadas sin pruebas de PostgreSQL.

## Seguridad

| Hallazgo | Riesgo | Acción |
|---|---|---|
| `/api/uploads` confiaba en la extensión, exponía el error interno y dejaba un archivo temporal si Cloudinary fallaba. | Alto | Valida JPEG, PNG o GIF con Pillow, responde con error genérico y limpia el temporal en `finally`. Tres pruebas nuevas cubren archivo falso, carga válida y fallo externo. |
| El alta de mobiliario registraba el cuerpo completo de la petición; auditoría registraba parámetros de búsqueda. | Medio | Se quitaron esos logs de datos y parámetros. |
| La autenticación conserva compatibilidad con contraseñas antiguas en texto plano y las convierte a hash tras iniciar sesión. | Alto, condicionado a registros antiguos | No se cambió el contrato de autenticación. Verificar el estado real de la tabla y diseñar una transición antes de retirar la compatibilidad. |
| El limitador de login vive en memoria de cada proceso y toma `X-Forwarded-For` de la petición. | Medio | Requiere diseño con proxy confiable y almacenamiento compartido; no se modificó sin conocer la infraestructura efectiva. |
| Numerosos errores 500 devuelven `str(e)` al cliente. | Medio | Pendiente de una normalización por endpoint para no alterar mensajes que el frontend use como validaciones. |
| Los roles se muestran en el frontend, pero el backend aplica permisos, CSRF e inactividad antes de las operaciones API. | Control existente | No se cambió el modelo de permisos. Se ejecutaron las pruebas existentes de sesión y roles, sin cuentas reales. |

`frontend/.env` y `backend/.env` están ignorados por Git; solo se versiona el ejemplo sin credenciales. No se imprimieron secretos. Las URLs con contraseña compartidas previamente fuera del repositorio deben tratarse como expuestas y rotarse mediante un procedimiento coordinado, sin alterar la conexión productiva durante esta auditoría.

## Dependencias

`pnpm audit` al inicio: 24 avisos (4 críticos, 9 altos, 7 moderados y 4 bajos). Se aplicaron parches puntuales de la rama actual: Next y eslint-config-next 15.5.29, y overrides de `dompurify`, `brace-expansion`, `fflate`, `postcss-selector-parser`, `source-map-js`, `js-yaml` y `sharp`. Después: 1 aviso moderado de `minimatch`, cuyo parche indicado exige una versión mayor; se deja pendiente de pruebas de compatibilidad de ESLint. El conteo de avisos no equivale a 24 fallos explotables en esta aplicación. La [versión 15.5.29 de Next](https://github.com/vercel/next.js/releases/tag/v15.5.29) incluye parches de seguridad de la misma rama.

Se instaló `pip-audit` en un entorno temporal separado. La auditoría de `backend/requirements.txt` encontró 29 avisos en cuatro dependencias declaradas: Flask 2.2.5 (2), Flask-Cors 3.0.10 (10), Werkzeug 2.2.3 (15) y python-dotenv 1.0.1 (2). Sus remediaciones requieren una revisión conjunta de compatibilidad; no se cambiaron automáticamente. La auditoría del `venv` local encontró 128 avisos en 11 paquetes, incluidos restos de dependencias ya retiradas del despliegue (por ejemplo, pdfkit) y herramientas locales (pip y setuptools); ese conteo no representa por sí solo el riesgo del servicio Railway.

Pillow local 12.2.0 tenía avisos con correcciones parciales en 12.3.0. Se probó localmente 12.3.0 y las 47 pruebas pasaron, pero una segunda auditoría detectó 42 avisos todavía abiertos en 12.3.0, con corrección indicada en 13.0.0. La restricción propuesta a 12.x se retiró; `requirements.txt` queda sin una nueva restricción y el salto mayor a 13 requiere pruebas específicas antes de fijarlo. La instalación local devolvió un error al retirar archivos bloqueados de la versión anterior y quedó una advertencia de distribución antigua en `venv`; `PIL` carga y `pip check` no detectó requisitos rotos. Se debe limpiar ese resto solo cuando no haya procesos Python usando el entorno, antes de reutilizar el `venv` para más instalaciones. El archivo ignorado `venv` no se despliega.

## Rendimiento

La búsqueda avanzada ya tenía `debounce` de 450 ms y paginación de servidor (30 por página por defecto; máximo 200). Se detectó en el código que la función de búsqueda dependía de `page` y su efecto podía volver a dispararse al cambiar la página. Ahora cancela búsquedas anteriores, ignora resultados obsoletos y evita que un clic manual duplique la búsqueda automática pendiente. El contrato de la API y los filtros se mantienen.

| Área | Línea base | Después | Alcance de la evidencia |
|---|---:|---:|---|
| Auditoría pnpm | 24 avisos | 1 aviso | Conteos del gestor de paquetes, no tiempo de respuesta. |
| Pruebas backend | 44 aprobadas | 47 aprobadas | Incluye tres pruebas nuevas de carga de imágenes. |
| Dashboard, SQL, listados, búsquedas, PDF | Sin medición representativa | Sin medición representativa | No hay `DATABASE_URL` local con datos de prueba equivalentes ni métricas productivas accesibles. No se atribuyen mejoras de latencia. |
| Disponibilidad pública | Una muestra: Vercel 200 (0,247 s), Railway `/api/me` 401 (0,611 s) | No aplica | Comprobación puntual de red, no comparativa de rendimiento. |

La generación de IDs de bienes consulta todos los IDs para calcular el máximo y puede competir con altas simultáneas. Es un riesgo de rendimiento e integridad. Cambiarla exige una estrategia transaccional, pruebas concurrentes en PostgreSQL aislado y revisión de los IDs existentes; no se tocó.

## Validaciones y límites

- Backend: 47 tests Python aprobados tras los cambios; compilación de sintaxis implícita al importar `app.py`.
- Frontend: TypeScript y lint aprobados después de la actualización de dependencias.
- El build anterior de Next 15.5.21 pasó. En Next 15.5.29 el compilador nativo de este Windows falla al cargar una DLL; el primer intento con WebAssembly falló al finalizar con caché anterior. Tras mover la caché `.next` a Temp, el build con el compilador WebAssembly de la misma versión terminó correctamente. El script raíz `pnpm build` activa ese respaldo únicamente en Windows si está instalado; se volvió a ejecutar sin variables manuales y pasó. Vercel usa Linux y conserva el comando de `frontend`.
- `pnpm dev` inició Flask y Next. El puerto 3000 estaba ocupado durante la prueba, por lo que Next usó 3001; la portada local respondió HTTP 200 y `/api/me` anónimo respondió HTTP 401. Se detuvo el proceso de prueba.
- No se probaron inicios de sesión reales, CRUD real, planes `EXPLAIN`, concurrencia, impresión física, QR escaneados ni el esquema productivo. Las pruebas con mocks no sustituyen esas comprobaciones.

## Compatibilidad y pasos previos al despliegue

No se necesitan nuevas variables de entorno ni migraciones por los cambios locales de esta intervención. El lockfile debe acompañar la actualización de Next. Se requiere una prueba de build en un entorno Linux equivalente a Vercel, pruebas manuales de login y permisos por rol, subida de imágenes JPEG/PNG/GIF, búsqueda y paginación, y comparación de documentos antiguos con Next antes de subir el commit pendiente. La reversión local de esta intervención consiste en descartar solo los archivos modificados en esta sesión o recuperar sus versiones de `aaadaea`; la reversión del commit anterior requiere una decisión separada por las rutas heredadas y el módulo de personal. En Vercel el Root Directory configurado es `frontend`, por lo que el script de build raíz para Windows no interviene en ese despliegue.

## Propuestas que necesitan preparación adicional

1. Compatibilidad de las rutas antiguas de altas y documentos: inventario de consumidores, muestras antes/después y migración equivalente o adaptadores de compatibilidad.
2. Base de datos: medir `EXPLAIN (ANALYZE, BUFFERS)` en copia aislada, especialmente búsqueda y dashboard; revisar índices y coste de agregaciones antes de crear estructuras.
3. IDs y concurrencia: diseñar secuencia o asignación serializada preservando IDs existentes, con prueba de altas simultáneas y plan de reversión.
4. Login: revisar cuentas antiguas, política de errores para evitar enumeración, limitador compartido y procedencia de IP de Railway.
5. Errores 500: sustituir detalles internos por respuestas estables y logs sanitizados endpoint por endpoint, con pruebas de contrato.
6. Auditoría Python con herramienta de vulnerabilidades y evaluación de parches compatibles.
