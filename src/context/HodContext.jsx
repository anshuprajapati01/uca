import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

const HodContext = createContext(null);

export function HodProvider({ children, user }) {
  const [departmentsData, setDepartmentsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshDepartments = useCallback(async () => {
    if (!user?.id) {
      setDepartmentsData([]);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
   // Purani query ko isse replace karo:
const { data, error } = await supabase
  .from('departments')
  .select('id, name, code, description, is_live, is_sem1_live, is_sem2_live, is_sem3_live, is_sem4_live, is_sem5_live, is_sem6_live, is_sem7_live, is_sem8_live') // Yahan naye columns add kiye
  .eq('hod_id', user.id);
    if (error) {
      console.error('DB Error:', error);
      setDepartmentsData([]);
    } else {
      setDepartmentsData(data || []);
    }
    setIsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    refreshDepartments();
  }, [refreshDepartments]);

  const uniqueBranches = [...new Map(
    departmentsData.map((d) => {
      const branchCode = d.code || d.name;
      return [branchCode, { id: branchCode, code: branchCode, name: d.name || branchCode }];
    })
  ).values()];
  const uniqueYears = [...new Set(departmentsData.map((d) => d.description))].sort();

  const value = {
    hodBranch: departmentsData.length > 0 ? {
      id: departmentsData[0].code || departmentsData[0].name,
      code: departmentsData[0].code || departmentsData[0].name,
      name: departmentsData[0].name || departmentsData[0].code,
    } : null,
    hodDepartmentName: departmentsData.length > 0 ? departmentsData[0].name : null,
    hodAuthorizedBranches: uniqueBranches,
    hodAssignedYears: uniqueYears,
    hodDepartmentsData: departmentsData,
    refreshDepartments,
    isLoading,
    isAssigned: !isLoading && departmentsData.length > 0,
  };

  return <HodContext.Provider value={value}>{children}</HodContext.Provider>;
}

export function useHodContext() {
  const context = useContext(HodContext);
  if (!context) {
    throw new Error('useHodContext must be used within a HodProvider');
  }
  return context;
}
