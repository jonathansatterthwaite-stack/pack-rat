# Planned updates

## SVG tool updates (external tool)
Update SVG tool to allow app to add use it's own library of shapes. Add options for previously created shapes to be added to a new image as a grouped layer.

An option for the canvas height and width to be locked by the app. Investigate into giving the option for an app to set and lock any field in the SVG tool.

Add a feature for monochrome and grayscale shapes to use outlines as clip masks. Investigate changing from monochrome mode to grayscale.

Designating masks could be done using the colour field or as an aspect of it. Investigate masks that are linked to the layer they are intended to effect.

Investigate if an outline can be rendered around grouped shapes, so it can omit edges and corners that clip.

Consider live images with animations. Investigate if having too many of these can cause slow down. Add a delta time variable for app animations to match in app fps and tick speed. Optimizations:
- Limit calculations to only images that are visible, an item that is off screen does not need to animate.
- If total calculations start to effect app speed the animation/tick speed should be throttled. This should make it so only animations slow down and not the user experience.

svg animations seem to update only on release of a gm_ control. Other variables update while controls are being moved.
