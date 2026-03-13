// Importing buildStructuralTree from categoriesEngine
import { buildStructuralTree } from './categoriesEngine';

// Refactored financialAdvancedEngine
export function financialAdvancedEngine(data) {
    // Delegating to buildStructuralTree for processing
    return buildStructuralTree(data);
}