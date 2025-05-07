/**
 * Renderer process for the DnD Roll Tables application.
 * Manages the user interface, including creating, editing, and rolling on tables.
 * Handles interactions with the main process via IPC and updates the DOM dynamically.
 */
window.addEventListener('DOMContentLoaded', () => {
    const tablesContainer = document.getElementById('tables');
    const rollTableSelect = document.getElementById('rollTableSelect');
    const createTableBtn = document.getElementById('createTableBtn');
    const rollTables = window.api.loadRollTables();

    // Sort roll tables alphabetically by name
    rollTables.sort((a, b) => (a.data.name || '').localeCompare(b.data.name || ''));

    rollTables.forEach((table, index) => {
      const option = document.createElement('option');
      option.value = index;
      option.textContent = table.data.name || `Table ${index + 1}`;
      rollTableSelect.appendChild(option);
    });
  
    rollTableSelect.addEventListener('change', () => {
      const selectedTable = rollTables[rollTableSelect.value].data;
      displayTable(selectedTable, rollTableSelect.value);
    });
  
    createTableBtn.addEventListener('click', () => {
      const newTable = {
        name: 'New Roll Table',
        description: '',
        formula: '1d20',
        results: [],
      };
      const filePath = window.api.saveRollTable(newTable);
      alert(`New roll table created: ${filePath}`);
      location.reload(); // Reload to reflect the new table
    });
  
    function displayTable(table, index) {
      tablesContainer.innerHTML = '';
      const tableDiv = document.createElement('div');
      tableDiv.className = 'roll-table';
  
      const title = document.createElement('h2');
      title.textContent = table.name;
      tableDiv.appendChild(title);
  
      const description = document.createElement('p');
      description.innerHTML = table.description || 'No description available.'; // Render HTML
      tableDiv.appendChild(description);
  
      const rollButton = document.createElement('button');
      rollButton.textContent = `Roll (${table.formula})`;
      rollButton.addEventListener('click', async () => {
        const result = await rollDice(table);
        const resultDiv = document.createElement('div');
        resultDiv.className = 'roll-result';
        resultDiv.textContent = `${result.text}`;
        tableDiv.appendChild(resultDiv);
      });
      tableDiv.appendChild(rollButton);
  
      const editButton = createEditButton(index);
      tableDiv.appendChild(editButton);
  
      const deleteButton = document.createElement('button');
      deleteButton.textContent = 'Delete';
      deleteButton.addEventListener('click', () => {
        if (confirm(`Are you sure you want to delete the roll table "${table.name}"?`)) {
          window.api.deleteRollTable(index).then(() => {
            alert('Roll table deleted successfully!');
            location.reload(); // Reload to reflect the deletion
          }).catch(error => {
            alert(`Failed to delete roll table: ${error.message}`);
          });
        }
      });
      tableDiv.appendChild(deleteButton);
  
      const cloneButton = document.createElement('button');
      cloneButton.textContent = 'Clone';
      cloneButton.addEventListener('click', () => {
        const clonedTable = { ...table, name: `${table.name} (Clone)` };
        window.api.saveRollTable(clonedTable).then(() => {
          alert('Roll table cloned successfully!');
          location.reload(); // Reload to reflect the new cloned table
        });
      });
      tableDiv.appendChild(cloneButton);
  
      tablesContainer.appendChild(tableDiv);
    }
  
    async function fetchDnDDetails(endpoint, id) {
      const response = await fetch(`https://www.dnd5eapi.co/api/${endpoint}/${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}/${id}: ${response.statusText}`);
      }
      return await response.json();
    }
  
    async function rollDice(table) {
      const [count, sides] = table.formula.match(/\d+/g).map(Number);
      const roll = Math.floor(Math.random() * sides) + 1;
      const result = table.results.find(r => roll >= r.range[0] && roll <= r.range[1]) || { text: 'No result' };
    
      // Check if the result references another roll table
      if (result.documentCollection === 'RollTable' && result.documentId) {
        const nestedTableData = await window.api.loadRollTableById(result.documentId);
        if (nestedTableData) {
          const nestedResult = await rollDice(nestedTableData);
          return {
            text: nestedResult.text, // Replace the original result with the nested table's result
            roll: nestedResult.roll, // Use the roll from the nested table
            tableName: nestedResult.tableName || nestedTableData.name, // Use the nested table's name
          };
        }
      }
    
      // Handle Spell result type
      if (result.spellId) {
        const spellDetails = await fetchDnDDetails('spells', result.spellId);
        return {
          text: `Spell: ${spellDetails.name} - ${spellDetails.desc.join(' ')}`,
          roll,
          tableName: table.name,
        };
      }
    
      // Handle Equipment result type
      if (result.equipmentId) {
        const equipmentDetails = await fetchDnDDetails('equipment', result.equipmentId);
        return {
          text: `Equipment: ${equipmentDetails.name} - ${equipmentDetails.desc?.join(' ') || 'No description available.'}`,
          roll,
          tableName: table.name,
        };
      }

      // Handle Magic Items result type
      if (result.magicItemId) {
        const magicItemDetails = await fetchDnDDetails('magic-items', result.magicItemId);
        return {
          text: `Magic Item: ${magicItemDetails.name} - ${magicItemDetails.desc?.join(' ') || 'No description available.'}`,
          roll,
          tableName: table.name,
        };
      }
    
      // Return the result text, roll value, and table name
      return { text: `Roll Table: ${result.text} (Roll: ${roll})`, roll, tableName: table.name };
    }
  
    // Display the first table by default
    if (rollTables.length > 0) {
      displayTable(rollTables[0].data, 0);
    }
  
    const createTableModal = document.getElementById('createTableModal');
    const modalOverlay = document.getElementById('modalOverlay');
    const saveTableBtn = document.getElementById('saveTableBtn');
    const cancelTableBtn = document.getElementById('cancelTableBtn');
    const addResultBtn = document.getElementById('addResultBtn');
    const resultsContainer = document.getElementById('resultsContainer');
  
    createTableBtn.addEventListener('click', () => {
      createTableModal.style.display = 'block';
      modalOverlay.style.display = 'block';
    });
  
    cancelTableBtn.addEventListener('click', () => {
      createTableModal.style.display = 'none';
      modalOverlay.style.display = 'none';
    });
  
    function populateNestedTableOptions(selectElement) {
      const rollTableList = window.api.getRollTableList();
      selectElement.innerHTML = '<option value="">None</option>';
      rollTableList.forEach(table => {
        const option = document.createElement('option');
        option.value = table.id;
        option.textContent = table.name;
        selectElement.appendChild(option);
      });
    }
  
    async function fetchDnDData(endpoint) {
      const response = await fetch(`https://www.dnd5eapi.co/api/${endpoint}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint}: ${response.statusText}`);
      }
      const data = await response.json();
      return data.results;
    }
  
    async function populateDnDOptions(selectElement, type) {
      try {
        const data = await fetchDnDData(type);
        selectElement.innerHTML = '<option value="">None</option>';
        data.forEach(item => {
          const option = document.createElement('option');
          option.value = item.index;
          option.textContent = item.name;
          selectElement.appendChild(option);
        });
      } catch (error) {
        console.error(`Error populating ${type} options:`, error);
      }
    }
  
    addResultBtn.addEventListener('click', () => {
      const resultDiv = document.createElement('div');
      resultDiv.className = 'result';
      resultDiv.innerHTML = `
        <label>Text:</label>
        <input type="text" class="resultText" placeholder="Enter result text" />
        <label>Range:</label>
        <input type="text" class="resultRange" placeholder="e.g., 1-5" />
        <label>Type:</label>
        <select class="resultTypeSelect">
          <option value="text">Text</option>
          <option value="rollTable">Roll Table</option>
          <option value="spell">Spell</option>
          <option value="equipment">Equipment</option>
          <option value="magicItem">Magic Item</option>
        </select>
        <div class="nestedTableSelection" style="display: none;">
          <label>Nested Table:</label>
          <select class="nestedTableSelect"></select>
        </div>
        <div class="spellSelection" style="display: none;">
          <label>Spell:</label>
          <select class="spellSelect"></select>
        </div>
        <div class="equipmentSelection" style="display: none;">
          <label>Equipment:</label>
          <select class="equipmentSelect"></select>
        </div>
        <div class="magicItemSelection" style="display: none;">
          <label>Magic Item:</label>
          <select class="magicItemSelect"></select>
        </div>
        <button class="removeResultBtn">Remove</button>
      `;
    
      const resultTypeSelect = resultDiv.querySelector('.resultTypeSelect');
      const nestedTableSelection = resultDiv.querySelector('.nestedTableSelection');
      const nestedTableSelect = resultDiv.querySelector('.nestedTableSelect');
      const spellSelection = resultDiv.querySelector('.spellSelection');
      const spellSelect = resultDiv.querySelector('.spellSelect');
      const equipmentSelection = resultDiv.querySelector('.equipmentSelection');
      const equipmentSelect = resultDiv.querySelector('.equipmentSelect');
      const magicItemSelection = resultDiv.querySelector('.magicItemSelection');
      const magicItemSelect = resultDiv.querySelector('.magicItemSelect');
      const removeResultBtn = resultDiv.querySelector('.removeResultBtn');
    
      populateNestedTableOptions(nestedTableSelect);
    
      resultTypeSelect.addEventListener('change', async () => {
        nestedTableSelection.style.display = resultTypeSelect.value === 'rollTable' ? 'block' : 'none';
        spellSelection.style.display = resultTypeSelect.value === 'spell' ? 'block' : 'none';
        equipmentSelection.style.display = resultTypeSelect.value === 'equipment' ? 'block' : 'none';
        magicItemSelection.style.display = resultTypeSelect.value === 'magicItem' ? 'block' : 'none';
    
        if (resultTypeSelect.value === 'spell') {
          await populateDnDOptions(spellSelect, 'spells');
        } else if (resultTypeSelect.value === 'equipment') {
          await populateDnDOptions(equipmentSelect, 'equipment');
        } else if (resultTypeSelect.value === 'magicItem') {
          await populateDnDOptions(magicItemSelect, 'magic-items');
        }
      });
    
      removeResultBtn.addEventListener('click', () => {
        resultDiv.remove(); // Remove the resultDiv from the DOM
      });
    
      resultsContainer.appendChild(resultDiv);
    });
  
    saveTableBtn.addEventListener('click', async () => {
      const title = document.getElementById('tableTitle').value;
      const summary = document.getElementById('tableSummary').value; // Allow HTML
      const formula = document.getElementById('tableFormula').value;
  
      const results = Array.from(resultsContainer.getElementsByClassName('result')).map(resultDiv => {
        const text = resultDiv.querySelector('.resultText').value;
        const range = resultDiv.querySelector('.resultRange').value.split('-').map(Number);
        const resultType = resultDiv.querySelector('.resultTypeSelect').value;
        const nestedTableId = resultType === 'rollTable' ? resultDiv.querySelector('.nestedTableSelect').value : null;
        const spellId = resultType === 'spell' ? resultDiv.querySelector('.spellSelect').value : null;
        const equipmentId = resultType === 'equipment' ? resultDiv.querySelector('.equipmentSelect').value : null;
        const magicItemId = resultType === 'magicItem' ? resultDiv.querySelector('.magicItemSelect').value : null;
    
        return {
          text,
          range,
          weight: 1,
          drawn: false,
          documentCollection: nestedTableId ? 'RollTable' : '',
          documentId: nestedTableId || null,
          spellId: spellId || null,
          equipmentId: equipmentId || null,
          magicItemId: magicItemId || null,
        };
      });
  
      const newTable = {
        name: title,
        description: summary, // Save HTML
        formula,
        results,
        replacement: true,
        displayRoll: true,
      };
  
      try {
        const filePath = await window.api.saveRollTable(newTable);
        alert(`New Roll Table Created: ${filePath}`);
        createTableModal.style.display = 'none';
        modalOverlay.style.display = 'none';
        location.reload(); // Reload to reflect the new table
      } catch (error) {
        alert(`Failed to create roll table: ${error.message}`);
      }
    });
  
    const editTableModal = document.getElementById('editTableModal');
    const editResultsContainer = document.getElementById('editResultsContainer');
    const addEditResultBtn = document.getElementById('addEditResultBtn');
    const saveEditTableBtn = document.getElementById('saveEditTableBtn');
    const cancelEditTableBtn = document.getElementById('cancelEditTableBtn');
    let currentEditTableIndex = null;
  
    function createEditButton(index) {
      const editButton = document.createElement('button');
      editButton.textContent = 'Edit';
      editButton.addEventListener('click', async () => {
        currentEditTableIndex = index;
        const table = rollTables[index].data;
        document.getElementById('editTableTitle').value = table.name;
        document.getElementById('editTableSummary').value = table.description || '';
        document.getElementById('editTableFormula').value = table.formula;
        editResultsContainer.innerHTML = '';
    
        for (const result of table.results) {
          const resultDiv = document.createElement('div');
          resultDiv.className = 'result';
          resultDiv.innerHTML = `
            <label>Text:</label>
            <input type="text" class="resultText" value="${result.text}" />
            <label>Range:</label>
            <input type="text" class="resultRange" value="${result.range.join('-')}" />
            <label>Type:</label>
            <select class="resultTypeSelect">
              <option value="text" ${!result.documentId && !result.spellId && !result.equipmentId && !result.magicItemId ? 'selected' : ''}>Text</option>
              <option value="rollTable" ${result.documentId ? 'selected' : ''}>Roll Table</option>
              <option value="spell" ${result.spellId ? 'selected' : ''}>Spell</option>
              <option value="equipment" ${result.equipmentId ? 'selected' : ''}>Equipment</option>
              <option value="magicItem" ${result.magicItemId ? 'selected' : ''}>Magic Item</option>
            </select>
            <div class="nestedTableSelection" style="display: ${result.documentId ? 'block' : 'none'};">
              <label>Nested Table:</label>
              <select class="nestedTableSelect"></select>
            </div>
            <div class="spellSelection" style="display: ${result.spellId ? 'block' : 'none'};">
              <label>Spell:</label>
              <select class="spellSelect"></select>
            </div>
            <div class="equipmentSelection" style="display: ${result.equipmentId ? 'block' : 'none'};">
              <label>Equipment:</label>
              <select class="equipmentSelect"></select>
            </div>
            <div class="magicItemSelection" style="display: ${result.magicItemId ? 'block' : 'none'};">
              <label>Magic Item:</label>
              <select class="magicItemSelect"></select>
            </div>
          `;
    
          const resultTypeSelect = resultDiv.querySelector('.resultTypeSelect');
          const nestedTableSelection = resultDiv.querySelector('.nestedTableSelection');
          const nestedTableSelect = resultDiv.querySelector('.nestedTableSelect');
          const spellSelection = resultDiv.querySelector('.spellSelection');
          const spellSelect = resultDiv.querySelector('.spellSelect');
          const equipmentSelection = resultDiv.querySelector('.equipmentSelection');
          const equipmentSelect = resultDiv.querySelector('.equipmentSelect');
          const magicItemSelection = resultDiv.querySelector('.magicItemSelection');
          const magicItemSelect = resultDiv.querySelector('.magicItemSelect');
    
          populateNestedTableOptions(nestedTableSelect);
          if (result.documentId) {
            nestedTableSelect.value = result.documentId;
          }
    
          if (result.spellId) {
            await populateDnDOptions(spellSelect, 'spells');
            spellSelect.value = result.spellId;
          }
    
          if (result.equipmentId) {
            await populateDnDOptions(equipmentSelect, 'equipment');
            equipmentSelect.value = result.equipmentId;
          }

          if (result.magicItemId) {
            await populateDnDOptions(magicItemSelect, 'magic-items');
            magicItemSelect.value = result.magicItemId;
          }
    
          resultTypeSelect.addEventListener('change', async () => {
            nestedTableSelection.style.display = resultTypeSelect.value === 'rollTable' ? 'block' : 'none';
            spellSelection.style.display = resultTypeSelect.value === 'spell' ? 'block' : 'none';
            equipmentSelection.style.display = resultTypeSelect.value === 'equipment' ? 'block' : 'none';
            magicItemSelection.style.display = resultTypeSelect.value === 'magicItem' ? 'block' : 'none';
    
            if (resultTypeSelect.value === 'spell') {
              await populateDnDOptions(spellSelect, 'spells');
            } else if (resultTypeSelect.value === 'equipment') {
              await populateDnDOptions(equipmentSelect, 'equipment');
            } else if (resultTypeSelect.value === 'magicItem') {
              await populateDnDOptions(magicItemSelect, 'magic-items');
            }
          });
    
          editResultsContainer.appendChild(resultDiv);
        }
    
        editTableModal.style.display = 'block';
        modalOverlay.style.display = 'block';
      });
      return editButton;
    }
  
    addEditResultBtn.addEventListener('click', () => {
      const resultDiv = document.createElement('div');
      resultDiv.className = 'result';
      resultDiv.innerHTML = `
        <label>Text:</label>
        <input type="text" class="resultText" placeholder="Enter result text" />
        <label>Range:</label>
        <input type="text" class="resultRange" placeholder="e.g., 1-5" />
        <label>Type:</label>
        <select class="resultTypeSelect">
          <option value="text">Text</option>
          <option value="rollTable">Roll Table</option>
          <option value="spell">Spell</option>
          <option value="equipment">Equipment</option>
          <option value="magicItem">Magic Item</option>
        </select>
        <div class="nestedTableSelection" style="display: none;">
          <label>Nested Table:</label>
          <select class="nestedTableSelect"></select>
        </div>
        <div class="spellSelection" style="display: none;">
          <label>Spell:</label>
          <select class="spellSelect"></select>
        </div>
        <div class="equipmentSelection" style="display: none;">
          <label>Equipment:</label>
          <select class="equipmentSelect"></select>
        </div>
        <div class="magicItemSelection" style="display: none;">
          <label>Magic Item:</label>
          <select class="magicItemSelect"></select>
        </div>
        <button class="removeResultBtn">Remove</button>
      `;
    
      const resultTypeSelect = resultDiv.querySelector('.resultTypeSelect');
      const nestedTableSelection = resultDiv.querySelector('.nestedTableSelection');
      const nestedTableSelect = resultDiv.querySelector('.nestedTableSelect');
      const spellSelection = resultDiv.querySelector('.spellSelection');
      const spellSelect = resultDiv.querySelector('.spellSelect');
      const equipmentSelection = resultDiv.querySelector('.equipmentSelection');
      const equipmentSelect = resultDiv.querySelector('.equipmentSelect');
      const magicItemSelection = resultDiv.querySelector('.magicItemSelection');
      const magicItemSelect = resultDiv.querySelector('.magicItemSelect');
      const removeResultBtn = resultDiv.querySelector('.removeResultBtn');
    
      populateNestedTableOptions(nestedTableSelect);
    
      resultTypeSelect.addEventListener('change', async () => {
        nestedTableSelection.style.display = resultTypeSelect.value === 'rollTable' ? 'block' : 'none';
        spellSelection.style.display = resultTypeSelect.value === 'spell' ? 'block' : 'none';
        equipmentSelection.style.display = resultTypeSelect.value === 'equipment' ? 'block' : 'none';
        magicItemSelection.style.display = resultTypeSelect.value === 'magicItem' ? 'block' : 'none';

        if (resultTypeSelect.value === 'spell') {
            await populateDnDOptions(spellSelect, 'spells');
          } else if (resultTypeSelect.value === 'equipment') {
            await populateDnDOptions(equipmentSelect, 'equipment');
          } else if (resultTypeSelect.value === 'magicItem') {
            await populateDnDOptions(magicItemSelect, 'magic-items');
          }        
      });
      removeResultBtn.addEventListener('click', () => {
        resultDiv.remove(); // Remove the resultDiv from the DOM
      });    
      editResultsContainer.appendChild(resultDiv);
    });
  
    saveEditTableBtn.addEventListener('click', async () => {
      const title = document.getElementById('editTableTitle').value;
      const summary = document.getElementById('editTableSummary').value; // Allow HTML
      const formula = document.getElementById('editTableFormula').value;
  
      const results = Array.from(editResultsContainer.getElementsByClassName('result')).map(resultDiv => {
        const text = resultDiv.querySelector('.resultText').value;
        const range = resultDiv.querySelector('.resultRange').value.split('-').map(Number);
        const resultType = resultDiv.querySelector('.resultTypeSelect').value;
        const nestedTableId = resultType === 'rollTable' ? resultDiv.querySelector('.nestedTableSelect').value : null;
        const spellId = resultType === 'spell' ? resultDiv.querySelector('.spellSelect').value : null;
        const equipmentId = resultType === 'equipment' ? resultDiv.querySelector('.equipmentSelect').value : null;
        const magicItemId = resultType === 'magicItem' ? resultDiv.querySelector('.magicItemSelect').value : null;
    
        return {
          text,
          range,
          weight: 1,
          drawn: false,
          documentCollection: nestedTableId ? 'RollTable' : '',
          documentId: nestedTableId || null,
          spellId: spellId || null,
          equipmentId: equipmentId || null,
          magicItemId: magicItemId || null,
        };
      });
  
      const updatedTable = {
        ...rollTables[currentEditTableIndex].data,
        name: title,
        description: summary, // Save HTML
        formula,
        results,
      };
  
      try {
        await window.api.updateRollTable(currentEditTableIndex, updatedTable);
        alert('Roll table updated successfully!');
        editTableModal.style.display = 'none';
        modalOverlay.style.display = 'none';
        location.reload(); // Reload to reflect the updated table
      } catch (error) {
        alert(`Failed to update roll table: ${error.message}`);
      }
    });
  
    cancelEditTableBtn.addEventListener('click', () => {
      editTableModal.style.display = 'none';
      modalOverlay.style.display = 'none';
    });

    const clearResultsBtn = document.getElementById('clearResultsBtn');
    clearResultsBtn.addEventListener('click', () => {
      const resultDivs = document.querySelectorAll('.roll-result');
      resultDivs.forEach(resultDiv => resultDiv.remove()); // Remove only the resultDiv elements
    });

    const importTableBtn = document.getElementById('importTableBtn');
    const importFileInput = document.createElement('input');
    importFileInput.type = 'file';
    importFileInput.accept = '.json';
    importFileInput.style.display = 'none';
    
    importTableBtn.addEventListener('click', () => {
      importFileInput.click();
    });
    
    importFileInput.addEventListener('change', async (event) => {
      const file = event.target.files[0];
      if (file) {
        try {
          const filePath = await window.api.importRollTable(file.path);
          alert(`Roll table imported successfully: ${filePath}`);
          location.reload(); // Reload to reflect the imported table
        } catch (error) {
          alert(`Failed to import roll table: ${error.message}`);
        }
      }
    });
    
    document.body.appendChild(importFileInput);
  });
  
  contextBridge.exposeInMainWorld('api', {
    loadRollTables: () => {
      try {
        const jsonDir = window.api.getUserDataPath('json');
        if (!fs.existsSync(jsonDir)) return [];
        const files = fs.readdirSync(jsonDir).filter(file => file.endsWith('.json'));
        return files.map(file => {
          const filePath = path.join(jsonDir, file);
          try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            return { filePath, data };
          } catch (error) {
            console.error(`Error parsing JSON file ${file}:`, error);
            return null; // Skip invalid files
          }
        }).filter(Boolean); // Remove null entries
      } catch (error) {
        console.error('Error loading roll tables:', error);
        return [];
      }
    },
    getUserDataPath: (subDir) => {
      const basePath = path.join(window.api.getUserDataBasePath(), subDir);
      if (!fs.existsSync(basePath)) {
        fs.mkdirSync(basePath, { recursive: true }); // Ensure the folder exists
      }
      return basePath;
    },
    getUserDataBasePath: () => ipcRenderer.invoke('get-user-data-path'),
    deleteRollTable: (index) => ipcRenderer.invoke('delete-roll-table', index),
  });
