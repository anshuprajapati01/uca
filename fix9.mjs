import fs from 'fs';

const file = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

// Remove the handleSubBranchClick function entirely
let fixed = file.replace(
  /\n  const handleSubBranchClick = \(subBranchName\) => \{\n    setSelectedSubBranch\(subBranchName\);\n  \};\n/g,
  '\n'
);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', fixed);
console.log('Done');