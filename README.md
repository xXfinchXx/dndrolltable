# dndrolltable

**dndrolltable** is a digital roll table application designed for Dungeons & Dragons (D&D) and other tabletop role-playing games (TTRPGs). It allows users to create, manage, and roll on custom tables to generate random results for encounters, loot, or any other game-related events.

## Features

### Roll Table Management
- **Create Roll Tables**: Easily create new roll tables with custom names, descriptions, and dice formulas (e.g., `1d20`).
- **Edit Roll Tables**: Modify existing roll tables, including their results and metadata.
- **Delete Roll Tables**: Remove unwanted roll tables from the application.
- **Clone Roll Tables**: Duplicate existing roll tables for quick reuse or modification.

### Results Customization
- **Custom Results**: Add results with text, ranges, and weights to roll tables.
- **Nested Tables**: Reference other roll tables as results for dynamic and recursive rolls.
- **Integration with D&D Data**: Include spells, equipment, and magic items as results using data from the D&D 5e API.

### Rolling and Display
- **Roll Dice**: Roll on tables using the specified dice formula and display the result.
- **Clear Results**: Clear previously displayed roll results for a clean slate.

### Import and Export
- **Import Foundry VTT Roll Tables**: Transform and import roll tables from Foundry VTT into the application.
- **Export Roll Tables**: Save roll tables as JSON files for sharing or backup (planned feature).

### User-Friendly Interface
- **Intuitive UI**: A clean and responsive interface for managing and rolling on tables.
- **Modal Dialogs**: Use modals for creating and editing roll tables with real-time previews.

### Data Persistence
- **Local Storage**: Save roll tables locally in the user's data directory for persistent access.
- **Automatic Directory Management**: Automatically create and manage the necessary directories for storing roll tables.

## How to Use

1. **Create a Roll Table**:
   - Click the "Create New Roll Table" button.
   - Enter a title, description, formula, and results.
   - Save the table to make it available for rolling.

2. **Roll on a Table**:
   - Select a roll table from the dropdown menu.
   - Click the "Roll" button to generate a result.

3. **Edit or Delete a Roll Table**:
   - Use the "Edit" button to modify a table.
   - Use the "Delete" button to remove a table.

4. **Import a Roll Table**:
   - Click the "Import Foundry VTT Roll Table" button.
   - Select a JSON file to import and transform it into a roll table.

5. **Clear Results**:
   - Click the "Clear Results" button to remove all displayed roll results.

## Installation

1. Download the latest release from the [Releases](https://github.com/yourusername/dndrolltable/releases) page.
   - Choose the **installable executable** for your operating system (e.g., `.exe` for Windows).
   - Alternatively, download the **unpacked version** if you prefer to run the application without installation.

2. If using the installable executable:
   - Run the installer and follow the on-screen instructions to install the application.

3. If using the unpacked version:
   - Extract the downloaded archive to a folder of your choice.
   - Run the application by executing the appropriate file (e.g., `dndrolltable.exe` for Windows).

## Build and Package

To build and package the application for distribution:
```bash
npm run build
```

## Contributing

Contributions are welcome! Feel free to submit issues or pull requests to improve the application.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
