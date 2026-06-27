import fs from 'fs';

const file = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

let fixed = file;

// Remove handleSubBranchClick (redundant - handleBranchClick does the same for branch tags)
fixed = fixed.replace(
  /  const handleSubBranchClick = \(subBranchName\) => \{[\s\S]*?^\s*\};\n\n/,
  ''
);

// Add handleDepartmentClick after handleBranchClick
fixed = fixed.replace(
  '  const handleBranchClick = (branchName, departmentInfo) => {\n    setSelectedSubBranch(branchName);\n    setSelectedSemester(null);\n    setSubjectType(\'theory\');\n  };',
  `  const handleBranchClick = (branchName, departmentInfo) => {
    setSelectedSubBranch(branchName);
    setSelectedSemester(null);
    setSubjectType('theory');
  };

  const handleDepartmentClick = (deptName, departmentInfo) => {
    setSelectedBranch({ name: deptName, dept: departmentInfo });
  };`
);

// Update DepartmentCard usage to pass onDepartmentClick for aggregate departments
fixed = fixed.replace(
  '<DepartmentCard key={dept.id || idx} department={dept} onBranchClick={handleBranchClick} />',
  `<DepartmentCard
                        key={dept.id || idx}
                        department={dept}
                        onBranchClick={handleBranchClick}
                        onDepartmentClick={isAggregateDepartment(dept.department_name || dept.name) ? handleDepartmentClick : null}
                      />`
);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', fixed);
console.log('Done');