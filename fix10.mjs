import fs from 'fs';

const file = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

let fixed = file;

// Fix handleBranchClick to also set selectedBranch for standard flow
fixed = fixed.replace(
  `const handleBranchClick = (branchName, departmentInfo) => {
    setSelectedSubBranch(branchName);
    setSelectedSemester(null);
    setSubjectType('theory');
  };`,
  `const handleBranchClick = (branchName, departmentInfo) => {
    setSelectedBranch({ name: branchName, dept: departmentInfo });
    setSelectedSubBranch(branchName);
    setSelectedSemester(null);
    setSubjectType('theory');
  };`
);

// Remove the redundant handleSubBranchClick function
fixed = fixed.replace(
  '  const handleSubBranchClick = (subBranchName) => {\n    setSelectedSubBranch(subBranchName);\n  };',
  ''
);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', fixed);
console.log('Done');