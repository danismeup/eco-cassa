# Eco Cassa — Electron Desktop App

Applicazione desktop multipiattaforma composta da:
- Frontend: React + Vite
- Backend: ASP.NET Core (.NET 9)
- Desktop wrapper: Electron

---

## Prerequisiti

- Node.js (consigliato LTS): https://nodejs.org/
- npm (incluso con Node.js)
- .NET 9 SDK: https://dotnet.microsoft.com/download/dotnet/9.0
- Visual Studio 2022/2023 (opzionale, consigliato per il backend)

---

## Struttura del repository (esempio)

```
/
├─ Eco.Cassa.Api/
├─ eco.cassa.front/│   
│       └─ dist/           # build di Vite
├─ electron/
│   ├─ main.js
│   └─ preload.js
├─ assets/
│   └─ icon.ico (opzionale)
├─ package.json            # orchestrazione root
├─ README.md
└─ ...
```

---

## Installazione

1. **Clona il repository**

   ```sh
   git clone <repo-url>
   cd <nome-cartella-repo>
   ```

2. **Installa le dipendenze**

   - **Frontend**
     ```sh
     cd eco.cassa.front
     npm install
     cd ../..
     ```
   - **Electron (nella root)**
     ```sh
     npm install
     ```
   - **Backend**
     ```sh
     dotnet restore Eco.Cassa.Api/Eco.Cassa.Api.csproj
     ```

---

## Avvio in modalità sviluppo

Apri **tre terminali** distinti:

### 1. Avvia il backend (.NET)

```sh
dotnet run --project Eco.Cassa.Api/Eco.Cassa.Api.csproj
```

### 2. Avvia il frontend (Vite/React)

```sh
npm run dev --prefix eco.cassa.front
```

### 3. Avvia Electron

```sh
npm run start:electron
```

---

## Debug

- Il frontend React è servito da Vite su `localhost:5173` (di default).
- Le DevTools di Electron sono già abilitate in modalità sviluppo (`mainWindow.webContents.openDevTools()`).
- Il backend ascolta su `localhost:5000` (o la porta configurata).

---

## Build di produzione e packaging

### 1. Build del frontend

```sh
npm run build --prefix eco.cassa.front
```

### 2. Build del backend (opzionale)

```sh
dotnet publish Eco.Cassa.Api/Eco.Cassa.Api.csproj -c Release -o ./publish
```

### 3. Packaging dell’app desktop (.exe, .dmg, ecc.)

Assicurati che nel `package.json` root ci sia la sezione `"build"` per electron-builder.

Esegui:

```sh
npm run dist
```

Troverai il file eseguibile nella cartella `dist/`.

---

## Note utili

- **Configurazione Vite:** assicurati che in `vite.config.js` il campo `base` sia impostato a `'./'` per la build Electron.
- **Path dei file:** controlla che Electron punti al corretto `index.html` dopo il packaging.
- **Backend incluso:** se vuoi includere il backend nel package, configura `"extraResources"` in electron-builder.

---

## Link utili

- [Electron Quick Start](https://www.electronjs.org/docs/latest/tutorial/quick-start)
- [electron-builder](https://www.electron.build/)
- [Vite Documentation](https://vitejs.dev/)
- [.NET 9 Documentation](https://learn.microsoft.com/it-it/dotnet/core/whats-new/dotnet-9)

---

## Script utili (`package.json` root)

```json
{
  "scripts": {
    "start:backend": "dotnet run --project Eco.Cassa.Api/Eco.Cassa.Api.csproj",
    "start:frontend": "npm run dev --prefix eco.cassa.front",
    "start:electron": "electron electron/main.js",
    "build:frontend": "npm run build --prefix eco.cassa.front",
    "build:backend": "dotnet build Eco.Cassa.Api/Eco.Cassa.Api.csproj",
    "dist": "electron-builder"
  }
}
```

---

## Autore

- Daniele Oppezzo
- Licenza: MIT
