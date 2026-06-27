import fs from 'fs';

const file = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

// Replace handleSubBranchClick usage with handleBranchClick in sub-branch cards
let fixed = file.replace(
  'onClick={() => handleSubBranchClick(subBranch)}',
  'onClick={() => handleBranchClick(subBranch, selectedBranch.dept)}'
);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', fixed);
console.log('Done');