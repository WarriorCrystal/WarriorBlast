# Publicar e instalar Warrior Blast

El juego es una **PWA**: una web que se instala como app y funciona sin conexión.
Solo hace falta subir la carpeta `dist/` a un hosting estático gratuito con **HTTPS**
(obligatorio para que funcione el modo offline).

## 1. Generar la versión final

```bash
npm install
```

```bash
npm test
```

```bash
npm run build
```

El resultado queda en `dist/`. Puedes probarlo en tu PC con `npm run preview`.

## 2. Publicar (elige una opción)

### Opción A — Netlify Drop (la más fácil, sin cuentas técnicas)
1. Entra en https://app.netlify.com/drop y crea una cuenta gratuita.
2. Arrastra la carpeta **`dist`** a la página.
3. Te da una dirección tipo `https://nombre-raro.netlify.app`. En *Site settings → Change site name* puedes ponerle `warrior-blast`.
4. Para actualizar: vuelve a hacer `npm run build` y arrastra `dist` otra vez en la pestaña *Deploys*.

### Opción B — GitHub Pages (se actualiza sola con cada cambio)
1. Crea un repositorio en GitHub y sube el proyecto:
   ```bash
   git remote add origin https://github.com/TU_USUARIO/warrior-blast.git
   ```
   ```bash
   git push -u origin main
   ```
2. En GitHub: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
3. El workflow incluido (`.github/workflows/deploy.yml`) compila, pasa los tests y publica.
   La dirección será `https://TU_USUARIO.github.io/warrior-blast/`.

### Opción C — Cloudflare Pages
1. https://pages.cloudflare.com → *Create a project* → conecta el repositorio de GitHub
   (o usa *Direct Upload* y sube `dist`).
2. Build command: `npm run build` · Output directory: `dist`.

> Las rutas del juego son relativas, así que funciona igual en la raíz de un dominio o en una subcarpeta.

## 3. Instalar en el móvil

Comparte la dirección con tus amigos. La primera vez hay que abrirla **con conexión**;
después funciona sin internet.

### Android (Chrome)
1. Abre el enlace en **Chrome**.
2. Toca el menú **⋮** → **Instalar aplicación** (o "Añadir a pantalla de inicio").
3. Aparece el icono de Warrior Blast; se abre a pantalla completa y en vertical.

### iPhone / iPad (Safari)
1. Abre el enlace en **Safari** (en iOS 16.4+ también sirve Chrome).
2. Toca **Compartir** (cuadrado con flecha) → **Añadir a pantalla de inicio** → **Añadir**.
3. Ábrelo desde el icono. El sonido empieza tras el primer toque (es una norma de iOS).
   iPhone no tiene API de vibración para webs, así que la vibración solo funciona en Android.

### Actualizaciones
Cuando publiques una versión nueva, al abrir el juego aparece **"Nueva versión disponible → Actualizar"**.
El progreso se guarda en el propio teléfono y se conserva entre versiones (guardado con versión de esquema).
Ojo: si alguien borra los datos del navegador/app, pierde su progreso.

## 4. (Opcional) APK de Android con Capacitor

Solo si quieres un `.apk` para pasar por WhatsApp/Drive. Necesitas **Android Studio**
(https://developer.android.com/studio).

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

```bash
npx cap init "Warrior Blast" com.warriorblast.app --web-dir=dist
```

```bash
npm run build
```

```bash
npx cap add android
```

```bash
npx cap sync android
```

```bash
npx cap open android
```

En Android Studio: *Build → Build App Bundle(s) / APK(s) → Build APK(s)*. El APK queda en
`android/app/build/outputs/apk/debug/app-debug.apk`. Para instalarlo, tus amigos deben permitir
"instalar apps de origen desconocido". Tras cada cambio: `npm run build` y `npx cap sync android`.

> En iPhone no se puede instalar una app fuera de la App Store sin cuenta de desarrollador de Apple;
> para iPhone la PWA es la vía recomendada.
