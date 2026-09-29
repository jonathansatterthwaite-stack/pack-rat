# Planned updates
## System wide
Move to a system agnostic spec. Create rules package system that allows rule settings to be imported, exported, edited, saved, enabled and disabled. Change DnD 5e rules into a package.

Add campaign selection.

Add a file management view. For characters, rule packages, campaigns, SVG arrangements, etc. A place to view and manage any data that is not inherently part of the app itself.

Add a mode to allow GMs to set up GM features without hosting a server. Make it so that the host and designated GM do not have to be the same user, create GM role that is independent from a character. GM role could have expanded information on players and I can hide player specific tabs/info that a GM would not need.

## Interactivity
gm_ variables are still displayed incorrectly in the SVG editor. It shouldn't list created gm variables, only instructions on how to utilise them.

Investigate alternative ways to handle gm_ variables:
- Could the gm_ prefix be handled in the background without presenting this to the user for easier management
- Think about how to incorporate this into functions, the "+ add gm variable" is a good way to label them for the app. Need a way to define a gm_ variable when binding it to a layer/group. Could use square brackets around the name.

## Items/Catalog
Standardise template structure. Currently, some templates seem to have built in sub categories whilst others don't amongst other inconsistencies. We should build it so that every current template could be built from fresh. When creating templates there should not be a Base Type field after standardization. Base type field can be replaced with the ability to start with a copy of an existing template.

Turn all images into SVG layer versions. Remove all game-icons.net versions.

## Documentation
Move all instructional info to the wiki and turn the README into a concise and summarized, informatic style page that easily and quickly communicates the projects purpose and it's best features.

## Images/Icons
Add character emblems generated with SVG tool. Add some SVG templates for easy character creation, like this. Potential to set zones for where equipped armour icons will render onto the character. Add other template SVG's that can be used to make character look more personal: hairstyles, beards, accessories, etc. </br>
<img src="https://cdn-icons-png.flaticon.com/512/30/30712.png" alt="Dice" width="80" height="80">

## SVG tool updates (external tool)
Update SVG tool to allow app to add use it's own library of shapes.

Add a feature for monochrome and grayscale shapes to use outlines as clip masks.

Investigate if an outline can be rendered around grouped shapes, so it can omit edges and corners that clip.

Consider live images with animations. Investigate if having too many of these can cause slow down. Add a delta time variable for app animations to match in app fps and tick speed. Optimizations:
- Limit calculations to only images that are visible, an item that is off screen does not need to animate.
- If total calculations start to effect app speed the animation/tick speed should be throttled. This should make it so only animations slow down and not the user experience.
