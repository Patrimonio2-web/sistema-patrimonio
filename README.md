# Sistema de Patrimonio

Monorepo independiente para la aplicación patrimonial. El frontend usa Next.js 15, React 18, TypeScript 5 y Tailwind CSS 3. El backend usa Flask 2.2 y PostgreSQL. Los proyectos originales y sus despliegues no forman parte de este repositorio.

## Estructura

- `frontend/`: interfaz, servicios y recursos públicos.
- `backend/`: API Flask, plantillas, archivos estáticos y pruebas.
- `package.json` y `pnpm-workspace.yaml`: comandos del frontend desde la raíz.

## Requisitos e instalación local

Se necesitan Node.js compatible con Next.js 15, pnpm 10.33.2, Python 3.11 y una base PostgreSQL **independiente**. Railway tomará Python 3.11 de `backend/.python-version`. Para PDF con `pdfkit` puede ser necesario instalar `wkhtmltopdf` en el sistema. Cloudinary requiere una cuenta y credenciales propias para las subidas.

```powershell
pnpm install
Copy-Item frontend/.env.example frontend/.env.local
Copy-Item backend/.env.example backend/.env
python -m venv backend/venv
backend/venv/Scripts/python.exe -m pip install -r backend/requirements.txt
```

Configurar `backend/.env` con `DATABASE_URL` de la base nueva, `SECRET_KEY` aleatoria y las credenciales Cloudinary del entorno nuevo. En `frontend/.env.local`, `API_ORIGIN` apunta al backend sin `/api`; el navegador sigue usando `/api` a través de los rewrites de Next.js, necesarios para la sesión. `NEXT_PUBLIC_SITE_URL` corresponde al nuevo frontend.

En dos terminales:

```powershell
backend/venv/Scripts/python.exe backend/app.py
pnpm dev
```

En Linux/macOS, usar `backend/venv/bin/python`. Los comandos de la raíz son `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm format` y `pnpm format:check`. `format` aplica las correcciones automáticas de ESLint; `format:check` verifica esas reglas. No se impone un reformateo general del código existente.

## Variables de entorno

Los ejemplos completos están en `frontend/.env.example` y `backend/.env.example`. No agregar secretos a Git. En producción son obligatorios `API_ORIGIN` en Vercel y `SECRET_KEY`, `DATABASE_URL`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `FRONTEND_ORIGINS`, `FRONTEND_PUBLIC_URL` y `BACKEND_PUBLIC_URL` en Railway. `DB_SSLMODE=require` se usa para PostgreSQL remoto con TLS. Los valores de roles y límites de acceso pueden configurarse con las variables ya admitidas por `app.py`.

## Pruebas

```powershell
pnpm lint
pnpm build
backend/venv/Scripts/python.exe -m unittest discover -s backend -p "test_*.py"
```

Ejecutar pruebas del backend con una base de pruebas aislada o con las conexiones simuladas de cada prueba. Nunca usar la base de producción. El backend puede validarse sin levantar un servidor con `python -c "import app"` desde `backend`.

## GitHub

Crear un repositorio **privado** llamado `sistema-patrimonio`. La raíz de Git es esta carpeta. Comprobar `git status --short` y `git ls-files` para verificar que no se incluyan `.env`, `venv`, `node_modules`, bases locales ni respaldos. Después del commit local, agregar el remoto del repositorio nuevo y hacer push. No asociar remotos de los proyectos originales.

```powershell
git remote add origin https://github.com/facu1391/sistema-patrimonio.git
git branch -M main
git push -u origin main
```

## Vercel

Importar el repositorio nuevo, elegir **Root Directory `frontend`**, Framework **Next.js**, pnpm y el comando de build `pnpm build`. El lockfile está en la raíz del workspace. Configurar `API_ORIGIN=https://<backend-nuevo>` y `NEXT_PUBLIC_SITE_URL=https://<frontend-nuevo>`. `NEXT_PUBLIC_API_BASE` debe permanecer en `/api`. Verificar que Vercel detecte el workspace y use el lockfile de la raíz antes de desplegar. No usar el backend original como destino.

## Railway

Crear un servicio desde el mismo repositorio con **Root Directory `/backend`**, runtime Python y **Config File Path `/backend/railway.json`** en los ajustes del servicio. Este archivo ejecuta `gunicorn app:app --bind 0.0.0.0:$PORT`; Railway aporta `PORT`. Configurar todas las variables del backend con los nuevos dominios, y enlazar una instancia PostgreSQL independiente. Si se generan PDFs mediante `pdfkit`, incluir `wkhtmltopdf` en la imagen o el entorno de ejecución. Los archivos locales del contenedor son efímeros: usar Cloudinary o un volumen persistente para datos que deban sobrevivir a un redeploy. Configurar HTTPS en el dominio público y revisar la respuesta de login, cookies, CORS y CSRF a través del proxy `/api`.

## Migración futura de PostgreSQL

La base actual no se conecta ni se modifica durante esta preparación. Cuando se autorice la migración: crear primero la base destino aislada; generar un backup consistente con `pg_dump` del origen; guardar y verificar ese archivo fuera del repositorio; restaurarlo con `pg_restore` en destino; comprobar recuentos de tablas, permisos, secuencias y funciones de la aplicación; probar con credenciales y dominios nuevos. Mantener un backup previo y un plan de reversión. Nunca ejecutar restauraciones ni migraciones destructivas sobre la base original.
