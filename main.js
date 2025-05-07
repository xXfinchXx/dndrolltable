/**
 * Main Electron process for the DnD Roll Tables application.
 * Handles application lifecycle events, window creation, and IPC communication
 * for managing roll tables and interacting with the file system.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
const userDataPath = app.getPath('userData'); // Get the user-specific data directory
const isDevelopment = process.env.NODE_ENV === 'development'; // Check if running in development mode
const jsonDir = isDevelopment
  ? path.join(__dirname, 'json') // Use the local json folder in development
  : path.join(userDataPath, 'json'); // Use the userData/json folder in production

app.on('ready', () => {
  try {
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true }); // Ensure the JSON directory exists
    }

    // Copy contents of the `json` folder to `userData/json` if not already copied
    const sourceJsonDir = path.join(__dirname, 'json');
    if (fs.existsSync(sourceJsonDir)) {
      const files = fs.readdirSync(sourceJsonDir).filter(file => file.endsWith('.json'));
      files.forEach(file => {
        const sourceFile = path.join(sourceJsonDir, file);
        const destFile = path.join(jsonDir, file);
        if (!fs.existsSync(destFile)) {
          fs.copyFileSync(sourceFile, destFile); // Copy file if it doesn't already exist
        }
      });
    }

    mainWindow = new BrowserWindow({
      width: 800,
      height: 800,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: true,
      },
      autoHideMenuBar: true // Hide the default menu bar
    });

    mainWindow.loadFile('index.html');
  } catch (error) {
    console.error('Error during app initialization:', error);
  }
});

ipcMain.handle('save-roll-table', (event, tableData) => {
  tableData._id = tableData._id || `roll-table-${Date.now()}`; // Ensure _id is set
  const filePath = path.join(jsonDir, `${tableData._id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(tableData, null, 2)); // Save the table data to the file
  return filePath;
});

ipcMain.handle('delete-roll-table', (event, index) => {
  const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
  if (files[index]) {
    const filePath = path.join(jsonDir, files[index]);
    fs.unlinkSync(filePath); // Delete the file
    return true;
  }
  throw new Error('Roll table not found');
});

ipcMain.handle('update-roll-table', (event, index, tableData) => {
  const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
  if (files[index]) {
    const filePath = path.join(jsonDir, files[index]);
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

    const newFilePath = path.join(jsonDir, `imported-${Date.now()}.json`);
    fs.writeFileSync(newFilePath, JSON.stringify(transformedTable, null, 2));
    return newFilePath;
  }
  throw new Error('File not found');
});

ipcMain.handle('get-user-data-path', () => userDataPath);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
