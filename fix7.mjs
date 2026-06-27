import fs from 'fs';

const file = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

// Remove the redundant handleSubBranchClick function - match the actual indentation
let fixed = file.replace(
  /  const handleSubBranchClick = \(subBranchName\) => \{\s+setSelectedSubBranch\(subBranchName\);\s+};\n/,
  ''
);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', fixed);
console.log('Done');