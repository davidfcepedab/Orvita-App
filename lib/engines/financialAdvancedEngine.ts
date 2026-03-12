// Financial Advanced Engine

// Updated Record type with consistent naming
export interface Record {
    id: number;
    name: string;
    subcategories: string[]; // Changed from subs to subcategories
}

// Example initialization
const records: Record[] = [
    { id: 1, name: 'Category 1', subcategories: ['Sub1', 'Sub2'] }, // Changed from subs to subcategories
    { id: 2, name: 'Category 2', subcategories: ['Sub3'] }
];

// Function to process records
function processRecords(records: Record[]) {
    records.forEach(record => {
        console.log(record.name, record.subcategories); // Ensure consistency in usage of subcategories
    });
}

processRecords(records);

