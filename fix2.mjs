import fs from 'fs';

const file = fs.readFileSync('src/pages/admin/DirectorDashboard.jsx', 'utf8');

// Fix 2: Update DepartmentCard to add onDepartmentClick prop
let fixed = file.replace(
  'const DepartmentCard = ({ department, onBranchClick }) => {',
  'const DepartmentCard = ({ department, onBranchClick, onDepartmentClick }) => {'
);

// Fix 3: Update the card div to be clickable for aggregate departments  
fixed = fixed.replace(
  '    <div className="director-dept-card">',
  '    <div className="director-dept-card" onClick={onDepartmentClick ? () => onDepartmentClick(name, department) : undefined} style={{ cursor: onDepartmentClick ? "pointer" : "default" }}>'
);

// Fix 4: Remove stopPropagation since handleBranchClick now works differently
fixed = fixed.replace(
  'onClick={(e) => { e.stopPropagation(); onBranchClick(branchName, department); }}',
  'onClick={() => onBranchClick(branchName, department)}'
);

fs.writeFileSync('src/pages/admin/DirectorDashboard.jsx', fixed);
console.log('Fixed DepartmentCard');