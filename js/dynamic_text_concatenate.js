import { app } from "../../scripts/app.js";

/**
 * Dynamic Text Concatenate - Dynamically add text inputs and concatenate with delimiter.
 * 
 * Features:
 * - Starts with 2 text input sockets
 * - Dynamically adds more inputs when existing ones are connected
 * - Configurable delimiter for joining text
 * - Single text output with concatenated result
 */

const MIN_INPUTS = 2;
const MAX_INPUTS = 10;

app.registerExtension({
    name: "togglemaster.DynamicTextConcatenate",

    async beforeRegisterNodeDef(nodeType, nodeData, app) {
        if (nodeData.name !== "DynamicTextConcatenate") return;

        // Store original onNodeCreated
        const origOnNodeCreated = nodeType.prototype.onNodeCreated;

        nodeType.prototype.onNodeCreated = function () {
            if (origOnNodeCreated) {
                origOnNodeCreated.apply(this, arguments);
            }

            // Defer cleanup to ensure ComfyUI has finished setting up the node
            const self = this;
            setTimeout(() => {
                self._cleanupInitialInputs();
            }, 0);
        };

        // Also use onAdded as backup - called when node is added to graph
        const origOnAdded = nodeType.prototype.onAdded;
        nodeType.prototype.onAdded = function () {
            if (origOnAdded) {
                origOnAdded.apply(this, arguments);
            }
            this._cleanupInitialInputs();
        };

        nodeType.prototype._cleanupInitialInputs = function () {
            if (!this.inputs || this._inputsCleaned) return;

            // Get all text inputs and sort by number
            const textInputs = this.inputs
                .filter(inp => inp.name.startsWith("text_"))
                .sort((a, b) => {
                    const numA = parseInt(a.name.replace("text_", ""));
                    const numB = parseInt(b.name.replace("text_", ""));
                    return numA - numB;
                });

            // Remove inputs beyond MIN_INPUTS (from end to avoid index issues)
            for (let i = textInputs.length - 1; i >= MIN_INPUTS; i--) {
                const inputToRemove = textInputs[i];
                // Only remove if not connected
                if (!inputToRemove.link) {
                    const indexToRemove = this.inputs.findIndex(inp => inp.name === inputToRemove.name);
                    if (indexToRemove >= 0) {
                        this.removeInput(indexToRemove);
                    }
                }
            }

            this._inputsCleaned = true;
            this.setSize(this.computeSize());
            this.setDirtyCanvas(true, true);
        };

        // Store original onConnectionsChange
        const origOnConnectionsChange = nodeType.prototype.onConnectionsChange;

        nodeType.prototype.onConnectionsChange = function (type, slotIndex, isConnected, link, ioSlot) {
            if (origOnConnectionsChange) {
                origOnConnectionsChange.apply(this, arguments);
            }

            // Only handle input connections
            if (type !== LiteGraph.INPUT) return;

            this._updateDynamicInputs();
        };

        nodeType.prototype._updateDynamicInputs = function () {
            if (!this.inputs) return;

            // Count text inputs only
            const textInputs = this.inputs.filter(inp => inp.name.startsWith("text_"));
            const textInputCount = textInputs.length;

            // Check if all text inputs are connected
            let allTextConnected = textInputCount > 0;
            for (const inp of textInputs) {
                if (!inp.link) {
                    allTextConnected = false;
                    break;
                }
            }

            // If all text inputs are connected and we haven't reached max, add a new one
            if (allTextConnected && textInputCount < MAX_INPUTS) {
                const newIndex = textInputCount + 1;
                this.addInput(`text_${newIndex}`, "STRING");
            }

            // Remove trailing unconnected text inputs (keep minimum)
            while (true) {
                const currentTextInputs = this.inputs.filter(inp => inp.name.startsWith("text_"));
                if (currentTextInputs.length <= MIN_INPUTS) break;

                // Sort to get proper order
                currentTextInputs.sort((a, b) => {
                    const numA = parseInt(a.name.replace("text_", ""));
                    const numB = parseInt(b.name.replace("text_", ""));
                    return numA - numB;
                });

                const lastTextInput = currentTextInputs[currentTextInputs.length - 1];
                const secondLastTextInput = currentTextInputs[currentTextInputs.length - 2];

                // Only remove if both last and second-last are unconnected
                if (!lastTextInput.link && !secondLastTextInput.link) {
                    const indexToRemove = this.inputs.findIndex(inp => inp.name === lastTextInput.name);
                    if (indexToRemove >= 0) {
                        this.removeInput(indexToRemove);
                    }
                } else {
                    break;
                }
            }

            // Update size to fit new inputs
            const minSize = this.computeSize();
            this.setSize([
                Math.max(this.size[0], minSize[0]),
                Math.max(this.size[1], minSize[1])
            ]);
        };

        // Handle loading saved workflows - restore dynamic inputs
        const origOnConfigure = nodeType.prototype.onConfigure;

        nodeType.prototype.onConfigure = function (info) {
            if (origOnConfigure) {
                origOnConfigure.apply(this, arguments);
            }

            // Reset cleanup flag when loading
            this._inputsCleaned = false;

            // After loading, clean up inputs based on connections
            // Defer to ensure links are set up
            const self = this;
            setTimeout(() => {
                self._updateDynamicInputs();
            }, 100);
        };
    }
});
