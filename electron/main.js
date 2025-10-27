const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const url = require('url');
const log = require('electron-log');

log.transports.file.level = 'info';

let mainWindow;

function createWindow() {
    // preload guard
    const preloadPath = path.join(__dirname, 'preload.js');
    const usePreload = fs.existsSync(preloadPath) ? preloadPath : undefined;

    // determine index file for production
    const isDev = !app.isPackaged;
    let indexPath;
    if (isDev) {
        indexPath = 'http://localhost:5173';
    } else {
        // adjust the path according to how you included the frontend in the package
        // this matches the path shown in your console earlier
        indexPath = path.join(__dirname, '..', 'eco.cassa.front', 'eco.cassa.front', 'dist', 'index.html');
        // also try a simpler variant if the above is not present
        if (!fs.existsSync(indexPath)) {
            const alt = path.join(__dirname, '..', 'eco.cassa.front', 'dist', 'index.html');
            if (fs.existsSync(alt)) indexPath = alt;
        }
    }

    console.log('isDev =', isDev);
    console.log('preloadPath =', preloadPath, 'exists =', fs.existsSync(preloadPath));
    console.log('indexPath =', indexPath, 'exists =', fs.existsSync(indexPath));

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        icon: path.join(__dirname, '..', 'assets', 'icon.ico'),
        webPreferences: {
            contextIsolation: true,
            nodeIntegration: false,
            preload: usePreload,
        },
    });

    if (isDev) {
        mainWindow.loadURL(indexPath);
        mainWindow.webContents.openDevTools();
    } else {
        // convert to a file:// URL (works reliably inside asar/unpacked)
        const indexUrl = url.pathToFileURL(indexPath).toString();
        mainWindow.loadURL(indexUrl);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Single whenReady call (creates window and wires updater)
app.whenReady().then(() => {
    createWindow();

    // Wire autoUpdater events to renderer (if present)
    autoUpdater.on('checking-for-update', () => {
        if (mainWindow?.webContents) mainWindow.webContents.send('update-checking');
    });

    autoUpdater.on('update-available', (info) => {
        if (mainWindow?.webContents) mainWindow.webContents.send('update-available', info);

        // Ask user if they want to download now (dialog parent = window)
        const response = dialog.showMessageBoxSync(mainWindow, {
            type: 'info',
            buttons: ['Aggiorna ora', 'Più tardi'],
            defaultId: 0,
            message: 'È disponibile una nuova versione dell\'app!',
            detail: 'Vuoi scaricare e installare l\'aggiornamento?'
        });
        if (response === 0) {
            autoUpdater.downloadUpdate();
        }
    });

    autoUpdater.on('update-not-available', (info) => {
        if (mainWindow?.webContents) mainWindow.webContents.send('update-not-available', info);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        if (mainWindow?.webContents) mainWindow.webContents.send('update-progress', progressObj);
    });

    autoUpdater.on('update-downloaded', (info) => {
        if (mainWindow?.webContents) mainWindow.webContents.send('update-downloaded', info);

        const response = dialog.showMessageBoxSync(mainWindow, {
            type: 'question',
            buttons: ['Riavvia ora', 'Più tardi'],
            defaultId: 0,
            message: 'Aggiornamento scaricato!',
            detail: 'L\'app verrà riavviata per installare l\'aggiornamento.'
        });
        if (response === 0) {
            // This will quit and install the update
            autoUpdater.quitAndInstall();
        }
    });

    autoUpdater.on('error', (err) => {
        if (mainWindow?.webContents) mainWindow.webContents.send('update-error', err?.toString?.() ?? String(err));
        dialog.showMessageBoxSync(mainWindow, {
            type: 'error',
            message: 'Errore durante l\'aggiornamento',
            detail: err == null ? "unknown" : (err.stack || err).toString()
        });
    });

    // Only check automatically in production
    if (app.isPackaged) {
        autoUpdater.checkForUpdatesAndNotify();
    }

    autoUpdater.logger = log;
    autoUpdater.logger.info('Checking updates, app version:', app.getVersion());
});

// Handle manual check from renderer with a promise result (ipc invoke)
ipcMain.handle('check-for-updates', async () => {
    return new Promise((resolve) => {
        let settled = false;
        const cleanup = () => {
            autoUpdater.removeListener('update-available', onAvailable);
            autoUpdater.removeListener('update-not-available', onNotAvailable);
            autoUpdater.removeListener('error', onError);
            clearTimeout(timer);
        };

        const onAvailable = (info) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve({ status: 'available', info });
        };
        const onNotAvailable = (info) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve({ status: 'not-available', info });
        };
        const onError = (err) => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve({ status: 'error', error: err == null ? 'unknown' : (err.stack || err).toString() });
        };

        // Wait up to 15s for a response
        const timer = setTimeout(() => {
            if (settled) return;
            settled = true;
            cleanup();
            resolve({ status: 'timeout' });
        }, 15000);

        autoUpdater.once('update-available', onAvailable);
        autoUpdater.once('update-not-available', onNotAvailable);
        autoUpdater.once('error', onError);

        // Start the check
        try {
            autoUpdater.checkForUpdates();
        } catch (err) {
            onError(err);
        }
    });
});

// Provide app version to renderer
ipcMain.handle('get-app-version', () => {
    return app.getVersion();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (mainWindow === null) createWindow();
});