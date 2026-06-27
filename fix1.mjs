import fs from 'fs';

const file = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

// 1. Fix handleBranchClick - the branch tags now set selectedSubBranch directly
const fixed = file.replace(
  /const handleBranchClick = \(branchName, departmentInfo\) => \{[\s\S]*?^\s*\};/m,
  `  const handleBranchClick = (branchName, departmentInfo) => {
    setSelectedSubBranch(branchName);
    setSelectedSemester(null);
    setSubjectType('theory');
  };`
);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', fixed);
console.log('Fixed handleBranchClick');