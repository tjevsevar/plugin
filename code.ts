/// <reference path="./global.d.ts" />

figma.showUI(__html__, { width: 300, height: 600 });

function getFileUrl() {
  const fileKey = figma.fileKey;
  const fileName = figma.root.name;
  console.log("File key:", fileKey);
  console.log("File name:", fileName);

  if (fileKey && fileName) {
    const url = `https://www.figma.com/file/${fileKey}/${encodeURIComponent(fileName)}`;
    console.log("Constructed file URL:", url);
    return url;
  }
  console.log("Unable to construct file URL");
  return null;
}

function getSelectionUrl() {
  const selection = figma.currentPage.selection;
  console.log("Current selection:", selection);
  if (selection.length === 1) {
    const node = selection[0];
    console.log("Selected node type:", node.type);
    const nodeId = node.id;
    console.log("Node ID:", nodeId);

    const fileUrl = getFileUrl();
    console.log("Retrieved file URL:", fileUrl);

    if (fileUrl) {
      const url = `${fileUrl}?node-id=${nodeId}`;
      console.log("Generated URL:", url);
      return { url, nodeName: node.name };
    } else {
      console.log("File URL not available");
    }
  }
  console.log("No valid selection for URL generation");
  return null;
}

function updateSelectionInfo() {
  console.log("Updating selection info");
  const result = getSelectionUrl();
  if (result) {
    console.log("Sending selectionUpdate message with URL:", result.url);
    figma.ui.postMessage({ 
      type: 'selectionUpdate', 
      url: result.url, 
      nodeName: result.nodeName
    });
  } else {
    console.log("Sending selectionError message");
    figma.ui.postMessage({ 
      type: 'selectionError', 
      message: 'Unable to generate URL for the selected item.' 
    });
  }
}

// Listen for selection changes
figma.on('selectionchange', () => {
  console.log("Selection changed");
  updateSelectionInfo();
});

// Function to fetch Spaces, Folders, and Lists
async function fetchSpacesFoldersAndLists() {
  const API_KEY = 'pk_68593472_Y8ACWXHXWFKZIRF63AR1V1WQB62P0870';
  const TEAM_ID = '9015554267';

  try {
    const spacesResponse = await fetch(`https://api.clickup.com/api/v2/team/${TEAM_ID}/space`, {
      method: 'GET',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      }
    });

    if (!spacesResponse.ok) {
      throw new Error(`HTTP error! status: ${spacesResponse.status}`);
    }

    const spacesData = await spacesResponse.json();
    const spaces: any[] = spacesData.spaces;

    console.log('Fetched spaces:', spaces);

    // Fetch folders and lists for each space
    const spacesWithFoldersAndLists = await Promise.all(spaces.map(async (space: any) => {
      // Fetch folders
      const foldersResponse = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/folder`, {
        method: 'GET',
        headers: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json'
        }
      });

      if (!foldersResponse.ok) {
        console.error(`Error fetching folders for space ${space.id}: ${foldersResponse.status}`);
        return { ...space, folders: [] };
      }

      const foldersData = await foldersResponse.json();
      console.log(`Fetched folders for space ${space.id}:`, foldersData);

      // Fetch lists for each folder
      const foldersWithLists = await Promise.all(foldersData.folders.map(async (folder: any) => {
        const listsResponse = await fetch(`https://api.clickup.com/api/v2/folder/${folder.id}/list`, {
          method: 'GET',
          headers: {
            'Authorization': API_KEY,
            'Content-Type': 'application/json'
          }
        });

        if (!listsResponse.ok) {
          console.error(`Error fetching lists for folder ${folder.id}: ${listsResponse.status}`);
          return { ...folder, lists: [] };
        }

        const listsData = await listsResponse.json();
        console.log(`Fetched lists for folder ${folder.id}:`, listsData);
        return {
          ...folder,
          lists: listsData.lists || []
        };
      }));

      // Fetch folderless lists
      const folderlessListsResponse = await fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, {
        method: 'GET',
        headers: {
          'Authorization': API_KEY,
          'Content-Type': 'application/json'
        }
      });

      let folderlessLists = [];
      if (folderlessListsResponse.ok) {
        const folderlessListsData = await folderlessListsResponse.json();
        folderlessLists = folderlessListsData.lists || [];
        console.log(`Fetched folderless lists for space ${space.id}:`, folderlessLists);
      } else {
        console.error(`Error fetching folderless lists for space ${space.id}: ${folderlessListsResponse.status}`);
      }

      return {
        ...space,
        folders: foldersWithLists,
        folderlessLists
      };
    }));

    console.log('Spaces with folders and lists:', spacesWithFoldersAndLists);
    return spacesWithFoldersAndLists;
  } catch (error) {
    console.error('Error fetching spaces, folders, and lists:', error);
    return [];
  }
}

// Fetch spaces, folders, and lists when the plugin starts
fetchSpacesFoldersAndLists().then(spacesWithFoldersAndLists => {
  console.log('Sending spacesWithFoldersAndLists to UI:', spacesWithFoldersAndLists);
  figma.ui.postMessage({ type: 'spacesWithFoldersAndLists', spacesWithFoldersAndLists });
});

// Make sure to include this in your message handler
figma.ui.onmessage = async (msg) => {
  console.log("Received message from UI:", msg);
  if (msg.type === 'navigate') {
    console.log("Navigating to screen:", msg.screen);
    figma.ui.postMessage({ type: 'updateScreen', screen: msg.screen });
  } else if (msg.type === 'fetchSpacesFoldersAndLists') {
    fetchSpacesFoldersAndLists().then(spacesWithFoldersAndLists => {
      figma.ui.postMessage({ type: 'spacesWithFoldersAndLists', spacesWithFoldersAndLists });
    });
  } else if (msg.type === 'createTask') {
    try {
      const result = await createClickUpTask(msg);
      figma.ui.postMessage({ type: 'taskCreated', task: result });
      figma.notify('Task created successfully!');
    } catch (error: unknown) {
      if (error instanceof Error) {
        figma.ui.postMessage({ type: 'taskCreationError', error: error.message });
      } else {
        figma.ui.postMessage({ type: 'taskCreationError', error: 'An unknown error occurred' });
      }
      figma.notify('Error creating task. Please try again.');
    }
  }
};

// Initial update
console.log("Performing initial update");
updateSelectionInfo();

// Log when the plugin script loads
console.log("Plugin script loaded");

// Add this function to create a task
async function createClickUpTask(taskData: any) {
  const API_KEY = 'pk_68593472_Y8ACWXHXWFKZIRF63AR1V1WQB62P0870';
  const LIST_ID = taskData.listId;

  try {
    const response = await fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}/task`, {
      method: 'POST',
      headers: {
        'Authorization': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: taskData.taskTitle,
        description: `${taskData.taskDescription}\n\nFigma Link: ${taskData.selectionInfo}`,
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Task created:', result);
    return result;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
}