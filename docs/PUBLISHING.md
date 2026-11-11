# Publishing and installing Warrior Blast

The game is a **PWA**: a website that installs as an app and works offline.
All you need is to host the `dist/` folder on a free static host with **HTTPS**
(required for offline mode to work).

## 1. Build the production version

```bash
npm install
```

```bash
npm test
```

```bash
npm run build
```

The output is in `dist/`. You can try it on your PC with `npm run preview`.

## 2. Publish (pick one option)

### Option A — GitHub Pages (recommended, updates itself on every push)
1. Create a repository on GitHub and push the project:
   ```bash
   git remote add origin https://github.com/YOUR_USER/WarriorBlast.git
   ```
   ```bash
   git push -u origin main
   ```
2. On GitHub: *Settings → Pages → Build and deployment → Source: **GitHub Actions***.
3. The included workflow (`.github/workflows/deploy.yml`) runs the tests, builds and publishes on every push to `main`.
   The address will be `https://YOUR_USER.github.io/WarriorBlast/`.

### Option B — Netlify Drop (easiest, no technical setup)
1. Go to https://app.netlify.com/drop and create a free account.
2. Drag the **`dist`** folder onto the page.
3. You get an address like `https://random-name.netlify.app`. Under *Site settings → Change site name* you can rename it to `warrior-blast`.
4. To update: run `npm run build` again and drag `dist` onto the *Deploys* tab.

### Option C — Cloudflare Pages
1. https://pages.cloudflare.com → *Create a project* → connect the GitHub repository
   (or use *Direct Upload* and upload `dist`).
2. Build command: `npm run build` · Output directory: `dist`.

> The game's paths are relative, so it works the same at the root of a domain or in a subfolder.

## 3. Installing on a phone

Share the address with your friends. The first visit must be **online**;
after that it works without internet.

### Android (Chrome)
1. Open the link in **Chrome**.
2. Tap the **⋮** menu → **Install app** (or "Add to Home screen").
3. The Warrior Blast icon appears; it opens full screen and in portrait.

### iPhone / iPad (Safari)
1. Open the link in **Safari** (on iOS 16.4+ Chrome also works).
2. Tap **Share** (square with an arrow) → **Add to Home Screen** → **Add**.
3. Open it from the icon. Sound starts after the first tap (an iOS rule).
   iPhone has no vibration API for websites, so vibration only works on Android.

### Updates
Updates are automatic. After you push a new version, the game downloads it in the background,
activates it and reloads on its own (it also checks for a new version every hour while open).
Progress is stored on the player's device and survives updates (the save has a schema version).
Note: if someone clears their browser/app data, they lose their progress.

## 4. (Optional) Android APK with Capacitor

Only if you want an `.apk` to share via WhatsApp/Drive. You need **Android Studio**
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

In Android Studio: *Build → Build App Bundle(s) / APK(s) → Build APK(s)*. The APK ends up at
`android/app/build/outputs/apk/debug/app-debug.apk`. To install it, your friends must allow
"install apps from unknown sources". After every change: `npm run build` and `npx cap sync android`.

> On iPhone you can't install an app outside the App Store without an Apple developer account;
> for iPhone the PWA is the recommended route.
