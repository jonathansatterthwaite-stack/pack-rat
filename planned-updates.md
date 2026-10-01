# Planned updates
## System wide
Default Adventurer character (the character generated when the app is first launched) should start with some items and settings that showcase some of the app features:
- A partially filled container with an image that changes based on capacity used.
- A compass that points to a location on a map.
- Two stacks of items that show the number of items in the image.
- A totem that wiggles when the player is near a location.

Allow GM to create treasure and/or treasure tables. Let them put loot in containers and present it to player.

Move to a system agnostic spec. Create rules package system that allows rule settings to be imported, exported, edited, saved, enabled and disabled. Change DnD 5e rules into a package. Look at applying more universal terminology to app, consider allowing the rules package to include a terminology key that replaces instances of the name with the chosen name.

(Complete) Add campaign selection. Create a campaign management screen.

(Complete) Add a file management view. For characters, rule packages, campaigns, SVG arrangements, etc. A place to view and manage any data that is not inherently part of the app itself.

(Complete) Add a mode to allow GMs to set up GM features without hosting a server. Make it so that the host and designated GM do not have to be the same user, create GM role that is independent from a character. GM role could have expanded information on players and I can hide player specific tabs/info that a GM would not need.

(Complete) Consider rolling custom tab into Catalog tab as a sub tab.

## Interactivity
gm_ variables are still displayed incorrectly in the SVG editor. It shouldn't list created gm variables, only instructions on how to utilise them.

Investigate alternative ways to handle gm_ variables:
- Could the gm_ prefix be handled in the background without presenting this to the user for easier management
- Think about how to incorporate this into functions, the "+ add gm variable" is a good way to label them for the app. Need a way to define a gm_ variable when binding it to a layer/group. Could use square brackets around the name.

Add more GM control options:
- Independent sliders, toggle switches, buttons, dropdowns.
- Map these to a grid structure (with tabs) so GM can create their own control panel.
- Current image grids should be something that can be zoomed into for more detailed control.
- Allow features of shops to be mapped to variables, opening times, prices, available items, etc.

## Items/Catalog
Standardise template structure. Currently, some templates seem to have built in sub categories whilst others don't amongst other inconsistencies. We should build it so that every current template could be built from fresh. When creating templates there should not be a Base Type field after standardization. Base type field can be replaced with the ability to start with a copy of an existing template.

Turn all images into SVG layer versions. Remove all game-icons.net versions.

## Documentation
Move all instructional info to the wiki and turn the README into a concise and summarized, informatic style page that easily and quickly communicates the projects purpose and it's best features.

## Images/Icons
Add character emblems generated with SVG tool. Add some SVG templates for easy character creation, like this. Potential to set zones for where equipped armour icons will render onto the character. Add other template SVG's that can be used to make character look more personal: hairstyles, beards, accessories, etc. </br>
<img src="https://cdn-icons-png.flaticon.com/512/30/30712.png" alt="Dice" width="80" height="80">

Investigate more options for how to display items and options.

When opening details and switching to image view for an item I need to check to make sure the image is aligned and scaled correctly.

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
