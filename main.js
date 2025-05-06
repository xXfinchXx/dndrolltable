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
    autoHideMenuBar: true // Hide the default menu bar
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

ipcMain.handle('import-roll-table', (event, filePath) => {
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const importedTable = JSON.parse(fileContent);

    // Transform Foundry VTT roll table format to the app's format
    const transformedTable = {
      name: importedTable.name || 'Imported Roll Table',
      description: importedTable.description || '',
      formula: importedTable.formula || '1d20',
      results: importedTable.results.map(result => ({
        text: result.text,
        range: result.range || [1, 1],
        weight: result.weight || 1,
        drawn: false,
      })),
    };

    const newFilePath = path.join(__dirname, 'json', `imported-${Date.now()}.json`);
    fs.writeFileSync(newFilePath, JSON.stringify(transformedTable, null, 2));
    return newFilePath;
  }
  throw new Error('File not found');
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
