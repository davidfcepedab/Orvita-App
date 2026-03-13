// Centralized tree building logic

const FIXED_CATEGORIES = [/* your fixed categories here */];
const EXCLUDED = [/* your excluded items here */];

// Build structural tree by eliminating duplicates
const buildStructuralTree = (categories) => {
    // Your logic to build the tree
    return categories;
};

const consolidatedCategories = buildStructuralTree(FIXED_CATEGORIES.concat(EXCLUDED));

export { consolidatedCategories, buildStructuralTree };