"""
ComfyUI Wireless Toggle Master

Control any nodes in your workflow by title/color matching.
Works across subgraphs with radio-button style restrictions.
"""


class DynamicTextConcatenate:
    """
    Concatenate multiple text inputs with a configurable delimiter.
    Dynamically adds input slots as needed (handled by frontend JS).
    """
    
    CATEGORY = "utils"
    RETURN_TYPES = ("STRING",)
    RETURN_NAMES = ("text",)
    FUNCTION = "concatenate"
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {},
            "optional": {
                "text_1": ("STRING", {"forceInput": True}),
                "text_2": ("STRING", {"forceInput": True}),
                "text_3": ("STRING", {"forceInput": True}),
                "text_4": ("STRING", {"forceInput": True}),
                "text_5": ("STRING", {"forceInput": True}),
                "text_6": ("STRING", {"forceInput": True}),
                "text_7": ("STRING", {"forceInput": True}),
                "text_8": ("STRING", {"forceInput": True}),
                "text_9": ("STRING", {"forceInput": True}),
                "text_10": ("STRING", {"forceInput": True}),
                "delimiter": (["space", "none", "comma", "newline", "pipe", "custom"], {"default": "space"}),
                "custom_delimiter": ("STRING", {"default": ""}),
            }
        }
    
    DELIMITER_MAP = {
        "space": " ",
        "none": "",
        "comma": ", ",
        "newline": "\n",
        "pipe": " | ",
    }
    
    def concatenate(self, delimiter="space", custom_delimiter="", **kwargs):
        # Get the actual delimiter string
        if delimiter == "custom":
            delim = custom_delimiter
        else:
            delim = self.DELIMITER_MAP.get(delimiter, " ")
        
        # Collect all text inputs in order
        values = []
        for i in range(1, 11):  # text_1 through text_10
            key = f"text_{i}"
            if key in kwargs and kwargs[key] is not None and kwargs[key] != "":
                values.append(str(kwargs[key]))
        
        # Concatenate with delimiter
        result = delim.join(values)
        return (result,)


NODE_CLASS_MAPPINGS = {
    "DynamicTextConcatenate": DynamicTextConcatenate,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "DynamicTextConcatenate": "Dynamic Text Concatenate",
}

WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
