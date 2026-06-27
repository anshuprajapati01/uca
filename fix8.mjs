import fs from 'fs';

const file = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

// Replace handleSubBranchClick with handleBackToBranches to clean up
let fixed = file.replace(
  'onClick={() => handleSubBranchClick(subBranch)}>',
  'onClick={() => handleBackToBranches()} // Fixed: this was handleSubBranchClick'
);

// Remove the handleSubBranchClick function
fixed = fixed.replace(
  '  const handleSubBranchClick = (subBranchName) => {\n    setSelectedSubBranch(subBranchName);\n  };',
  ''
);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', fixed);
console.log('Done');