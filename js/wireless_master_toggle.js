
import { app } from "../../scripts/app.js";

// Property constants
const PROPERTY_MATCH_COLORS = "matchColors";
const PROPERTY_MATCH_TITLE = "matchTitle";
const PROPERTY_SHOW_NAV = "showNav";
const PROPERTY_SHOW_ALL_GRAPHS = "showAllGraphs";
const PROPERTY_SORT = "sort";
const PROPERTY_SORT_CUSTOM_ALPHA = "customSortAlphabet";
const PROPERTY_RESTRICTION = "toggleRestriction";

/**
 * Recursively find all nodes in a graph and its subgraphs.
 */
function findAllNodesRecursive(graph, predicate) {
    let results = [];
    if (!graph || !graph._nodes) return results;

    for (const node of graph._nodes) {
        if (predicate(node)) {
            results.push(node);
        }
        if (node.subgraph) {
            results.push(...findAllNodesRecursive(node.subgraph, predicate));
        }
    }
    return results;
}

/**
 * Wireless Master Toggle - Control nodes anywhere in the workflow by title/color match.
 * 
 * Features:
 * - Filter nodes by title (regex) and/or color
 * - Toggle nodes on/off (mute/unmute)
 * - Works across subgraphs
 * - Restriction modes: "max one" or "always one" for radio-button behavior
 */
class WirelessMasterToggle extends LiteGraph.LGraphNode {
    static title = "Wireless Master Toggle";
    static type = "Wireless Master Toggle";

    // Static property definitions for Properties Panel
    static ["@matchColors"] = {type: "string"};
    static ["@matchTitle"] = {type: "string"};
    static ["@showNav"] = {type: "boolean"};
    static ["@showAllGraphs"] = {type: "boolean"};
    static ["@sort"] = {
        type: "combo",
        values: ["position", "alphanumeric"]
    };
    static ["@customSortAlphabet"] = {type: "string"};
    static ["@toggleRestriction"] = {
        type: "combo",
        values: ["default", "max one", "always one"]
    };
    
    constructor(title = WirelessMasterToggle.title) {
        super(title);
        this.serialize_widgets = false;
        this.isVirtualNode = true;
        
        // Initialize properties
        this.widgets = this.widgets || [];
        this.properties = this.properties || {};
        
        // Set default values
        this.properties[PROPERTY_MATCH_COLORS] = "";
        this.properties[PROPERTY_MATCH_TITLE] = "";
        this.properties[PROPERTY_SHOW_NAV] = true;
        this.properties[PROPERTY_SHOW_ALL_GRAPHS] = true;
        this.properties[PROPERTY_SORT] = "position";
        this.properties[PROPERTY_SORT_CUSTOM_ALPHA] = "";
        this.properties[PROPERTY_RESTRICTION] = "default";
    }

    onNodeCreated() {
         // Auto-refresh on creation
         this.refreshWidgets();
    }

    onPropertyChanged(name, value) {
        // Auto-refresh toggles when properties change
        this.refreshWidgets();
        return true;
    }

    refreshWidgets() {
        // Clear all existing widgets
        if (this.widgets) {
             this.widgets.length = 0;
        }

        const matchTitleStr = this.properties[PROPERTY_MATCH_TITLE];
        const matchColorsStr = this.properties[PROPERTY_MATCH_COLORS];
        
        let regex = null;
        if (matchTitleStr) {
            try {
                regex = new RegExp(matchTitleStr, "i");
            } catch (e) {
                console.error("Invalid Regex", e);
            }
        }
        
        let colors = [];
        if (matchColorsStr) {
            colors = matchColorsStr.split(",").map(c => c.trim().toLowerCase()).filter(c => c);
        }
        
        // If no filters specified, don't show anything
        if (!regex && colors.length === 0) {
            this.setSize(this.computeSize());
            return;
        }

        const rootGraph = app.graph;
        const allNodes = findAllNodesRecursive(rootGraph, (n) => true);
        
        const matchedNodes = allNodes.filter(n => {
            if (n.id === this.id) return false;
            
            let titleMatch = true;
            if (regex) {
                titleMatch = regex.test(n.title);
            }
            
            let colorMatch = true;
            if (colors.length > 0) {
                const nodeColor = (n.color || "").toLowerCase();
                const nodeBgColor = (n.bgcolor || "").toLowerCase();
                colorMatch = colors.some(c => nodeColor.includes(c) || nodeBgColor.includes(c));
            }
            
            return titleMatch && colorMatch;
        });
        
        if (this.properties[PROPERTY_SORT] === "alphanumeric") {
             matchedNodes.sort((a, b) => a.title.localeCompare(b.title));
        } else {
             matchedNodes.sort((a, b) => a.id - b.id);
        }

        for (const node of matchedNodes) {
             const w = this.addWidget("toggle", node.title, node.mode !== 2, (value) => {
                this.toggleNode(node, value);
            });
            // Store direct node reference - IDs are NOT unique across subgraphs
            w.targetNode = node;
        }

        this.setSize(this.computeSize());
        this.setDirtyCanvas(true);
    }
    
    toggleNode(targetNode, enabled) {
        const restriction = this.properties[PROPERTY_RESTRICTION];
        if (enabled && (restriction === "max one" || restriction === "always one")) {
             for (const w of this.widgets) {
                 if (w.type === "toggle" && w.targetNode !== targetNode) {
                     w.value = false;
                     this.applyToggle(w.targetNode, false);
                 }
             }
        }
        this.applyToggle(targetNode, enabled);
    }
    
    applyToggle(targetNode, enabled) {
        if (targetNode) {
            targetNode.mode = enabled ? 0 : 2;
        }
    }
}

app.registerExtension({
    name: "togglemaster.WirelessMasterToggle",
    registerCustomNodes() {
        LiteGraph.registerNodeType("Wireless Master Toggle", WirelessMasterToggle);
        WirelessMasterToggle.category = "utils";
    }
});
