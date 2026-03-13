// Centralized tree building logic

const FIXED_CATEGORIES = [/* Fixed Categories data */];
const EXCLUDED = [/* Excluded categories data */];

/**
 * Builds a structural tree from the categories.
 * @param {Array} categories - The categories to build the tree from.
 * @returns {Object} The structural tree.
 */
function buildStructuralTree(categories) {
    const root = { children: [] };
    const lookup = {};

    // Create a lookup table for categories by ID
    categories.forEach(category => {
        lookup[category.id] = { ...category, children: [] };
    });

    // Build the tree structure
    categories.forEach(category => {
        if (category.parentId) {
            lookup[category.parentId].children.push(lookup[category.id]);
        } else {
            root.children.push(lookup[category.id]);
        }
    });

    return root;
}