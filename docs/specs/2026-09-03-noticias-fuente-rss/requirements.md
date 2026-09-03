# Requirements Document: Noticias (fuente RSS)

## Introduction

Primera skill (fuente de datos) del briefing diario personal. Junta
noticias de uno o más feeds RSS configurados de antemano, las combina
en una sola lista ordenada, y las presenta como una página HTML servida
en un servidor local. V1 sin LLM: solo se descarga, parsea y formatea
texto, no se resume ni interpreta contenido. Diseño acordado en la
conversación de brainstorming previa a este documento.

## Requirements

### Requirement 1: Configuración de feeds RSS

**User Story:** Como usuario de la app, quiero configurar qué feeds RSS se usan, para que el briefing refleje mi tema de interés.

#### Acceptance Criteria

1. THE SYSTEM SHALL leer una lista de URLs de feeds RSS desde un archivo de configuración versionado en el repo (`src/config.ts`), sin variables de entorno ni argumentos de línea de comandos.
2. IF la lista de feeds configurada está vacía THEN THE SYSTEM SHALL generar un briefing sin ítems, sin lanzar una excepción.

### Requirement 2: Descarga y parseo de un feed RSS

**User Story:** Como usuario, quiero que la app descargue y parsee cada feed RSS configurado, para obtener las noticias más recientes extraídas del XML crudo.

#### Acceptance Criteria

1. WHEN la app arranca THE SYSTEM SHALL descargar cada URL de feed configurada por HTTP usando `fetch` nativo de Node.
2. WHEN la respuesta de un feed se descarga con éxito THE SYSTEM SHALL parsear cada elemento `<item>` extrayendo título, link, fecha de publicación y descripción.
3. IF un `<item>` no tiene descripción THEN THE SYSTEM SHALL incluirlo igual en el resultado con la descripción como string vacío.
4. IF la descarga de un feed falla (error de red o respuesta no exitosa) THEN THE SYSTEM SHALL loguear el error, tratar ese feed como una lista vacía de ítems, y continuar procesando el resto de los feeds configurados.
5. IF el contenido descargado de un feed no es RSS/XML válido THEN THE SYSTEM SHALL loguear el error y tratar ese feed como una lista vacía de ítems.

### Requirement 3: Formateo del briefing como HTML

**User Story:** Como usuario, quiero ver las noticias del día presentadas en una página HTML legible, para poder recorrerlas de un vistazo.

#### Acceptance Criteria

1. WHEN se genera el briefing THE SYSTEM SHALL combinar los ítems de noticias de todos los feeds configurados en una sola lista.
2. THE SYSTEM SHALL ordenar la lista combinada por fecha de publicación, de más reciente a más antigua.
3. THE SYSTEM SHALL limitar la lista combinada a los primeros N ítems, con N configurable y un valor por defecto de 15.
4. WHEN se renderiza el briefing THE SYSTEM SHALL producir un string HTML que incluya, por cada ítem, su título (como link al artículo original), su fecha de publicación y su descripción.
5. IF la lista combinada de ítems está vacía THEN THE SYSTEM SHALL renderizar una página HTML que indique que no hay noticias disponibles, en vez de una página vacía o rota.

### Requirement 4: Servidor local que sirve el briefing

**User Story:** Como usuario, quiero correr la app y ver el briefing en mi navegador, para no tener que abrir un archivo a mano.

#### Acceptance Criteria

1. WHEN la app arranca THE SYSTEM SHALL descargar y formatear el briefing una sola vez, y luego levantar un servidor HTTP en localhost usando `node:http`.
2. WHEN se hace una request a la ruta raíz (`/`) del servidor THE SYSTEM SHALL responder con el HTML del briefing generado al arrancar.
3. WHEN el servidor arranca con éxito THE SYSTEM SHALL imprimir la URL local por consola.
4. THE SYSTEM SHALL usar un puerto fijo por defecto (3000) para v1.

## Out of Scope

- Auto-refresh del briefing o regeneración periódica sin reiniciar el proceso.
- Múltiples temas/briefings simultáneos en una misma corrida.
- Cache del contenido entre corridas del proceso.
- Timeout y reintentos configurables en la descarga de feeds (solo manejo de error simple, sin reintento).
- Configuración de feeds por variable de entorno o argumento de línea de comandos.
- Dependencias externas para parseo de XML o para el servidor HTTP (Express, librerías de RSS, etc.).
