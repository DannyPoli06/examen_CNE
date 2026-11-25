# Control Electoral CNE - Registro y Seguimiento de Actas

Aplicación móvil desarrollada con Ionic Angular (componentes standalone) y Capacitor para el registro, validación y seguimiento de actas electorales en Juntas Receptoras del Voto (JRV) de Ecuador.

## Tecnologías utilizadas

- **Frontend móvil:** Ionic Framework + Angular (standalone) + Capacitor (Camera, Geolocation, Network, Preferences).
- **Autenticación y base de datos:** Firebase Authentication y Cloud Firestore.
- **Almacenamiento de imágenes:** Supabase Storage (bucket `actas-fotos`).
- **Pruebas unitarias:** Vitest + Angular TestBed.

## Roles implementados

1. **Coordinador Provincial (`CoordProvincial`):**
   - Visualiza el dashboard consolidado y por recinto para Alcaldía y Prefectura.
   - Consulta avance de actas, coordenadas GPS y detalle de votos por organización política.
   - Crea y lista recintos electorales con sus JRV y asigna coordinadores de recinto.

2. **Coordinador de Recinto (`CoordRecinto`):**
   - Administra las JRV de su recinto asignado.
   - Registra nuevos veedores y los asigna o reasigna a mesas específicas.
   - Revisa actas ingresadas u observadas y puede corregir datos numéricos o estados.

3. **Veedor de Mesa (`Veedor`):**
   - Visualiza únicamente la JRV que tiene asignada.
   - Registra actas de Alcalde y Prefecto ingresando votos por lista, blancos, nulos y total de sufragantes.
   - Valida el cuadre numérico, captura la fotografía del acta desde cámara o galería, confirma nitidez y adjunta ubicación GPS.
   - Soporta cola local de sincronización cuando no hay conexión a internet.

## Arquitectura y modelo de datos

El proyecto separa la presentación (`src/app/pages`, `src/app/shared`) de la lógica de negocio y acceso a datos (`src/app/core/services`, `src/app/core/validators`, `src/app/core/guards`) y mantiene el estado de sesión en `SessionStore` (`src/app/core/state/session.store.ts`) usando signals de Angular.

Colecciones principales en Firestore:
- `usuarios`: perfil, cédula, correo, rol, estado de activación y asignación (`recintoID`, `jrvID`).
- `recintos`: cantón, parroquia, nombre, dirección, coordenadas y coordinador asignado.
- `jrvs`: código de mesa, número, género, electores, recinto, veedor asignado y estado.
- `listas`: organizaciones políticas y candidaturas para Alcalde y Prefecto.
- `actas`: resultados por lista, blancos, nulos, sufragantes, URL de foto en Supabase, GPS y estado.

## Instalación y configuración

1. Instalar dependencias:
   ```bash
   npm install
   ```

2. Configurar las credenciales de Firebase y Supabase en `src/environments/environment.ts` y `src/environments/environment.prod.ts` (sin subir claves privadas al repositorio).

3. Cargar datos iniciales de prueba en Firestore y Firebase Auth:
   ```bash
   node scripts/seed.mjs
   ```

## Pruebas y compilación

- Ejecutar pruebas unitarias:
  ```bash
  npm run test:unit
  ```

- Compilar versión de producción web:
  ```bash
  npm run build
  ```

- Sincronizar con Android (Capacitor):
  ```bash
  npx cap sync android
  ```

## Credenciales de demostración

Todos los usuarios de prueba tienen configurada la contraseña inicial `Ecuador2026`:

- **Coordinador Provincial:** cédula `1710000017`
- **Coordinador de Recinto (REC-17-001):** cédula `1710000025`
- **Veedor Mesa 1M (JRV-17-001-01M):** cédula `1710000033`
- **Veedor Mesa 1F (JRV-17-001-01F):** cédula `1710000041`
