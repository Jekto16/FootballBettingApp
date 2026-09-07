const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('footballModelAPI', {
    estimate: (payload) =>
        ipcRenderer.invoke('football-model:estimate', payload),

    getLeagueSummary: (leagueKey) =>
        ipcRenderer.invoke('football-model:league-summary', leagueKey),

    getLeagueTeams: (leagueKey) =>
        ipcRenderer.invoke('football-model:league-teams', leagueKey),

    getLeagues: () =>
        ipcRenderer.invoke('football-model:leagues')
});
