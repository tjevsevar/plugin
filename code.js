"use strict";
/// <reference path="./global.d.ts" />
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
figma.showUI(__html__, { width: 300, height: 700 });
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
        }
        else {
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
    }
    else {
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
function fetchSpacesFoldersAndLists() {
    return __awaiter(this, void 0, void 0, function* () {
        const API_KEY = 'pk_68593472_Y8ACWXHXWFKZIRF63AR1V1WQB62P0870';
        const TEAM_ID = '9015554267';
        try {
            const spacesResponse = yield fetch(`https://api.clickup.com/api/v2/team/${TEAM_ID}/space`, {
                method: 'GET',
                headers: {
                    'Authorization': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            if (!spacesResponse.ok) {
                throw new Error(`HTTP error! status: ${spacesResponse.status}`);
            }
            const spacesData = yield spacesResponse.json();
            const spaces = spacesData.spaces;
            console.log('Fetched spaces:', spaces);
            // Update the fetchSpacesFoldersAndLists function to include lists directly under spaces
            const spacesWithFoldersAndLists = yield Promise.all(spaces.map((space) => __awaiter(this, void 0, void 0, function* () {
                // Fetch folders
                const foldersResponse = yield fetch(`https://api.clickup.com/api/v2/space/${space.id}/folder`, {
                    method: 'GET',
                    headers: {
                        'Authorization': API_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                if (!foldersResponse.ok) {
                    console.error(`Error fetching folders for space ${space.id}: ${foldersResponse.status}`);
                    return Object.assign(Object.assign({}, space), { folders: [] });
                }
                const foldersData = yield foldersResponse.json();
                console.log(`Fetched folders for space ${space.id}:`, foldersData);
                // Fetch lists for each folder
                const foldersWithLists = yield Promise.all(foldersData.folders.map((folder) => __awaiter(this, void 0, void 0, function* () {
                    const listsResponse = yield fetch(`https://api.clickup.com/api/v2/folder/${folder.id}/list`, {
                        method: 'GET',
                        headers: {
                            'Authorization': API_KEY,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (!listsResponse.ok) {
                        console.error(`Error fetching lists for folder ${folder.id}: ${listsResponse.status}`);
                        return Object.assign(Object.assign({}, folder), { lists: [] });
                    }
                    const listsData = yield listsResponse.json();
                    console.log(`Fetched lists for folder ${folder.id}:`, listsData);
                    return Object.assign(Object.assign({}, folder), { lists: listsData.lists || [] });
                })));
                // Fetch lists for the space
                const listsResponse = yield fetch(`https://api.clickup.com/api/v2/space/${space.id}/list`, {
                    method: 'GET',
                    headers: {
                        'Authorization': API_KEY,
                        'Content-Type': 'application/json'
                    }
                });
                let lists = [];
                if (listsResponse.ok) {
                    const listsData = yield listsResponse.json();
                    lists = listsData.lists || [];
                    console.log(`Fetched lists for space ${space.id}:`, lists);
                }
                else {
                    console.error(`Error fetching lists for space ${space.id}: ${listsResponse.status}`);
                }
                return Object.assign(Object.assign({}, space), { folders: foldersWithLists, lists });
            })));
            console.log('Spaces with folders and lists:', spacesWithFoldersAndLists);
            return spacesWithFoldersAndLists;
        }
        catch (error) {
            console.error('Error fetching spaces, folders, and lists:', error);
            return [];
        }
    });
}
// Fetch spaces, folders, and lists when the plugin starts
fetchSpacesFoldersAndLists().then(spacesWithFoldersAndLists => {
    console.log('Sending spacesWithFoldersAndLists to UI:', spacesWithFoldersAndLists);
    figma.ui.postMessage({ type: 'spacesWithFoldersAndLists', spacesWithFoldersAndLists });
});
// Add this function to get tasks for a specific list
function getTasks(listId) {
    return __awaiter(this, void 0, void 0, function* () {
        const API_KEY = 'pk_68593472_Y8ACWXHXWFKZIRF63AR1V1WQB62P0870';
        try {
            const response = yield fetch(`https://api.clickup.com/api/v2/list/${listId}/task?archived=false`, {
                method: 'GET',
                headers: {
                    'Authorization': API_KEY,
                    'Content-Type': 'application/json'
                }
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = yield response.json();
            console.log('Tasks fetched:', result);
            return result.tasks;
        }
        catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    });
}
// Update the message handler
figma.ui.onmessage = (msg) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("Received message from UI:", msg); // Log all messages from UI
    if (msg.type === 'navigate') {
        console.log("Navigating to screen:", msg.screen);
        figma.ui.postMessage({ type: 'updateScreen', screen: msg.screen });
    }
    else if (msg.type === 'fetchSpacesFoldersAndLists') {
        fetchSpacesFoldersAndLists().then(spacesWithFoldersAndLists => {
            figma.ui.postMessage({ type: 'spacesWithFoldersAndLists', spacesWithFoldersAndLists });
        });
    }
    else if (msg.type === 'createTask') {
        try {
            const result = yield createClickUpTask(msg);
            figma.ui.postMessage({
                type: 'taskCreated',
                task: result,
                figmaUrl: msg.selectionInfo,
                taskUrl: result.url
            });
            figma.notify('Task created successfully!');
        }
        catch (error) {
            if (error instanceof Error) {
                figma.ui.postMessage({ type: 'taskCreationError', error: error.message });
            }
            else {
                figma.ui.postMessage({ type: 'taskCreationError', error: 'An unknown error occurred' });
            }
            figma.notify('Error creating task. Please try again.');
        }
    }
    else if (msg.type === 'getTasks') {
        try {
            const tasks = yield getTasks(msg.listId);
            figma.ui.postMessage({ type: 'tasks', tasks });
        }
        catch (error) {
            console.error('Error in getTasks:', error);
            if (error instanceof Error) {
                figma.ui.postMessage({ type: 'tasksError', error: error.message });
            }
            else {
                figma.ui.postMessage({ type: 'tasksError', error: 'An unknown error occurred' });
            }
            figma.notify('Error fetching tasks. Please try again.');
        }
    }
});
// Initial update
console.log("Performing initial update");
updateSelectionInfo();
// Log when the plugin script loads
console.log("Plugin script loaded");
// Add this function to create a task
function createClickUpTask(taskData) {
    return __awaiter(this, void 0, void 0, function* () {
        const API_KEY = 'pk_68593472_Y8ACWXHXWFKZIRF63AR1V1WQB62P0870';
        const LIST_ID = taskData.listId;
        try {
            const response = yield fetch(`https://api.clickup.com/api/v2/list/${LIST_ID}/task`, {
                method: 'POST',
                headers: {
                    'Authorization': API_KEY,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: taskData.taskTitle,
                    description: `${taskData.taskDescription}\n\n ${taskData.selectionInfo}`,
                })
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = yield response.json();
            console.log('Task created:', result);
            return Object.assign(Object.assign({}, result), { url: result.url // Assuming the ClickUp API returns a 'url' field for the task
             });
        }
        catch (error) {
            console.error('Error creating task:', error);
            throw error;
        }
    });
}
