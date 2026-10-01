# CIVIA

**CIVIA** es una plataforma móvil inteligente para el registro, clasificación, gestión y seguimiento de incidencias dentro de organizaciones públicas y privadas.

El proyecto fue desarrollado para la asignatura **Diseño y Programación de Software Multiplataforma** de la Universidad Don Bosco, con una arquitectura por capas que separa la aplicación móvil, la API principal, la persistencia de datos y el microservicio de Inteligencia Artificial.

---

## Objetivo

CIVIA busca facilitar que una persona pueda reportar una incidencia desde su teléfono, adjuntar evidencia, recibir una sugerencia de clasificación mediante Inteligencia Artificial y dar seguimiento al caso dentro de una organización.

La solución permite que cada organización administre sus propias categorías, departamentos, miembros y reportes, manteniendo separación de datos y permisos según el rol del usuario.

---

## Arquitectura general

```text
┌──────────────────────────────┐
│     React Native / Expo      │
│        Aplicación móvil      │
└──────────────┬───────────────┘
               │ HTTP / JWT
               ▼
┌──────────────────────────────┐
│         NestJS API           │
│  Autenticación y lógica      │
│        de negocio            │
└──────────┬───────────┬───────┘
           │           │
           │ Prisma    │ HTTP
           ▼           ▼
┌─────────────────┐  ┌────────────────────────┐
│   PostgreSQL    │  │ FastAPI - CIVIA IA     │
│ Base de datos   │  │ Análisis multimodal    │
└─────────────────┘  └───────────┬────────────┘
                                 │
                                 ▼
                       ┌───────────────────┐
                       │   Google Gemini   │
                       └───────────────────┘
```

### Principio de diseño

La aplicación móvil **no se conecta directamente a PostgreSQL ni a Gemini**.

Todo pasa primero por NestJS, donde se validan:

- autenticación;
- roles;
- membresías;
- permisos;
- organización;
- categorías disponibles;
- integridad de la información.

La API key de Gemini permanece únicamente del lado del microservicio de IA.

---

# Tecnologías utilizadas

## Aplicación móvil

- React Native
- Expo SDK 57
- Expo Router
- TypeScript
- Expo Secure Store
- Expo Image Picker
- Expo File System
- React Native Reanimated
- React Native Screens
- Safe Area Context

## Backend

- Node.js
- NestJS 11
- TypeScript
- Prisma ORM 7
- PostgreSQL
- JWT
- Passport
- bcrypt
- class-validator
- class-transformer

## Inteligencia Artificial

- Python
- FastAPI
- Uvicorn
- Pydantic
- HTTPX
- Google Gemini
- análisis de texto e imágenes

## Infraestructura

- Docker
- Docker Compose
- PostgreSQL 17 Alpine
- persistencia mediante volumen Docker

---

# Funcionalidades implementadas

## Autenticación y seguridad

CIVIA cuenta con un flujo completo de autenticación.

- Registro de usuarios.
- Inicio de sesión.
- Normalización de correo electrónico.
- Contraseñas protegidas mediante `bcrypt`.
- Generación de JWT.
- Restauración de sesión en el móvil.
- Rutas protegidas mediante `JwtAuthGuard`.
- Validación de usuarios activos.
- Separación de permisos por rol.
- Variables sensibles almacenadas fuera del repositorio mediante archivos `.env`.

### Roles generales

```text
USER
GLOBAL_ADMIN
```

### Roles dentro de una organización

```text
MEMBER
STAFF
ADMIN
```

El rol `GLOBAL_ADMIN` administra CIVIA a nivel de plataforma.

Los roles `MEMBER`, `STAFF` y `ADMIN` corresponden a una membresía dentro de una organización específica.

---

# Organizaciones

CIVIA está diseñada como una plataforma **multi-organización**.

Se implementaron:

- organizaciones públicas;
- organizaciones privadas;
- membresías;
- invitaciones;
- administración de miembros;
- departamentos;
- categorías;
- personal autorizado;
- administración global de organizaciones.

Una organización puede definir sus propias categorías y departamentos sin afectar las configuraciones de las demás.

### Organizaciones públicas

Permiten un acceso más abierto según las reglas definidas por la plataforma.

### Organizaciones privadas

Pueden controlar el ingreso de usuarios mediante invitaciones y membresías.

---

# Gestión de reportes

El módulo de reportes permite:

- crear reportes;
- consultar reportes propios;
- consultar reportes dentro de una organización;
- editar reportes mientras su estado lo permita;
- cancelar reportes;
- adjuntar fotografías;
- visualizar evidencias protegidas;
- consultar el detalle completo;
- asignar departamentos;
- asignar responsables;
- cambiar estados;
- consultar historial de seguimiento.

## Estados implementados

```text
RECEIVED
UNDER_REVIEW
ASSIGNED
IN_PROGRESS
RESOLVED
NOT_APPLICABLE
REJECTED
CANCELLED
```

El backend controla las transiciones válidas y evita cambios incompatibles con el estado actual del reporte.

---

# Evidencias

Los reportes pueden incluir fotografías como evidencia.

Se implementó:

- selección de imágenes desde el dispositivo;
- almacenamiento de la evidencia en el backend;
- registro de metadata en PostgreSQL;
- asociación entre evidencia y reporte;
- acceso protegido mediante JWT;
- miniaturas dentro del detalle del reporte;
- visualización ampliada de fotografías;
- acceso administrativo a evidencias según permisos.

Los archivos no se exponen como recursos públicos sin validación.

---

# Inteligencia Artificial de CIVIA

Una de las principales características de CIVIA es el sistema de **sugerencia inteligente de clasificación de incidencias**.

La IA funciona mediante un microservicio separado desarrollado con FastAPI.

## Flujo del análisis

```text
Usuario escribe la descripción
          │
          ├── Puede adjuntar fotografías
          │
          ▼
Aplicación móvil
          │
          ▼
NestJS
          │
          ├── valida JWT
          ├── valida membresía
          ├── consulta categorías activas
          │
          ▼
FastAPI
          │
          ▼
Google Gemini
          │
          ▼
Clasificación CIVIA
          │
          ├── problema detectado
          ├── dominio
          ├── prioridad
          ├── categoría sugerida
          ├── confianza de detección
          └── coincidencia con categoría
          │
          ▼
NestJS valida la respuesta
          │
          ▼
Aplicación móvil
```

---

## Análisis multimodal

CIVIA puede combinar:

- texto;
- evidencia visual.

El microservicio admite hasta **3 imágenes por análisis** en los formatos:

```text
image/jpeg
image/png
image/webp
```

Esto permite que una fotografía ayude a interpretar mejor una descripción ambigua.

Ejemplo:

```text
Descripción:
"Hay algo peligroso en la calle"

Fotografía:
cables colgando sobre la vía

Resultado:
Problema detectado:
"Cables colgantes y peligrosos en vía pública"
```

---

## Clasificación basada en categorías reales

La IA no recibe categorías genéricas definidas únicamente en el prompt.

NestJS consulta las categorías activas de la organización y las envía al microservicio.

Cada candidato contiene:

```text
id
name
description
department_id
department_name
```

Después de recibir la respuesta de Gemini, NestJS vuelve a validar que el `suggested_category_id` realmente exista dentro de la organización.

De esta forma se evita confiar ciegamente en la salida del modelo.

Si ninguna categoría representa correctamente el incidente, CIVIA puede utilizar:

```text
Otro / No estoy seguro
```

en lugar de forzar una clasificación incorrecta.

---

## Niveles de confianza

CIVIA maneja dos valores distintos.

### Detection Confidence

Indica qué tan segura está la IA de haber identificado correctamente el problema.

Ejemplo:

```text
95 % de detección
```

### Category Match Confidence

Indica qué tan bien coincide el problema identificado con una categoría disponible en la organización.

Ejemplo:

```text
Problema detectado: 95 %
Coincidencia con categoría: 50 %
```

Esto significa que la IA puede comprender claramente el problema aunque la organización todavía no tenga una categoría específica para él.

---

## Prioridad

La IA puede sugerir:

```text
LOW
MEDIUM
HIGH
```

La prioridad forma parte del análisis y puede almacenarse posteriormente junto con el reporte.

---

## Tolerancia a fallos de Gemini

El proveedor de IA implementa manejo de errores temporales.

Se consideran recuperables códigos como:

```text
429
500
502
503
504
```

CIVIA puede:

1. reintentar una solicitud;
2. esperar brevemente antes del siguiente intento;
3. probar modelos Gemini alternativos compatibles;
4. devolver un error controlado si ningún modelo responde.

La aplicación no obliga al usuario a depender de la IA.

Si la sugerencia no está disponible, el reporte todavía puede completarse mediante selección manual de categoría.

---

# Persistencia del análisis de IA

La IA no es únicamente una respuesta temporal de la interfaz.

Se creó el modelo:

```text
ReportAiAnalysis
```

con relación **uno a uno** con `Report`.

Este modelo permite conservar:

- problema detectado;
- dominio;
- tipo de problema;
- prioridad;
- confianza de detección;
- coincidencia con categoría;
- confianza general;
- categoría sugerida;
- departamento sugerido;
- categoría seleccionada al enviar el reporte;
- modelo de IA utilizado;
- modo de clasificación;
- aceptación o modificación de la sugerencia;
- fecha del análisis.

Esto permite comparar:

```text
Lo que sugirió CIVIA
          VS
Lo que finalmente seleccionó el usuario
```

sin alterar el reporte original.

---

# Base de datos

PostgreSQL es la base de datos principal.

Prisma se utiliza como ORM para definir el esquema, relaciones, migraciones y consultas desde NestJS.

## Modelos principales

```text
User
Organization
Membership
Invitation
Department
Category
Report
ReportAiAnalysis
ReportAttachment
ReportStatusHistory
```

### Relaciones principales

```text
User
 ├── Membership ── Organization
 │                    ├── Department
 │                    └── Category
 │
 └── Report
       ├── ReportAiAnalysis
       ├── ReportAttachment
       └── ReportStatusHistory
```

Las relaciones permiten conocer:

- quién creó un reporte;
- a qué organización pertenece;
- cuál es su categoría;
- departamento responsable;
- usuario asignado;
- evidencias;
- historial;
- análisis realizado por CIVIA.

---

# Paneles administrativos

## Administrador de organización

Un usuario autorizado puede:

- consultar reportes de su organización;
- abrir el detalle de un reporte;
- visualizar evidencias;
- gestionar departamentos;
- gestionar categorías;
- gestionar miembros;
- gestionar invitaciones;
- asignar reportes;
- actualizar el estado de una incidencia.

## Administrador global

El `GLOBAL_ADMIN` puede administrar la plataforma a un nivel superior y gestionar organizaciones sin necesitar una membresía interna en cada una.

---

# Estructura del repositorio

```text
civia/
│
├── mobile/
│   ├── app/
│   ├── components/
│   ├── contexts/
│   └── services/
│
├── backend/
│   ├── prisma/
│   ├── src/
│   │   ├── ai/
│   │   ├── auth/
│   │   ├── health/
│   │   ├── invitations/
│   │   ├── organizations/
│   │   ├── prisma/
│   │   └── reports/
│   └── test/
│
├── ai-service/
│   ├── app/
│   │   ├── main.py
│   │   ├── hybrid_classifier.py
│   │   ├── online_provider.py
│   │   └── schemas.py
│   └── tests/
│
├── docker-compose.yml
└── README.md
```

---

# Configuración del entorno

## Requisitos

Para ejecutar CIVIA localmente se recomienda tener:

- Git
- Node.js + npm
- Python 3
- Docker Desktop
- Android Studio / Android Emulator o un dispositivo físico
- Expo Go o entorno de desarrollo Expo

---

# 1. Clonar el repositorio

```bash
git clone https://github.com/adal-carcamo08/civia.git
cd civia
```

Durante el desarrollo algunas funcionalidades pueden encontrarse primero en ramas de trabajo antes de su integración final.

---

# 2. Base de datos PostgreSQL

Actualmente Docker Compose se utiliza para levantar PostgreSQL.

```bash
docker compose up -d postgres
```

Verificar:

```bash
docker compose ps
```

Configuración local:

```text
Host: 127.0.0.1
Puerto: 15433
Base de datos: civia
Usuario: civia_user
```

---

# 3. Backend NestJS

```bash
cd backend
npm install
```

Crear:

```text
backend/.env
```

tomando como referencia:

```text
backend/.env.example
```

Ejemplo:

```env
DATABASE_URL=postgresql://civia_user:civia_password@localhost:15433/civia?schema=public

JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d

GLOBAL_ADMIN_EMAIL=superadmin@example.com
GLOBAL_ADMIN_PASSWORD=replace_with_a_secure_password
GLOBAL_ADMIN_NAME=Super Administrador CIVIA

AI_SERVICE_URL=http://127.0.0.1:8001
```

Generar Prisma:

```bash
npx prisma generate
```

Aplicar migraciones:

```bash
npx prisma migrate deploy
```

Iniciar backend:

```bash
npm run start:dev
```

API:

```text
http://127.0.0.1:3000
```

---

# 4. Microservicio de IA

```bash
cd ai-service
python -m venv .venv
```

### Windows PowerShell

```powershell
.\.venv\Scripts\Activate.ps1
```

Instalar dependencias:

```bash
pip install -r requirements.txt
```

Crear:

```text
ai-service/.env
```

tomando como referencia:

```text
ai-service/.env.example
```

Configuración:

```env
AI_ONLINE_ENABLED=true
GEMINI_API_KEY=YOUR_API_KEY
GEMINI_MODEL=gemini-3.5-flash-lite
CIVIA_FORCE_LOCAL_AI=false
```

> Nunca se debe subir una API key real al repositorio.

Levantar FastAPI:

```bash
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

Health check:

```text
http://127.0.0.1:8001/health
```

---

# 5. Aplicación móvil

```bash
cd mobile
npm install
```

Crear un archivo:

```text
mobile/.env.local
```

## Android Emulator

```env
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000
```

## Dispositivo físico

Utilizar la IP LAN de la computadora.

Ejemplo:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.100:3000
```

Iniciar Expo:

```bash
npx expo start -c
```

Para Android Emulator:

```text
a
```

---

# Servicios necesarios

Para ejecutar CIVIA completamente se utilizan:

| Servicio | Puerto | Función |
|---|---:|---|
| PostgreSQL | `15433` | Persistencia |
| NestJS | `3000` | API, seguridad y lógica |
| FastAPI | `8001` | Inteligencia Artificial |
| Expo / Metro | `8081` normalmente | Aplicación móvil |

El flujo de autenticación puede funcionar sin el microservicio de IA, pero la opción **Analizar con CIVIA** requiere FastAPI y acceso a Gemini.

---

# Pruebas

## Backend

```bash
cd backend
npm run build
npm test -- --runInBand
```

Durante la integración de IA se validó una suite de:

```text
75 pruebas unitarias aprobadas de 75
```

También existe configuración para:

```bash
npm run test:e2e
```

La configuración E2E debe validarse nuevamente en el entorno final después de integrar todas las ramas y versiones de dependencias.

## Microservicio de IA

```bash
cd ai-service
pytest
```

---

# Seguridad

Medidas implementadas:

- hash de contraseñas con bcrypt;
- JWT;
- rutas protegidas;
- validación por rol;
- validación de membresías;
- separación entre `GLOBAL_ADMIN` y roles internos;
- validación de categorías sugeridas por IA;
- evidencias protegidas;
- validaciones mediante DTO;
- secretos fuera del repositorio;
- archivos `.env` ignorados por Git.

---

# Equipo

El desarrollo se realizó de forma colaborativa por un equipo de cinco integrantes.

| Integrante | Área principal |
|---|---|
| **Fernando José López Domínguez** | Base de Datos, Inteligencia Artificial y Coordinación |
| **Luis Felipe Cuadra Cruz** | Backend y Seguridad |
| **Adal Isaac Cárcamo Sánchez** | UX/UI y Frontend |
| **Jeremias Vladimir Chavez Rodriguez** | Análisis Funcional y QA |
| **Rodrigo Josué Calixto López** | Backend e Infraestructura |

## Aportes principales del desarrollo

### Fernando José López Domínguez

Trabajo concentrado especialmente en:

- estructura y evolución de PostgreSQL/Prisma;
- integración de `ReportAiAnalysis`;
- migración para persistencia del análisis;
- microservicio FastAPI;
- integración con Google Gemini;
- análisis multimodal de texto + imágenes;
- niveles de confianza y prioridad;
- integración NestJS ↔ FastAPI;
- validación de categorías sugeridas;
- persistencia y trazabilidad de la IA;
- correcciones de evidencias protegidas;
- integración de detalle de reportes dentro de organizaciones;
- pruebas y estabilización de la integración de IA;
- coordinación técnica del proyecto.

### Adal Isaac Cárcamo Sánchez

Trabajo concentrado especialmente en UX/UI, aplicación móvil e integración de los flujos principales:

- inicialización de la aplicación React Native/Expo;
- splash y navegación;
- login y registro;
- flujo de organizaciones;
- exploración de organizaciones;
- invitaciones;
- creación de reportes;
- fotografía/evidencias;
- listado de reportes;
- detalle de reportes;
- selector de categorías;
- perfil;
- navegación principal;
- administración de organizaciones;
- panel administrativo;
- gestión de miembros, categorías y departamentos;
- administración global;
- evolución y compatibilidad de Expo SDK.

### Luis Felipe Cuadra Cruz

Área principal asignada:

- backend;
- seguridad;
- autenticación;
- autorización;
- revisión de permisos;
- validaciones y protección de endpoints.

### Jeremias Vladimir Chavez Rodriguez

Área principal asignada:

- análisis funcional;
- QA;
- validación de flujos;
- casos de prueba;
- comprobación de requerimientos;
- evidencia funcional del sistema.

### Rodrigo Josué Calixto López

Área principal asignada:

- backend;
- infraestructura;
- Docker;
- despliegue y reproducibilidad del entorno;
- apoyo en la preparación de la infraestructura final.

> Algunas funcionalidades se desarrollaron de forma colaborativa y pasaron por varias ramas, pruebas y correcciones antes de su integración.

---

# Flujo completo de un reporte

```text
1. Usuario inicia sesión
          ↓
2. Selecciona una organización
          ↓
3. Crea un reporte
          ↓
4. Escribe descripción
          ↓
5. Adjunta fotografías opcionales
          ↓
6. Solicita "Analizar con CIVIA"
          ↓
7. NestJS valida usuario y organización
          ↓
8. FastAPI + Gemini analizan el incidente
          ↓
9. CIVIA sugiere categoría y prioridad
          ↓
10. Usuario acepta o cambia la categoría
          ↓
11. Se crea el reporte
          ↓
12. Se almacenan evidencias
          ↓
13. Se guarda ReportAiAnalysis
          ↓
14. La organización revisa el reporte
          ↓
15. Se asigna responsable
          ↓
16. El estado evoluciona
          ↓
17. Usuario consulta seguimiento
```

---

# Decisiones técnicas importantes

## ¿Por qué NestJS y FastAPI separados?

NestJS concentra:

- autenticación;
- organizaciones;
- permisos;
- reportes;
- persistencia.

FastAPI concentra:

- integración con Gemini;
- procesamiento multimodal;
- contrato de clasificación.

Esto reduce el acoplamiento y permite evolucionar la IA sin reescribir el backend principal.

## ¿Por qué PostgreSQL?

El proyecto necesita relaciones claras entre:

- usuarios;
- organizaciones;
- membresías;
- reportes;
- departamentos;
- categorías;
- historial.

PostgreSQL ofrece una estructura relacional adecuada para estas necesidades.

## ¿Por qué Prisma?

Prisma proporciona:

- esquema centralizado;
- migraciones;
- relaciones tipadas;
- cliente TypeScript;
- integración directa con NestJS.

## ¿Por qué la IA no decide la categoría final?

CIVIA funciona como **asistente**.

La IA recomienda, pero el usuario conserva la capacidad de modificar la selección antes de enviar.

Esto permite utilizar IA sin quitar control a la persona que conoce el contexto del incidente.

---

# Estado actual

Actualmente se encuentran implementados los componentes principales de CIVIA:

- aplicación móvil;
- autenticación;
- organizaciones;
- membresías;
- invitaciones;
- reportes;
- administración;
- PostgreSQL;
- Prisma;
- evidencias;
- seguimiento;
- integración de Inteligencia Artificial;
- análisis multimodal;
- persistencia de análisis;
- pruebas unitarias del backend.

## Trabajo de cierre

Antes de considerar una versión de producción todavía deben revisarse de forma conjunta:

- integración final de ramas;
- pruebas E2E completas;
- Dockerización integral de todos los servicios;
- configuración final de infraestructura;
- Kubernetes si se incluye en la entrega;
- documentación definitiva;
- pruebas en múltiples equipos/dispositivos;
- manejo de credenciales y secretos para producción.

---

# Variables de entorno

Los archivos reales `.env` **no deben subirse a GitHub**.

Se incluyen archivos `.env.example` para documentar las variables necesarias.

### Backend

```text
DATABASE_URL
JWT_SECRET
JWT_EXPIRES_IN
GLOBAL_ADMIN_EMAIL
GLOBAL_ADMIN_PASSWORD
GLOBAL_ADMIN_NAME
AI_SERVICE_URL
```

### CIVIA IA

```text
AI_ONLINE_ENABLED
GEMINI_API_KEY
GEMINI_MODEL
CIVIA_FORCE_LOCAL_AI
```

### Aplicación móvil

```text
EXPO_PUBLIC_API_URL
```

---

# Licencia y uso académico

CIVIA fue desarrollado como proyecto académico para la asignatura **Diseño y Programación de Software Multiplataforma**.

El repositorio contiene código, documentación y recursos creados con fines educativos y de demostración técnica.

---

## CIVIA

**Plataforma inteligente para gestión y seguimiento de incidencias.**
