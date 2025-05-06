const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

app.on('ready', () => {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
    },
  });

  mainWindow.loadFile('index.html');
});

ipcMain.handle('save-roll-table', (event, tableData) => {
  tableData._id = tableData._id || `roll-table-${Date.now()}`; // Ensure _id is set
  const filePath = path.join(__dirname, 'json', `${tableData._id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tableData, null, 2)); // Save the table data to the file
  return filePath;
});

ipcMain.handle('delete-roll-table', (event, index) => {
  const dir = path.join(__dirname, 'json');
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
  if (files[index]) {
    const filePath = path.join(dir, files[index]);
    fs.unlinkSync(filePath); // Delete the file
    return true;
  }
  throw new Error('Roll table not found');
});

ipcMain.handle('update-roll-table', (event, index, tableData) => {
  const dir = path.join(__dirname, 'json');
  const files = fs.readdirSync(dir).filter(file => file.endsWith('.json'));
  if (files[index]) {
    const filePath = path.join(dir, files[index]);
    tableData._id = tableData._id || path.basename(filePath, '.json'); // Ensure _id matches the file name
    fs.writeFileSync(filePath, JSON.stringify(tableData, null, 2)); // Update the file with new data
    return true;
  }
  throw new Error('Roll table not found');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
