"""
ComfyUI Wireless Toggle Master

Control any nodes in your workflow by title/color matching.
Works across subgraphs with radio-button style restrictions.
"""

# Purely frontend node - no Python backend required
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
