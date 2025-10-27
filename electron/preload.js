const { contextBridge, ipcRenderer } = require('electron');

const allowedChannels = [
    'update-available',
    'update-downloaded',
    'update-error',
    'update-progress',
    'update-not-available',
    'update-checking'
];

contextBridge.exposeInMainWorld('electronAPI', {
    // invoke returns a Promise with a result object
    checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    // Subscribe to update events from main; only allow whitelisted channels
    onUpdate: (channel, listener) => {
        if (!allowedChannels.includes(channel)) return;
        ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
    onceUpdate: (channel, listener) => {
        if (!allowedChannels.includes(channel)) return;
        ipcRenderer.once(channel, (event, ...args) => listener(...args));
    }
});

console.log('preload loaded');