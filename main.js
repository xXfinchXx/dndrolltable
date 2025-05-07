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

function validateAndFixJsonFiles() {
  const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
  files.forEach(file => {
    const filePath = path.join(jsonDir, file);
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      JSON.parse(content); // Validate JSON
    } catch (error) {
      console.error(`Invalid JSON in file ${file}. Fixing...`);
      const fixedContent = JSON.stringify({ name: "Untitled", description: "", formula: "1d20", results: [] }, null, 2);
      fs.writeFileSync(filePath, fixedContent); // Replace with a default valid JSON structure
    }
  });
}

function updateUserDataFiles() {
  const sourceJsonDir = path.join(__dirname, 'json');
  if (fs.existsSync(sourceJsonDir)) {
    const files = fs.readdirSync(sourceJsonDir).filter(file => file.endsWith('.json'));
    files.forEach(file => {
      const sourceFile = path.join(sourceJsonDir, file);
      const destFile = path.join(jsonDir, file);
      if (fs.existsSync(destFile)) {
        try {
          const sourceContent = JSON.parse(fs.readFileSync(sourceFile, 'utf-8'));
          const destContent = JSON.parse(fs.readFileSync(destFile, 'utf-8'));
          const updatedContent = { ...destContent, ...sourceContent }; // Merge source into destination
          fs.writeFileSync(destFile, JSON.stringify(updatedContent, null, 2));
        } catch (error) {
          console.error(`Error updating file ${file}:`, error);
        }
      } else {
        fs.copyFileSync(sourceFile, destFile); // Copy file if it doesn't already exist
      }
    });
  }
}

function removeDuplicateRollTables() {
  const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
  const tableMap = new Map();

  files.forEach(file => {
    const filePath = path.join(jsonDir, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      const tableName = content.name;

      if (tableMap.has(tableName)) {
        const existingFile = tableMap.get(tableName);
        const existingStats = fs.statSync(existingFile);
        const currentStats = fs.statSync(filePath);

        // Keep the newest file
        if (currentStats.mtime > existingStats.mtime) {
          fs.unlinkSync(existingFile); // Remove the older file
          tableMap.set(tableName, filePath);
        } else {
          fs.unlinkSync(filePath); // Remove the current file if it's older
        }
      } else {
        tableMap.set(tableName, filePath);
      }
    } catch (error) {
      console.error(`Error processing file ${file}:`, error);
    }
  });
}

app.on('ready', () => {
  try {
    if (!fs.existsSync(jsonDir)) {
      fs.mkdirSync(jsonDir, { recursive: true }); // Ensure the JSON directory exists
    }

    removeDuplicateRollTables(); // Remove duplicate roll tables
    validateAndFixJsonFiles(); // Validate and fix JSON files
    updateUserDataFiles(); // Update user data files

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
  tableData._id = tableData._id || `created-roll-table-${Date.now()}`; // Prefix with 'created-roll-table'
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

    return loadAllRollTables(); // Return the updated list of roll tables
  }
  throw new Error('File not found');
});

ipcMain.handle('delete-roll-table-by-name', (event, name) => {
  const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
  const fileToDelete = files.find(file => {
    const content = JSON.parse(fs.readFileSync(path.join(jsonDir, file), 'utf-8'));
    return content.name === name;
  });

  if (fileToDelete) {
    const filePath = path.join(jsonDir, fileToDelete);
    fs.unlinkSync(filePath); // Delete the file
    return true;
  }
  throw new Error(`Roll table with name "${name}" not found`);
});

function loadAllRollTables() {
  const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
  return files.map(file => {
    const filePath = path.join(jsonDir, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return { filePath, data: content };
  });
}

ipcMain.handle('get-user-data-path', () => userDataPath);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
