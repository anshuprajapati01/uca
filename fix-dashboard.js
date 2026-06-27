const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

// Fix 1: Update handleBranchClick
const oldHandler = `  const handleBranchClick = (branchName, departmentInfo) => {
    const isAggregate = isAggregateDepartment(branchName);
    setSelectedBranch({ name: branchName, dept: departmentInfo });
    if (isAggregate) {
      setSelectedSubBranch(null);
    } else {
      setSelectedSubBranch(branchName);
    }
    setSelectedSemester(null);
    setSubjectType('theory');
  };`;

const newHandler = `  const handleBranchClick = (branchName, departmentInfo) => {
    setSelectedSubBranch(branchName);
    setSelectedSemester(null);
    setSubjectType('theory');
  };`;

let result = content.replace(oldHandler, newHandler);

// Fix 2: Update DepartmentCard to add onDepartmentClick prop
const oldCard = 'const DepartmentCard = ({ department, onBranchClick }) => {';
const newCard = 'const DepartmentCard = ({ department, onBranchClick, onDepartmentClick }) => {';
result = result.replace(oldCard, newCard);

// Fix 3: Update the card div to be clickable for aggregate departments
const oldDiv = '    <div className="director-dept-card">';
const newDiv = '    <div className="director-dept-card" onClick={onDepartmentClick ? () => onDepartmentClick(name, department) : undefined} style={{ cursor: onDepartmentClick ? "pointer" : "default" }}>';
result = result.replace(oldDiv, newDiv);

// Fix 4: Add stopPropagation to branch tag click
const oldTagClick = 'onClick={() => onBranchClick(branchName, department)}';
const newTagClick = 'onClick={(e) => { e.stopPropagation(); onBranchClick(branchName, department); }}';
result = result.replace(oldTagClick, newTagClick);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', result);
console.log('Done');