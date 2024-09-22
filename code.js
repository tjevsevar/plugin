"use strict";
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
figma.ui.onmessage = (msg) => {
    console.log("Received message from UI:", msg);
    if (msg.type === 'navigate') {
        console.log("Navigating to screen:", msg.screen);
        figma.ui.postMessage({ type: 'updateScreen', screen: msg.screen });
    }
};
// Initial update
console.log("Performing initial update");
updateSelectionInfo();
// Log when the plugin script loads
console.log("Plugin script loaded");
