const { contextBridge, ipcRenderer } = require('electron');
const fs = require('fs');
const path = require('path');

const jsonDir = process.env.NODE_ENV === 'development'
  ? path.join(__dirname, 'json') // Use the local json folder in development
  : path.join(ipcRenderer.invoke('get-user-data-path'), 'json'); // Use the userData/json folder in production

contextBridge.exposeInMainWorld('api', {
  loadRollTables: () => {
    const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
    return files.map(file => {
      const content = fs.readFileSync(path.join(jsonDir, file), 'utf-8');
      return { name: file, data: JSON.parse(content) };
    });
  },
  saveRollTable: (tableData) => ipcRenderer.invoke('save-roll-table', tableData),
  updateRollTable: (index, tableData) => ipcRenderer.invoke('update-roll-table', index, tableData),
  deleteRollTable: (index) => ipcRenderer.invoke('delete-roll-table', index),
  getRollTableList: () => {
    const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
    return files.map(file => {
      const content = fs.readFileSync(path.join(jsonDir, file), 'utf-8');
      const data = JSON.parse(content);
      return { id: data._id || file, name: data.name || file };
    });
  },
  loadRollTableById: (documentId) => {
    const filePath = path.join(__dirname, 'json', documentId);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    }
    throw new Error(`Roll table with ID ${documentId} not found`);
  },
  importRollTable: (filePath) => ipcRenderer.invoke('import-roll-table', filePath),
});
