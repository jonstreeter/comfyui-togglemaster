
import { app } from "../../scripts/app.js";

// Property constants
const PROPERTY_MATCH_COLORS = "matchColors";
const PROPERTY_MATCH_TITLE = "matchTitle";
const PROPERTY_SHOW_NAV = "showNav";
const PROPERTY_SHOW_ALL_GRAPHS = "showAllGraphs";
const PROPERTY_SORT = "sort";
const PROPERTY_SORT_CUSTOM_ALPHA = "customSortAlphabet";
const PROPERTY_RESTRICTION = "toggleRestriction";
const PROPERTY_AUTO_REFRESH = "autoRefresh";
const PROPERTY_USER_WIDTH = "userWidth";

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
    static ["@matchColors"] = { type: "string" };
    static ["@matchTitle"] = { type: "string" };
    static ["@showNav"] = { type: "boolean" };
    static ["@showAllGraphs"] = { type: "boolean" };
    static ["@sort"] = {
        type: "combo",
        values: ["position", "alphanumeric"]
    };
    static ["@customSortAlphabet"] = { type: "string" };
    static ["@toggleRestriction"] = {
        type: "combo",
        values: ["default", "max one", "always one"]
    };
    static ["@autoRefresh"] = { type: "boolean" };
    static ["@userWidth"] = { type: "number" };

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
        this.properties[PROPERTY_AUTO_REFRESH] = true;
        this.properties[PROPERTY_USER_WIDTH] = 0; // 0 means auto
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
        // Use saved user width if available, otherwise current size
        const savedWidth = this.properties[PROPERTY_USER_WIDTH] || 0;
        const currentSize = [savedWidth || this.size[0], this.size[1]];

        // Clear all existing widgets
        if (this.widgets) {
            this.widgets.length = 0;
        }

        // Add "Refresh" button always
        this.addWidget("button", "Refresh", null, () => this.refreshWidgets());

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

        // Compute new minimum size based on content
        const minSize = this.computeSize();

        // Resize logic: Keep existing size unless minSize is larger
        // This satifies: "keep its size dimensions unless... addition... requires increasing"
        this.setSize([
            Math.max(currentSize[0], minSize[0]),
            Math.max(currentSize[1], minSize[1])
        ]);

        this.setDirtyCanvas(true);
    }

    onResize(size) {
        // Save user's width preference when they manually resize
        if (size && size[0] > 0) {
            this.properties[PROPERTY_USER_WIDTH] = size[0];
        }
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
    },
    setup() {
        const notifyToggles = () => {
            const graph = app.graph;
            if (!graph) return;
            for (const node of graph._nodes) {
                if (node.type === WirelessMasterToggle.type && node.properties[PROPERTY_AUTO_REFRESH]) {
                    node.refreshWidgets();
                }
            }
        };

        // Debounce to avoid spamming refresh on paste/load
        let timer = null;
        const debouncedNotify = () => {
            if (timer) clearTimeout(timer);
            timer = setTimeout(notifyToggles, 100);
        };

        // Hook node added
        const origOnNodeAdded = app.graph.onNodeAdded;
        app.graph.onNodeAdded = function (node) {
            origOnNodeAdded?.apply(this, arguments);
            // Only refresh if the added node is NOT a toggle master (avoid infinite recursion if we did that)
            // and it might match criteria. safest is just debounce refresh.
            debouncedNotify();
        };

        // Hook node removed
        const origOnNodeRemoved = app.graph.onNodeRemoved;
        app.graph.onNodeRemoved = function (node) {
            origOnNodeRemoved?.apply(this, arguments);
            debouncedNotify();
        };
    }
});
