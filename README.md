# 📱 Apronovid Mobile

[![React Native](https://img.shields.io/badge/Framework-React%20Native-61DAFB?style=for-the-badge&logo=react)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Platform-Expo-000020?style=for-the-badge&logo=expo)](https://expo.dev/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Laravel](https://img.shields.io/badge/Backend-Laravel-FF2D20?style=for-the-badge&logo=laravel)](https://laravel.com/)
[![Accessibility](https://img.shields.io/badge/Accessibility-100%25-4CAF50?style=for-the-badge&logo=wechat)](https://reactnative.dev/docs/accessibility)

Una plataforma móvil inclusiva diseñada específicamente para **personas con discapacidad visual o ceguera**. **Apronovid Mobile** conecta a la comunidad a través del poder de los audios, permitiendo explorar colecciones históricas y realizar pedidos de lectura. Toda la interfaz fue construida desde cero priorizando la navegación por gestos y el soporte total para lectores de pantalla (TalkBack/VoiceOver).

---

## ✨ Características Principales

* **👁️‍🗨️ Accesibilidad Nativa:** Etiquetas semánticas, roles y estados dinámicos integrados en cada componente para garantizar una navegación 100% compatible con lectores de pantalla.
* **🎙️ Catálogo Público y Dinámico:** Explorá una amplia biblioteca de audios históricos y solicitudes comunitarias con búsquedas instantáneas y filtros avanzados, optimizados para feedback por voz.
* **🎧 Reproductor Integrado Inteligente:** Control inteligente de estados globales que garantiza que solo se reproduzca un audio a la vez, evitando superposiciones de sonido (algo vital cuando el usuario depende del audio del celular para navegar).
* **🔐 Inicio de Sesión Seguro y Rápido:** Acceso directo con Google (Google Sign-In) para evitar la tediosa carga manual de contraseñas mediante el teclado virtual.
* **📨 Buzón de Reportes (Panel Admin):** Espacio exclusivo para administradores donde se centralizan reportes de errores y sugerencias de la comunidad.

---

## 📸 Vista Previa (Screenshots)

| Catálogo de Audios | Pedido de Lectura (Perfil No Vidente) | Reproductor Accesible (Perfil Narrador) |
| :---: | :---: | :---: |
| ![Catálogo](https://i.postimg.cc/QCLgJvkZ/Captura-de-pantalla-2026-05-26-124929.png) | ![Pedir Lectura](https://i.postimg.cc/1tLxcRjz/Captura-de-pantalla-2026-05-26-125958.png) | ![Reproductor](https://i.postimg.cc/WbhywYFB/Captura-de-pantalla-2026-05-26-152658.png) |

---

## 🛠️ Detalles Técnicos y Arquitectura

### 💻 Stack Tecnológico
* **Móvil:** React Native con el flujo de trabajo de Expo (EAS Workflow).
* **Lenguaje:** TypeScript (Tipado estricto para garantizar la estabilidad).
* **Multimedia:** expo-av para el streaming y reproducción nativa de archivos de audio.
* **Estado Global:** React Context API para control de sesiones y roles (admin / oyente).
* **Accesibilidad:** Uso intensivo de la API de accesibilidad de React Native.
* **Cliente HTTP:** Axios configurado para comunicarse con la API REST en Laravel.

### 📂 Estructura del Código

    appronovid-mobile/
    ├── assets/               # Recursos visuales y logos
    ├── appronovid-backend/   # Backend (Proyecto Laravel)
    ├── src/
    │   ├── context/          # Gestión de estado global (Autenticación con Google)
    │   ├── features/         # Pantallas por módulos (Admin, Catálogo, Favoritos)
    │   ├── services/         # Cliente Axios y conexiones con la API
    │   ├── styles/           # Tema global (Alto contraste, tamaños de fuente)
    │   └── navigation/       # Navegación entre pantallas (Manejo de Tabs)
    ├── android/              # Archivos nativos para compilación local
    ├── app.json              # Configuración base de Expo
    └── eas.json              # Perfiles de compilación

---

## 📦 Guía de Compilación Nativa (Android)

Para evitar las limitaciones de la nube de Expo, este proyecto está configurado para compilarse localmente utilizando Gradle.

### ⚠️ Limpieza Manual (Importante)
Por conflictos de caché con C++ en React Native, el comando de limpieza automática puede fallar. **Antes de compilar, limpiá a mano:**
1. Navegá a la carpeta `android/app/`.
2. Eliminá por completo las carpetas `build` y `.cxx`.

### 🚀 Generar APK de Producción (Release)
Genera el instalador optimizado usando la firma oficial:
    cd android
    ./gradlew assembleRelease
*(Ruta del archivo: android/app/build/outputs/apk/release/app-release.apk)*

### 🧪 Generar APK de Pruebas (Debug)
Genera una versión rápida firmada con la clave local de desarrollo:
    cd android
    ./gradlew assembleDebug
*(Ruta del archivo: android/app/build/outputs/apk/debug/app-debug.apk)*

---

## 🔐 Google Sign-In (SHA-1)

Para que la autenticación con Google funcione en los archivos instalables, es obligatorio cargar las huellas del certificado en tu consola de Firebase / Google Cloud:
* **Huellas de Producción:** Extraídas del Keystore oficial.
* **Huellas de Debug:** Extraídas del entorno local.

---

## 👨‍💻 Autor

Desarrollado por **Iván Calcagno** (Jano).  
*Full-Stack Developer enfocado en crear soluciones tecnológicas que aporten valor real.*
